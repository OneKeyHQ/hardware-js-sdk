import { Platform } from 'react-native';
import BleUtils from '@onekeyfe/react-native-ble-utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import {
  hasBleKeyMissingSince,
  onBleKeyMissing,
  startBleKeyMissingTracking,
} from './bleKeyMissing';

/**
 * Android 16+ starts encrypting a bonded LE link on its own right after connecting, with the
 * stored key. A GATT request that needs encryption and is sent before that attempt finishes is
 * rejected by the peer, and the framework retries it by encrypting again with the same key. When
 * the peer has lost the bond, that second failure makes firmware that tolerates a single one per
 * link drop the connection, before the system's own re-pairing can finish.
 *
 * Tracking the link's encryption result lets the transport hold GATT until then, so a lost bond
 * is re-paired in place (the system shows a pairing request) instead of failing.
 */

/** HCI "PIN or Key Missing": the peer no longer has the keys of the stored bond. */
export const HCI_PIN_OR_KEY_MISSING = 0x06;

export type AndroidLinkEncryption =
  /** This link was encrypted with the stored bond. */
  | 'encrypted'
  /** The link was reused and had already been encrypted. */
  | 'already-encrypted'
  /** The stored bond was lost and the system re-paired on this link. */
  | 're-paired'
  /** No result arrived in time; callers proceed as if nothing was known. */
  | 'unresolved';

type EncryptionRecord = { at: number; status: number; enabled: boolean };

// An app can still resolve an older react-native-ble-utils, and the JS bundle can run on a native
// build that predates the events, so none of these members is assumed to exist.
type EncryptionCapableBleUtils = Partial<
  Pick<
    typeof BleUtils,
    'supportsDeviceEncryptionChange' | 'onDeviceEncryptionChange' | 'onDeviceAclDisconnected'
  >
>;

type LinkListener = (deviceId: string) => void;

const lastEncryption = new Map<string, EncryptionRecord>();
const lastAclDisconnectAt = new Map<string, number>();
const listeners = new Set<LinkListener>();
let unsubscribeNative: Array<() => void> | undefined;

const normalizeDeviceId = (deviceId: string) => deviceId.toLowerCase();

const isEncrypted = (record: EncryptionRecord) => record.status === 0 && record.enabled;

const getCapableBleUtils = (): EncryptionCapableBleUtils | undefined => {
  if (Platform.OS !== 'android') return undefined;
  const bleUtils: EncryptionCapableBleUtils = BleUtils;
  if (
    typeof bleUtils.supportsDeviceEncryptionChange !== 'function' ||
    typeof bleUtils.onDeviceEncryptionChange !== 'function' ||
    typeof bleUtils.onDeviceAclDisconnected !== 'function'
  ) {
    return undefined;
  }
  return bleUtils.supportsDeviceEncryptionChange() ? bleUtils : undefined;
};

const notify = (deviceId: string) => {
  listeners.forEach(listener => listener(deviceId));
};

/** False means the encryption result can never be observed here, so nothing should wait for it. */
export const isBleEncryptionTrackingSupported = () => getCapableBleUtils() !== undefined;

/** Idempotent. Returns whether encryption results are observable on this OS and native build. */
export const startBleEncryptionTracking = (): boolean => {
  if (unsubscribeNative) return true;
  const bleUtils = getCapableBleUtils();
  if (!bleUtils?.onDeviceEncryptionChange || !bleUtils.onDeviceAclDisconnected) return false;

  unsubscribeNative = [
    bleUtils.onDeviceEncryptionChange(event => {
      if (typeof event?.id !== 'string') return;
      const deviceId = normalizeDeviceId(event.id);
      lastEncryption.set(deviceId, {
        at: Date.now(),
        status: Number(event.status),
        enabled: event.enabled === true,
      });
      notify(deviceId);
    }),
    bleUtils.onDeviceAclDisconnected(event => {
      if (typeof event?.id !== 'string') return;
      const deviceId = normalizeDeviceId(event.id);
      lastAclDisconnectAt.set(deviceId, Date.now());
      notify(deviceId);
    }),
  ];
  return true;
};

export const stopBleEncryptionTracking = () => {
  unsubscribeNative?.forEach(unsubscribe => unsubscribe());
  unsubscribeNative = undefined;
  lastEncryption.clear();
  lastAclDisconnectAt.clear();
  listeners.clear();
};

/**
 * Records a link that carried requests needing encryption, so reusing it later does not wait for
 * an encryption result that was reported before tracking started.
 */
