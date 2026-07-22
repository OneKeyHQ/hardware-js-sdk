import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { createEmptyDeviceState } from '../src/device/DeviceStateStore';
import {
  projectDeviceProfile,
  projectFeatures,
} from '../src/device/DeviceStateProjector';

describe('DeviceStateProjector', () => {
  test('projects legacy Features and DeviceProfile from one snapshot', () => {
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
    const profile = projectDeviceProfile(state, { scope: 'full', includeRaw: false });

    expect(features).toMatchObject({
      protocol: 'V2',
      label: 'My Pro2',
      unlocked: true,
      brightness: 80,
      firmwareVersion: '5.0.0',
    });
    expect(profile).toMatchObject({
      protocol: 'V2',
      deviceId: 'device-1',
      label: 'My Pro2',
      status: { unlocked: true, language: 'en-US' },
      versions: { firmware: '5.0.0', ble: '1.2.3' },
    });
  });

  test('keeps protocol raw payloads behind includeRaw', () => {
    const state = createEmptyDeviceState();
    state.raw = {
      protocolV1Features: { label: 'Raw label' } as never,
    };

    expect(projectDeviceProfile(state).raw).toBeUndefined();
    expect(projectDeviceProfile(state, { includeRaw: true }).raw).toMatchObject({
      protocolV1Features: { label: 'Raw label' },
    });
  });
});
