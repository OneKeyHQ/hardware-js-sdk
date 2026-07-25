import type { DeviceSettings } from '@onekeyfe/hd-transport';
import type { UnlockPolicy } from '../../api/BaseMethod';
import type { ProtocolV2InteractionDescriptor } from './uiInteraction';

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

export const getProtocolV2SettingsBehavior = (
  settings: DeviceSettings
): {
  unlockPolicy: UnlockPolicy;
  uiInteraction?: ProtocolV2InteractionDescriptor;
} => ({
  unlockPolicy: getProtocolV2SettingsUnlockPolicy(settings),
  uiInteraction:
    typeof settings.label === 'string'
      ? {
          request: 'button',
          source: 'method-lifecycle',
          reason: 'device-management',
          completion: 'operation-completed',
          deviceOnly: true,
          operation: 'change-label',
        }
      : undefined,
});