export const markBleLinkEncrypted = (deviceId: string) => {
  if (!unsubscribeNative) return;
  lastEncryption.set(normalizeDeviceId(deviceId), { at: Date.now(), status: 0, enabled: true });
};

export type WaitForAndroidLinkEncryptionOptions = {
  deviceId: string;
  /** When the current link attempt began; earlier results describe another link. */
  linkStartedAt: number;
  /** How long to wait for the first encryption result of this link. */
  resultTimeoutMs: number;
  /** How long a system re-pairing may take once the stored bond was reported lost. */
  repairTimeoutMs: number;
  /** After the link drops during re-pairing, how long to wait for the key-missing report. */
  keyMissingGraceMs: number;
  signal?: AbortSignal;
  onRepairStarted?: () => void;
};

/**
 * Resolves once the link can carry requests that need encryption. Rejects with `BleBondInvalid`
 * when the system reports that re-pairing failed, with `BleDeviceDisconnected` when the link drops
 * during re-pairing, and with `BleDeviceNotBonded` when re-pairing does not finish in time.
 */
export const waitForAndroidLinkEncryption = ({
  deviceId,
  linkStartedAt,
  resultTimeoutMs,
  repairTimeoutMs,
  keyMissingGraceMs,
  signal,
  onRepairStarted,
}: WaitForAndroidLinkEncryptionOptions): Promise<AndroidLinkEncryption> => {
  if (!startBleEncryptionTracking()) return Promise.resolve('unresolved');
  startBleKeyMissingTracking();
  const target = normalizeDeviceId(deviceId);

  const previous = lastEncryption.get(target);
  const previousDropAt = lastAclDisconnectAt.get(target);
  if (
    previous &&
    previous.at < linkStartedAt &&
    isEncrypted(previous) &&
    (previousDropAt === undefined || previousDropAt < previous.at)
  ) {
    return Promise.resolve('already-encrypted');
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
      return;
    }

    /** Set once this link's first encryption failed because the peer lost the bond. */
    let repairStartedAt: number | undefined;
    let droppedDuringRepair = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = () => {
      settled = true;
      if (timer) clearTimeout(timer);
      listeners.delete(onLinkEvent);
      cleanupKeyMissing();
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (result: AndroidLinkEncryption) => {
      cleanup();
      resolve(result);
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const arm = (ms: number, onExpire: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onExpire, ms);
    };
    const bondInvalid = () =>
      ERRORS.TypedError(HardwareErrorCode.BleBondInvalid, undefined, {
        phase: 'connect',
        reason: 'key_missing',
      });

    const evaluate = () => {
      if (settled) return;
      const record = lastEncryption.get(target);
      const dropAt = lastAclDisconnectAt.get(target);

      if (repairStartedAt === undefined) {
        if (hasBleKeyMissingSince(target, linkStartedAt)) {
          fail(bondInvalid());
          return;
        }
        if (dropAt !== undefined && dropAt >= linkStartedAt) {
          // The link is gone; the caller's next request reports it with its usual error.
          finish('unresolved');
          return;
        }
        if (!record || record.at < linkStartedAt) return;
        if (isEncrypted(record)) {
          finish('encrypted');
          return;
        }
        if (record.status !== HCI_PIN_OR_KEY_MISSING) {
          finish('unresolved');
          return;
        }
        // The system re-pairs on its own after a lost bond. Nothing may touch GATT until then.
        repairStartedAt = record.at;
        onRepairStarted?.();
        arm(repairTimeoutMs, () =>
          fail(
            ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'Bluetooth pairing timed out', {
              phase: 'bond',
              reason: 'timeout',
            })
          )
        );
        return;
      }

      if (hasBleKeyMissingSince(target, repairStartedAt)) {
        fail(bondInvalid());
        return;
      }
      if (record && record.at > repairStartedAt && isEncrypted(record)) {
        finish('re-paired');
        return;
      }
      if (!droppedDuringRepair && dropAt !== undefined && dropAt >= repairStartedAt) {
        droppedDuringRepair = true;
        // A failed re-pairing drops the link and reports key missing right after.
        arm(keyMissingGraceMs, () =>
          fail(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected))
        );
      }
    };

    const onLinkEvent: LinkListener = id => {
      if (id === target) evaluate();
    };
    const onAbort = () => fail(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));

    listeners.add(onLinkEvent);
    const cleanupKeyMissing = onBleKeyMissing(target, evaluate);
    signal?.addEventListener('abort', onAbort, { once: true });
    arm(resultTimeoutMs, () => finish('unresolved'));
    evaluate();
  });
};
