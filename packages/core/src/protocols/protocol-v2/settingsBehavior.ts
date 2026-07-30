import { createProtocolV2DeviceInteraction } from './interaction';

import type { DeviceSettings, DeviceSettingsPage } from '@onekeyfe/hd-transport';
import type { UnlockPolicy } from '../../api/BaseMethod';
import type { ProtocolV2DeviceInteraction, ProtocolV2InteractionReason } from './interaction';

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
      reason?: ProtocolV2InteractionReason;
      operation?: string;
    };

export const getProtocolV2SettingsBehavior = (
  operation: ProtocolV2SettingsOperation
): {
  unlockPolicy: UnlockPolicy;
  interaction?: ProtocolV2DeviceInteraction;
} => {
  if (operation.kind === 'page') {
    return {
      unlockPolicy: 'unlock-before-run',
      interaction: createProtocolV2DeviceInteraction({
        kind: 'confirm-on-device',
        reason: operation.reason ?? 'settings-page',
        completion: 'operation-completed',
        page: operation.page,
        operation: operation.operation,
      }),
    };
  }

  return {
    unlockPolicy: getProtocolV2SettingsUnlockPolicy(operation.settings),
    interaction:
      typeof operation.settings.label === 'string'
        ? createProtocolV2DeviceInteraction({
            kind: 'confirm-on-device',
            reason: 'device-management',
            completion: 'operation-completed',
            operation: 'change-label',
          })
        : undefined,
  };
};
