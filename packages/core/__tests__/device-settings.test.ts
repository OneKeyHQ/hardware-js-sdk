import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

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
  const updateState = jest.fn();
  const getDeviceState = jest.fn();
  return {
    device: {
      features,
      isProtocolV2: () => protocol === 'V2',
      commands: { typedCall },
      updateState,
      getDeviceState,
    },
    typedCall,
    updateState,
    getDeviceState,
  };
}

describe('DeviceSettings protocol routing', () => {
  it.each([
    ['label', { label: 'Shared Label' }],
    ['language', { language: 'ja-JP' }],
    ['brightness', { brightness: 80 }],
    ['haptic feedback', { hapticFeedback: true }],
  ])('does not unlock Protocol V2 before changing %s', (_name, settings) => {
    const method = new DeviceSettings({
      id: 1,
      payload: {
        method: 'deviceSettings',
        ...settings,
      },
    });

    method.init();

    expect(method.unlockPolicy).toBe('none');
  });

  it.each([
    ['auto lock', { autoLockDelayMs: 60_000 }],
    ['auto shutdown', { autoShutdownDelayMs: 120_000 }],
    ['mixed settings', { brightness: 80, autoLockDelayMs: 60_000 }],
  ])('unlocks Protocol V2 before changing %s', (_name, settings) => {
    const method = new DeviceSettings({
      id: 1,
      payload: {
        method: 'deviceSettings',
        ...settings,
      },
    });

    method.init();

    expect(method.unlockPolicy).toBe('retry-on-locked');
  });

  it('uses ApplySettings and commits the confirmed patch for Protocol V1', async () => {
    const { device, typedCall, updateState } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 1,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja',
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
      label: 'Shared Label',
      language: 'ja',
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
    expect(updateState).toHaveBeenCalledWith(
      {
        identity: { label: 'Shared Label' },
        settings: { language: 'ja' },
      },
      'apply-settings'
    );
  });

  it('uses DeviceSettingsSet and commits the confirmed patch for Protocol V2', async () => {
    const { device, typedCall, updateState } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 2,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja',
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
        language: 'ja-Jpan-JP',
        autolock_delay_ms: 60_000,
        haptic_feedback: true,
      },
    });
    expect(updateState).toHaveBeenCalledWith(
      {
        identity: { label: 'Shared Label' },
        settings: {
          language: 'ja-Jpan-JP',
          autoLockDelayMs: 60_000,
          hapticFeedback: true,
        },
      },
      'apply-settings'
    );
    expect(typedCall.mock.calls.map(call => call[0])).not.toEqual(
      expect.arrayContaining(['DeviceInfoGet', 'DeviceStatusGet', 'DeviceSettingsGet'])
    );
  });

  it('uses the Pro2 passphrase page as a device-side toggle and verifies the target state', async () => {
    const { device, typedCall, getDeviceState } = createDevice({ protocol: 'V2' });
    getDeviceState
      .mockResolvedValueOnce({
        status: { passphraseProtection: false },
      })
      .mockResolvedValueOnce({
        status: { passphraseProtection: true },
      });
    const method = new DeviceSettings({
      id: 3,
      payload: {
        method: 'deviceSettings',
        usePassphrase: true,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsPageShow', 'Success', {
      page: DeviceSettingsPage.DevicePassphrase,
    });
    expect(typedCall).not.toHaveBeenCalledWith('DeviceSettingsSet', 'Success', expect.anything());
    expect(getDeviceState).toHaveBeenNthCalledWith(1, { refreshSections: ['status'] });
    expect(getDeviceState).toHaveBeenNthCalledWith(2, { refreshSections: ['status'] });
  });

  it('does not open a Pro2 settings page when the hardware already matches the target', async () => {
    const { device, typedCall, getDeviceState } = createDevice({ protocol: 'V2' });
    getDeviceState.mockResolvedValue({
      settings: { airgapMode: false },
    });
    const method = new DeviceSettings({
      id: 4,
      payload: {
        method: 'deviceSettings',
        airgapMode: false,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({
      message: 'Settings already match requested value.',
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: ['settings'] });
  });

  it('rejects a successful Pro2 page response when the hardware did not reach the target', async () => {
    const { device, getDeviceState } = createDevice({ protocol: 'V2' });
    getDeviceState.mockResolvedValue({
      status: { passphraseProtection: false },
    });
    const method = new DeviceSettings({
      id: 5,
      payload: {
        method: 'deviceSettings',
        usePassphrase: true,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Protocol V2 passphrase setting did not reach the requested value.',
    });
  });

  it('keeps Protocol V1 passphrase settings on ApplySettings', async () => {
    const { device, typedCall, getDeviceState } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 6,
      payload: {
        method: 'deviceSettings',
        usePassphrase: true,
      },
    });
    method.init();
    (method as any).device = device;

    await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'ApplySettings',
      'Success',
      expect.objectContaining({ use_passphrase: true })
    );
    expect(getDeviceState).not.toHaveBeenCalled();
  });

  it('rejects combining a Pro2 device-side toggle with direct settings', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 7,
      payload: {
        method: 'deviceSettings',
        usePassphrase: true,
        label: 'New Label',
      },
    });
    method.init();
    (method as any).device = device;

    expect(method.unlockPolicy).toBe('none');
    expect(method.protocolV2UiInteraction).toBeUndefined();
    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  it('rejects two Pro2 device-side toggles without starting an interaction', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 8,
      payload: {
        method: 'deviceSettings',
        usePassphrase: true,
        airgapMode: true,
      },
    });
    method.init();
    (method as any).device = device;

    expect(method.unlockPolicy).toBe('none');
    expect(method.protocolV2UiInteraction).toBeUndefined();
    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });
});
