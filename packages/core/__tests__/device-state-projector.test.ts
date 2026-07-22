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
      label: 'My Pro2',
      unlocked: true,
      brightness: 80,
      firmwareVersion: '5.0.0',
    });
  });
});
