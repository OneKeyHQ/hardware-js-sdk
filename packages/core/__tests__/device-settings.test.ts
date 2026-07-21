import DeviceSettings from '../src/api/device/DeviceSettings';

import type { Features } from '../src/types';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const features = {
  protocol: 'V2',
  label: 'Old Label',
  language: 'en-US',
} as Features;

function createDevice({ protocol }: { protocol: 'V1' | 'V2' }) {
  const typedCall = jest.fn().mockResolvedValue({ message: { message: 'Success' } });
  const updateFeaturesPatch = jest.fn();
  return {
    device: {
      features,
      isProtocolV2: () => protocol === 'V2',
      commands: { typedCall },
      updateFeaturesPatch,
    },
    typedCall,
    updateFeaturesPatch,
  };
}

describe('DeviceSettings protocol routing', () => {
  it('uses ApplySettings and commits the confirmed patch for Protocol V1', async () => {
    const { device, typedCall, updateFeaturesPatch } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 1,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja-JP',
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
      label: 'Shared Label',
      language: 'ja-JP',
      use_passphrase: undefined,
      homescreen: undefined,
      _passphrase_source: undefined,
      auto_lock_delay_ms: undefined,
      display_rotation: undefined,
      passphrase_always_on_device: undefined,
      safety_checks: undefined,
      experimental_features: undefined,
      auto_shutdown_delay_ms: undefined,
      haptic_feedback: undefined,
    });
    expect(updateFeaturesPatch).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Shared Label', language: 'ja-JP' }),
      'apply-settings'
    );
  });

  it('uses DeviceSettingsSet and commits the confirmed patch for Protocol V2', async () => {
    const { device, typedCall, updateFeaturesPatch } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 2,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja-JP',
        autoLockDelayMs: 60_000,
        hapticFeedback: true,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsSet', 'Success', {
      settings: {
        label: 'Shared Label',
        language: 'ja-JP',
        autolock_delay_ms: 60_000,
        haptic_feedback: true,
      },
    });
    expect(updateFeaturesPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Shared Label',
        language: 'ja-JP',
        autoLockDelayMs: 60_000,
        hapticFeedback: true,
      }),
      'device-settings-set'
    );
    expect(typedCall.mock.calls.map(call => call[0])).not.toEqual(
      expect.arrayContaining(['DeviceInfoGet', 'DeviceStatusGet', 'DeviceSettingsGet'])
    );
  });
});
