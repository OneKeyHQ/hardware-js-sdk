import type { DeviceSettings, DeviceSettingsPage } from '@onekeyfe/hd-transport';
import type { UnlockPolicy } from '../../api/BaseMethod';
import type { ProtocolV2InteractionDescriptor } from './uiInteraction';

const LOCK_FREE_DEVICE_SETTINGS = new Set<keyof DeviceSettings>([
  'language',
  'brightness',
  'haptic_feedback',
]);

export const getProtocolV2SettingsUnlockPolicy = (settings: DeviceSettings): UnlockPolicy =>
  Object.keys(settings).every(key => LOCK_FREE_DEVICE_SETTINGS.has(key as keyof DeviceSettings))
    ? 'none'
    : 'unlock-before-run';

export type ProtocolV2SettingsOperation =
  | {
      kind: 'direct';
      settings: DeviceSettings;
    }
  | {
      kind: 'page';
      page: DeviceSettingsPage;
    };

export const getProtocolV2SettingsBehavior = (
  operation: ProtocolV2SettingsOperation
): {
  unlockPolicy: UnlockPolicy;
  uiInteraction?: ProtocolV2InteractionDescriptor;
} => {
  if (operation.kind === 'page') {
    return {
      unlockPolicy: 'unlock-before-run',
      uiInteraction: {
        request: 'button',
        source: 'method-lifecycle',
        reason: 'settings-page',
        completion: 'operation-completed',
        deviceOnly: true,
        page: operation.page,
      },
    };
  }

  return {
    unlockPolicy: getProtocolV2SettingsUnlockPolicy(operation.settings),
    uiInteraction:
      typeof operation.settings.label === 'string'
        ? {
            request: 'button',
            source: 'method-lifecycle',
            reason: 'device-management',
            completion: 'operation-completed',
            deviceOnly: true,
            operation: 'change-label',
          }
        : undefined,
  };
};
