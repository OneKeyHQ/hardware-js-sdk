import { Platform } from 'react-native';
import BleUtils from '@onekeyfe/react-native-ble-utils';

/**
 * Android 16+ keeps its side of a bond the device no longer has keys for, and reports it
 * with ACTION_KEY_MISSING instead of a GATT status. The device then drops the link, so
 * without this signal a wiped device is indistinguishable from any other disconnect.
 *
 * The signal only describes the link that was being encrypted when it fired. Callers must
 * bound it to their own connection attempt with `sinceMs`; reusing an older one would turn
 * an ordinary disconnect (a firmware-update reboot, for example) into a terminal bond error.
 */

type KeyMissingEvent = { id?: unknown };

// The capability ships in a later react-native-ble-utils than the one this package is
// typed against, and the JS bundle can also run on a native build that predates it.
type KeyMissingCapableBleUtils = {
  supportsDeviceKeyMissing?: () => boolean;
  onDeviceKeyMissing?: (callback: (event: KeyMissingEvent) => void) => () => void;
};

type KeyMissingListener = (deviceId: string) => void;

const lastKeyMissingAt = new Map<string, number>();
const listeners = new Set<KeyMissingListener>();
let unsubscribeNative: (() => void) | undefined;

const normalizeDeviceId = (deviceId: string) => deviceId.toLowerCase();

const getCapableBleUtils = (): KeyMissingCapableBleUtils | undefined => {
  if (Platform.OS !== 'android') return undefined;
  const bleUtils = BleUtils as unknown as KeyMissingCapableBleUtils;
  if (
    typeof bleUtils.supportsDeviceKeyMissing !== 'function' ||
    typeof bleUtils.onDeviceKeyMissing !== 'function'
  ) {
    return undefined;
  }
  return bleUtils.supportsDeviceKeyMissing() ? bleUtils : undefined;
};

/** False means the event can never fire here, so nothing should wait for it. */
export const isBleKeyMissingSupported = () => getCapableBleUtils() !== undefined;

/** Idempotent. Returns whether the signal is available on this OS and native build. */
export const startBleKeyMissingTracking = (): boolean => {
  if (unsubscribeNative) return true;
  const bleUtils = getCapableBleUtils();
  if (!bleUtils?.onDeviceKeyMissing) return false;

  unsubscribeNative = bleUtils.onDeviceKeyMissing(event => {
    if (typeof event?.id !== 'string') return;
    const deviceId = normalizeDeviceId(event.id);
    lastKeyMissingAt.set(deviceId, Date.now());
    listeners.forEach(listener => listener(deviceId));
  });
  return true;
};

export const stopBleKeyMissingTracking = () => {
  unsubscribeNative?.();
  unsubscribeNative = undefined;
  lastKeyMissingAt.clear();
  listeners.clear();
};

export const hasBleKeyMissingSince = (deviceId: string, sinceMs: number): boolean => {
  const at = lastKeyMissingAt.get(normalizeDeviceId(deviceId));
  return at !== undefined && at >= sinceMs;
};

/** Calls back for every later signal on this device until the returned cleanup runs. */
export const onBleKeyMissing = (deviceId: string, callback: () => void): (() => void) => {
  const target = normalizeDeviceId(deviceId);
  const listener: KeyMissingListener = id => {
    if (id === target) callback();
  };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Resolves true once a signal at or after `sinceMs` exists for the device, false when
 * none arrives within `timeoutMs`. The broadcast and the GATT disconnect it explains are
 * delivered on separate paths, so the disconnect can reach JS first.
 */
export const waitForBleKeyMissing = (
  deviceId: string,
  sinceMs: number,
  timeoutMs: number
): Promise<boolean> => {
  if (!startBleKeyMissingTracking()) return Promise.resolve(false);
  if (hasBleKeyMissingSince(deviceId, sinceMs)) return Promise.resolve(true);

  return new Promise(resolve => {
    const settle = (found: boolean) => {
      clearTimeout(timer);
      cleanup();
      resolve(found);
    };
    const cleanup = onBleKeyMissing(deviceId, () => {
      if (hasBleKeyMissingSince(deviceId, sinceMs)) settle(true);
    });
    const timer = setTimeout(() => settle(false), timeoutMs);
  });
};
