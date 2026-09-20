import BleUtils from '@onekeyfe/react-native-ble-utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { onBleKeyMissing, startBleKeyMissingTracking } from './bleKeyMissing';
import { bleLogger } from './logger';

import type { Peripheral } from '@onekeyfe/react-native-ble-utils';

const Logger = bleLogger;

// Android BluetoothDevice.EXTRA_UNBOND_REASON values.
const bondFailureReasons: Record<number, string> = {
  1: 'authentication_failed',
  2: 'rejected',
  3: 'canceled',
  4: 'device_unreachable',
  5: 'discovery_in_progress',
  6: 'timeout',
  7: 'repeated_attempts',
  8: 'remote_canceled',
  9: 'removed',
};

/**
 * get the device basic info of connected devices
 * @param serviceUuids
 * @returns {Promise<[string[]]>}
 */
export const getConnectedDeviceIds = (serviceUuids: string[]) =>
  BleUtils.getConnectedPeripherals(serviceUuids);

export const getBondedDevices = () => BleUtils.getBondedPeripherals();

type PairDeviceResult = Awaited<ReturnType<typeof BleUtils.pairDevice>> & {
  /** Reported by newer native builds: whether this call started the bonding. */
  initiated?: boolean;
};

export const pairDevice = (macAddress: string): Promise<PairDeviceResult> =>
  BleUtils.pairDevice(macAddress);

/**
 * Android replaces a bond as BONDING -> NONE, then NONE -> BONDING within milliseconds.
 * The window covers slow broadcast delivery before the first half counts as a failure.
 */
export const SYSTEM_BONDING_RESTART_WINDOW_MS = 1500;

export type DeviceBondStateOptions = {
  /**
   * The system, not this transport, started the bonding in progress. Android 16+ re-pairs
   * by itself after it detects a lost bond, and a successful re-pair replaces the old bond
   * instead of going straight to BONDED.
   */
  systemInitiated?: boolean;
};

const createBondFailureError = (bondState: Peripheral['bondState']) => {
  const nativeReason =
    'reason' in bondState && typeof bondState.reason === 'number' ? bondState.reason : undefined;
  const reason =
    nativeReason === undefined ? 'unknown' : bondFailureReasons[nativeReason] ?? 'unknown';
  const params = {
    phase: 'bond',
    reason,
    ...(nativeReason === undefined ? {} : { nativeReason }),
  };
  if (reason === 'timeout') {
    // Connection timeouts are retried by Core; pairing requires a new user attempt.
    return ERRORS.TypedError(
      HardwareErrorCode.BleDeviceNotBonded,
      'Bluetooth pairing timed out',
      params
    );
  }
  if (reason === 'canceled') {
    return ERRORS.TypedError(
      HardwareErrorCode.BleDeviceBondedCanceled,
      'Bluetooth pairing canceled',
      params
    );
  }
  return ERRORS.TypedError(
    HardwareErrorCode.BleDeviceNotBonded,
    'Bluetooth pairing failed',
    params
  );
};

export const onDeviceBondState = (
  bleMacAddress: string,
  signal?: AbortSignal,
  options?: DeviceBondStateOptions
): Promise<Peripheral | undefined> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
      return;
    }
    let pendingFailure: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (pendingFailure) clearTimeout(pendingFailure);
      if (cleanupListener) cleanupListener();
      cleanupKeyMissing?.();
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'Bluetooth pairing timed out', {
          phase: 'bond',
          reason: 'timeout',
        })
      );
    }, 60 * 1000);

    // A failed system re-pair restores the old bond, so it also ends in BONDED. Key
    // missing is what tells it apart from a bond that now works.
    const cleanupKeyMissing = startBleKeyMissingTracking()
      ? onBleKeyMissing(bleMacAddress, () => {
          cleanup();
          reject(
            ERRORS.TypedError(HardwareErrorCode.BleBondInvalid, undefined, {
              phase: 'bond',
              reason: 'key_missing',
            })
          );
        })
      : undefined;

    const cleanupListener = BleUtils.onDeviceBondState(peripheral => {
      if (peripheral.id?.toLowerCase() !== bleMacAddress.toLowerCase()) {
        return;
      }
      const { bondState } = peripheral;

      const hasBonded = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_BONDED';
      const hasFailed = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_NONE';
      const hasRestarted = bondState.preState === 'BOND_NONE' && bondState.state === 'BOND_BONDING';
      Logger.debug('onDeviceBondState bondState:', bondState);
      if (hasBonded) {
        cleanup();
        resolve(peripheral);
      } else if (hasRestarted && pendingFailure) {
        clearTimeout(pendingFailure);
        pendingFailure = undefined;
      } else if (hasFailed && options?.systemInitiated) {
        if (pendingFailure) clearTimeout(pendingFailure);
        pendingFailure = setTimeout(() => {
          cleanup();
          reject(createBondFailureError(bondState));
        }, SYSTEM_BONDING_RESTART_WINDOW_MS);
      } else if (hasFailed) {
        cleanup();
        reject(createBondFailureError(bondState));
      }
    });
  });
