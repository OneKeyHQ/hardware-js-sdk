import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

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
      se_ver: '1.1.0.2',
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
      versions: { firmware: '4.10.1', se: '1.1.0.2' },
    });
  });

  test.each([
    ['CLASSIC1S', EDeviceType.Classic1s],
    ['TOUCH', EDeviceType.Touch],
    ['PRO', EDeviceType.Pro],
  ] as const)(
    'keeps the real label separate from display fallbacks for Protocol V1 %s',
    (onekeyDeviceType, expectedDeviceType) => {
      const patch = mapProtocolV1FeaturesToState({
        onekey_device_type: onekeyDeviceType,
        onekey_ble_name: `${onekeyDeviceType} BLE`,
        initialized: true,
      } as PROTO.Features);

      expect(patch.identity).toMatchObject({
        deviceType: expectedDeviceType,
        label: null,
        bleName: `${onekeyDeviceType} BLE`,
      });
    }
  );

  test.each([
    ['CLASSIC1S', EDeviceType.Classic1s],
    ['TOUCH', EDeviceType.Touch],
    ['PRO', EDeviceType.Pro],
  ] as const)(
    'preserves Protocol V1 backup mode semantics for %s',
    (onekeyDeviceType, expectedDeviceType) => {
      const patch = mapProtocolV1FeaturesToState({
        onekey_device_type: onekeyDeviceType,
        initialized: true,
        no_backup: true,
      } as PROTO.Features);

      expect(patch.identity?.deviceType).toBe(expectedDeviceType);
      expect(patch.status?.mode).toBe('backupMode');
    }
  );

  test('normalizes legacy Bitcoin-only and Attach PIN fields from Protocol V1', () => {
    const patch = mapProtocolV1FeaturesToState({
      onekey_device_type: 'PRO',
      capabilities: [1],
      attach_to_pin_user: true,
      unlocked_attach_pin: true,
      initialized: true,
    } as PROTO.Features);

    expect(patch.identity?.firmwareType).toBe(EFirmwareType.BitcoinOnly);
    expect(patch.status).toMatchObject({
      attachToPinEnabled: true,
      unlockedAttachPin: true,
    });
  });

  test('keeps Protocol V1 universal firmware when the decoded Bitcoin-like capability is present', () => {
    const patch = mapProtocolV1FeaturesToState({
      onekey_device_type: 'CLASSIC1S',
      capabilities: ['Capability_Bitcoin_like'],
      initialized: true,
    } as PROTO.Features);

    expect(patch.identity?.firmwareType).toBe(EFirmwareType.Universal);
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
    expect(patch).toMatchObject({ protocolVersion: 2 });
    expect(patch.status?.unlocked).toBeUndefined();
  });

  test('keeps normal mode when Protocol V2 application and SE versions are returned together', () => {
    const patch = mapProtocolV2DeviceInfoToState({
      protocol_version: 2,
      hw: { serial_no: 'SERIAL-NORMAL' },
      fw: {
        application: { version: '5.0.0' },
        bootloader: { version: '2.0.0' },
      },
      se1: {
        application: { version: '1.0.0', build_id: 'se-app', hash: [0x01, 0x02] },
        bootloader: { version: '0.1.0', build_id: 'se-boot', hash: [0x03, 0x04] },
      },
    } as ProtocolV2DeviceInfo);

    expect(patch.status?.mode).toBe('normal');
    expect(patch.verification).toMatchObject({
      se01BuildId: 'se-app',
      se01Hash: '0102',
      se01BootBuildId: 'se-boot',
      se01BootHash: '0304',
    });
  });

  test.each([
    [
      'bootloader',
      {
        hw: { serial_no: 'SERIAL-BOOT' },
        fw: { bootloader: { version: '2.0.0' } },
      },
    ],
    [
      'romloader',
      {
        hw: { serial_no: 'SERIAL-ROM' },
        fw: {
          romloader: { version: '1.0.0' },
          bootloader: { version: '2.0.0' },
        },
      },
    ],
  ] as const)('clears stale device identity in Protocol V2 %s mode', (mode, info) => {
    const patch = mapProtocolV2DeviceInfoToState(info as ProtocolV2DeviceInfo);

    expect(patch.status?.mode).toBe(mode);
    expect(patch.identity).toMatchObject({ deviceId: null });
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
      backupRequired: true,
    });
    expect(locked.status).not.toHaveProperty('passphraseProtection');
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
