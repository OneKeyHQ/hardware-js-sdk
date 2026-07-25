import type { DeviceSettings } from '@onekeyfe/hd-transport';
import type { UnlockPolicy } from '../../api/BaseMethod';

const LOCK_FREE_DEVICE_SETTINGS = new Set<keyof DeviceSettings>([
  'label',
  'language',
  'brightness',
  'haptic_feedback',
]);

export const getProtocolV2SettingsUnlockPolicy = (settings: DeviceSettings): UnlockPolicy =>
  Object.keys(settings).every(key => LOCK_FREE_DEVICE_SETTINGS.has(key as keyof DeviceSettings))
    ? 'none'
    : 'retry-on-locked';
