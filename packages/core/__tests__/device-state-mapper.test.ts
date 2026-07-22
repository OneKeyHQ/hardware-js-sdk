import { EDeviceType } from '@onekeyfe/hd-shared';

import {
  mapApplySettingsToState,
  mapDeviceSettingsToState,
  mapProtocolV1FeaturesToState,
  mapProtocolV2DeviceInfoToState,
  mapProtocolV2DeviceStatusToState,
} from '../src/device/DeviceStateMapper';

import type { PROTO } from '../src/constants';
import type { DeviceSettings, DeviceStatus, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

describe('DeviceStateMapper', () => {
  test('maps Protocol V1 Features into structured state sections', () => {
    const patch = mapProtocolV1FeaturesToState({
      onekey_device_type: 'PRO',
      device_id: 'device-1',
      label: 'Pro Wallet',
      initialized: true,
      unlocked: true,
      language: 'en-US',
      major_version: 4,
      minor_version: 10,
      patch_version: 1,
    } as PROTO.Features);

    expect(patch).toMatchObject({
      protocol: 'V1',
      identity: {
        deviceType: EDeviceType.Pro,
        deviceId: 'device-1',
        label: 'Pro Wallet',
      },
      status: { mode: 'normal', initialized: true, unlocked: true },
      settings: { language: 'en-US' },
      versions: { firmware: '4.10.1' },
    });
  });

  test('maps Protocol V2 DeviceInfo without inventing runtime status', () => {
    const patch = mapProtocolV2DeviceInfoToState({
      protocol_version: 2,
      hw: { serial_no: 'SERIAL-1' },
      fw: {
        application: { version: '5.0.0' },
        bootloader: { version: '2.0.0' },
      },
      coprocessor: {
        bt_adv_name: 'Pro2 1234',
        application: { version: '1.2.3' },
      },
    } as ProtocolV2DeviceInfo);

    expect(patch.identity).toMatchObject({
      deviceType: EDeviceType.Pro2,
      serialNo: 'SERIAL-1',
      bleName: 'Pro2 1234',
    });
    expect(patch.versions).toMatchObject({
      firmware: '5.0.0',
      bootloader: '2.0.0',
      ble: '1.2.3',
    });
    expect(patch.status?.unlocked).toBeUndefined();
  });

  test('maps Protocol V2 status separately and ignores locked passphrase value', () => {
    const locked = mapProtocolV2DeviceStatusToState({
      device_id: 'device-2',
      init_states: true,
      unlocked: false,
      passphrase_enabled: true,
      backup_required: true,
    } as DeviceStatus);

    expect(locked.identity?.deviceId).toBe('device-2');
    expect(locked.status).toMatchObject({
      mode: 'normal',
      initialized: true,
      unlocked: false,
      passphraseProtection: null,
      backupRequired: true,
    });
  });

  test('maps common settings into identity, status and settings sections', () => {
    expect(
      mapApplySettingsToState({ label: 'Renamed', use_passphrase: true, haptic_feedback: false })
    ).toEqual({
      identity: { label: 'Renamed' },
      status: { passphraseProtection: true },
      settings: { hapticFeedback: false },
    });

    expect(
      mapDeviceSettingsToState({
        label: 'Pro2',
        brightness: 80,
        autolock_delay_ms: 30_000,
      } as DeviceSettings)
    ).toEqual({
      identity: { label: 'Pro2' },
      settings: { brightness: 80, autoLockDelayMs: 30_000 },
    });
  });
});
