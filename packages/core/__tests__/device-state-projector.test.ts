import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { createEmptyDeviceState } from '../src/device/DeviceStateStore';
import { projectFeatures } from '../src/device/DeviceStateProjector';

describe('DeviceStateProjector', () => {
  test('projects legacy Features from the canonical snapshot', () => {
    const state = createEmptyDeviceState({
      deviceType: EDeviceType.Pro2,
      firmwareType: EFirmwareType.Universal,
      deviceId: 'device-1',
      serialNo: 'SERIAL-1',
      label: 'My Pro2',
      bleName: 'Pro2 1234',
    });
    state.protocol = 'V2';
    state.protocolVersion = 7;
    state.status = {
      ...state.status,
      mode: 'normal',
      initialized: true,
      unlocked: true,
      passphraseProtection: false,
    };
    state.settings = {
      ...state.settings,
      language: 'en-US',
      brightness: 80,
      autoLockDelayMs: 30_000,
    };
    state.versions = {
      ...state.versions,
      firmware: '5.0.0',
      bootloader: '2.0.0',
      ble: '1.2.3',
    };

    const features = projectFeatures(state);
    expect(features).toMatchObject({
      protocol: 'V2',
      protocolVersion: 7,
      label: 'My Pro2',
      unlocked: true,
      brightness: 80,
      firmwareVersion: '5.0.0',
    });
  });

  test.each([
    [EDeviceType.Classic1s],
    [EDeviceType.ClassicPure],
    [EDeviceType.Touch],
    [EDeviceType.Pro],
  ] as const)('preserves Protocol V1 compatibility defaults for %s', deviceType => {
    const state = createEmptyDeviceState({ deviceType });
    state.protocol = 'V1';
    state.versions.se = '1.1.0.2';
    state.raw = {
      protocolV1Features: {
        onekey_device_type: deviceType,
        initialized: true,
      } as never,
    };

    const features = projectFeatures(state);

    expect(features).toMatchObject({
      protocolVersion: 1,
      label: null,
      bootloaderMode: null,
      bootloader_mode: null,
      seVersion: '1.1.0.2',
    });
  });

  test('returns an isolated compatibility snapshot without internal raw state', () => {
    const state = createEmptyDeviceState({ deviceType: EDeviceType.Pro });
    state.protocol = 'V1';
    state.capabilities = [1];
    state.verification = { firmwareBuildId: 'build-1' };
    state.raw = {
      protocolV1Features: { label: 'Original' } as never,
    };

    const features = projectFeatures(state);
    features.capabilities.push(2);
    if (features.verify) features.verify.firmwareBuildId = 'mutated';

    expect(state.capabilities).toEqual([1]);
    expect(state.verification?.firmwareBuildId).toBe('build-1');
    expect(state.raw.protocolV1Features?.label).toBe('Original');
    expect(features).not.toHaveProperty('raw');
  });
});
