import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import {
  DeviceSEState,
  DeviceSeType,
  DeviceType,
  Enum_SafetyCheckLevel,
} from '@onekeyfe/hd-transport';

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
      versions: { firmware: '4.10.1', se: '1.1.0.2', se01: '1.1.0.2' },
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
    const patch = mapProtocolV2DeviceInfoToState(
      {
        protocol_version: 2,
        hw: { Device_type: DeviceType.PRO2, serial_no: 'SERIAL-1' },
        main_mcu: {
          application: { version: '5.0.0', build_id: 'p1-build', hash: [0x01, 0x02] },
          application_data: { version: '5.0.1', build_id: 'p2-build', hash: [0x03, 0x04] },
          bootloader: { version: '2.0.0' },
        },
        coprocessor: {
          bt_adv_name: 'Pro2 1234',
          application: { version: '1.2.3' },
        },
        se1: {
          type: DeviceSeType.THD89,
          state: DeviceSEState.APP,
          application: { version: '3.0.0', build_id: 'se1-build', hash: [0x05, 0x06] },
        },
      } as ProtocolV2DeviceInfo,
      'normal'
    );

    expect(patch.identity).toMatchObject({
      deviceType: EDeviceType.Pro2,
      serialNo: 'SERIAL-1',
      bleName: 'Pro2 1234',
    });
    expect(patch.versions).toMatchObject({
      firmware: '5.0.0',
      applicationP1: '5.0.0',
      applicationP2: '5.0.1',
      bootloader: '2.0.0',
      ble: '1.2.3',
    });
    expect(patch.verification).toMatchObject({
      applicationP1BuildId: 'p1-build',
      applicationP1Hash: '0102',
      applicationP2BuildId: 'p2-build',
      applicationP2Hash: '0304',
      se01BuildId: 'se1-build',
      se01Hash: '0506',
    });
    expect(patch.securityElements).toMatchObject({
      se01: { type: 'THD89', state: 'APP' },
    });
    expect(patch).toMatchObject({ protocolVersion: 2 });
    expect(patch.status?.unlocked).toBeUndefined();
  });

  test('maps the Protocol V2 Neo device type without treating it as Pro2', () => {
    const patch = mapProtocolV2DeviceInfoToState({
      hw: { Device_type: DeviceType.NEO, serial_no: 'NEO-SERIAL-1' },
    });

    expect(patch.identity).toMatchObject({
      deviceType: EDeviceType.Neo,
      model: 'neo',
      serialNo: 'NEO-SERIAL-1',
    });
  });

  test('formats a serial-like Protocol V2 Pro2 BLE name', () => {
    const patch = mapProtocolV2DeviceInfoToState({
      hw: { Device_type: DeviceType.PRO2, serial_no: 'P2D33C0005B' },
      coprocessor: { bt_adv_name: 'P2D33C0005B' },
    });

    expect(patch.identity?.bleName).toBe('Pro2 005B');
  });

  test('maps the hardware model independently from Protocol V2', () => {
    const pro = mapProtocolV2DeviceInfoToState({
      protocol_version: 2,
      hw: { Device_type: 'PRO' as unknown as DeviceType, serial_no: 'SERIAL-PRO' },
    });
    const unknown = mapProtocolV2DeviceInfoToState({ protocol_version: 2, hw: {} });

    expect(pro.identity).toMatchObject({ deviceType: EDeviceType.Pro, model: 'pro' });
    expect(unknown.identity).toMatchObject({ deviceType: EDeviceType.Unknown, model: null });
  });

  test('keeps normal mode when Protocol V2 application and SE versions are returned together', () => {
    const patch = mapProtocolV2DeviceInfoToState(
      {
        protocol_version: 2,
        hw: { serial_no: 'SERIAL-NORMAL' },
        main_mcu: {
          application: { version: '5.0.0' },
          bootloader: { version: '2.0.0' },
        },
        se1: {
          application: { version: '1.0.0', build_id: 'se-app', hash: [0x01, 0x02] },
          bootloader: { version: '0.1.0', build_id: 'se-boot', hash: [0x03, 0x04] },
        },
      } as ProtocolV2DeviceInfo,
      'normal'
    );

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
        main_mcu: { bootloader: { version: '2.0.0' } },
        se1: {},
      },
    ],
    [
      'romloader',
      {
        hw: { serial_no: 'SERIAL-ROM' },
        main_mcu: {
          romloader: { version: '1.0.0' },
          bootloader: { version: '2.0.0' },
        },
      },
    ],
  ] as const)('clears stale device identity in Protocol V2 %s mode', (mode, info) => {
    const patch = mapProtocolV2DeviceInfoToState(info as ProtocolV2DeviceInfo, mode);

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
      mapApplySettingsToState({
        label: 'Renamed',
        use_passphrase: true,
        haptic_feedback: false,
        use_ble: true,
        safety_checks: 'Strict',
      })
    ).toEqual({
      identity: { label: 'Renamed' },
      status: { passphraseProtection: true },
      settings: {
        hapticFeedback: false,
        bleEnabled: true,
        safetyChecks: Enum_SafetyCheckLevel.Strict,
      },
    });

    expect(
      mapDeviceSettingsToState({
        label: 'Pro2',
        language: 'en-Latn-US',
        brightness: 80,
        autolock_delay_ms: 30_000,
      } as DeviceSettings)
    ).toEqual({
      identity: { label: 'Pro2' },
      settings: { language: 'en', brightness: 80, autoLockDelayMs: 30_000 },
    });
  });
});
