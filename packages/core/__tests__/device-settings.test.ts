import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import DeviceSettings from '../src/api/device/DeviceSettings';
import { DEVICE_SETTINGS_NEVER_TIMEOUT_MS } from '../src/utils/deviceSettings';

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
      getCurrentDeviceType: () => (protocol === 'V2' ? EDeviceType.Pro2 : EDeviceType.Pro),
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
    ['language', { language: 'ja-JP' }],
    ['brightness', { brightness: 80 }],
    ['haptic feedback', { hapticFeedback: true }],
    ['animation', { animationEnabled: true }],
    ['tap to wake', { tapToWake: true }],
    ['device name display', { deviceNameDisplayEnabled: true }],
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
    ['label', { label: 'Shared Label' }],
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

    expect(method.unlockPolicy).toBe('unlock-before-run');
  });

  it('uses ApplySettings and commits the confirmed patch for Protocol V1', async () => {
    const { device, typedCall, updateState } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 1,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja',
        bluetoothEnabled: true,
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
      use_ble: true,
      haptic_feedback: undefined,
    });
    expect(updateState).toHaveBeenCalledWith(
      {
        identity: { label: 'Shared Label' },
        settings: { language: 'ja', bleEnabled: true },
      },
      'settings-write'
    );
  });

  it('normalizes legacy Protocol V1 never values before ApplySettings', async () => {
    const { device, typedCall, updateState } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 2,
      payload: {
        method: 'deviceSettings',
        autoLockDelayMs: 0,
        autoShutdownDelayMs: 0,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith(
      'ApplySettings',
      'Success',
      expect.objectContaining({
        auto_lock_delay_ms: DEVICE_SETTINGS_NEVER_TIMEOUT_MS,
        auto_shutdown_delay_ms: DEVICE_SETTINGS_NEVER_TIMEOUT_MS,
      })
    );
    expect(updateState).toHaveBeenCalledWith(
      {
        settings: {
          autoLockDelayMs: DEVICE_SETTINGS_NEVER_TIMEOUT_MS,
          autoShutdownDelayMs: DEVICE_SETTINGS_NEVER_TIMEOUT_MS,
        },
      },
      'settings-write'
    );
  });

  it('uses DeviceSettingsSet and reloads Protocol V2 status and settings from the device', async () => {
    const { device, typedCall, updateState, getDeviceState } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 2,
      payload: {
        method: 'deviceSettings',
        label: 'Shared Label',
        language: 'ja',
        autoLockDelayMs: 60_000,
        hapticFeedback: true,
        bluetoothEnabled: true,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsSet', 'Success', {
      settings: {
        label: 'Shared Label',
        language: 'ja-Jpan-JP',
        bt_enable: true,
        autolock_delay_ms: 60_000,
        haptic_feedback: true,
      },
    });
    expect(getDeviceState).toHaveBeenCalledWith({
      refreshSections: ['status', 'settings'],
    });
    expect(updateState).not.toHaveBeenCalled();
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
    expect(getDeviceState).toHaveBeenNthCalledWith(2, {
      refreshSections: ['status', 'settings'],
    });
  });

  it('reloads Protocol V2 status and settings after changing air-gap mode', async () => {
    const { device, typedCall, getDeviceState } = createDevice({ protocol: 'V2' });
    getDeviceState
      .mockResolvedValueOnce({
        settings: { airgapMode: false },
      })
      .mockResolvedValueOnce({
        status: { unlocked: true },
        settings: { airgapMode: true },
      });
    const method = new DeviceSettings({
      id: 4,
      payload: {
        method: 'deviceSettings',
        airgapMode: true,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsPageShow', 'Success', {
      page: DeviceSettingsPage.DeviceAirgap,
    });
    expect(getDeviceState).toHaveBeenNthCalledWith(1, { refreshSections: ['settings'] });
    expect(getDeviceState).toHaveBeenNthCalledWith(2, {
      refreshSections: ['status', 'settings'],
    });
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

  it('accepts a locked Pro2 as confirmation after disabling passphrase', async () => {
    const { device, getDeviceState } = createDevice({ protocol: 'V2' });
    getDeviceState
      .mockResolvedValueOnce({
        status: { unlocked: true, passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        status: { unlocked: false, passphraseProtection: true },
      });
    const method = new DeviceSettings({
      id: 6,
      payload: {
        method: 'deviceSettings',
        usePassphrase: false,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'Success' });
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

  it('rejects Protocol V1-only settings on Protocol V2 without partially applying the request', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 9,
      payload: {
        method: 'deviceSettings',
        label: 'Must not be partially applied',
        safetyChecks: 0,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      message: 'Protocol V2 does not support settings: safetyChecks.',
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  it('rejects Protocol V2-only settings on Protocol V1 without partially applying the request', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 10,
      payload: {
        method: 'deviceSettings',
        label: 'Must not be partially applied',
        brightness: 80,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      message: 'Protocol V1 does not support settings: brightness.',
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  it('accepts the Protocol V2 never timeout wire value', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 11,
      payload: {
        method: 'deviceSettings',
        autoLockDelayMs: 0x10000000,
        autoShutdownDelayMs: 0x10000000,
      },
    });
    method.init();
    (method as any).device = device;

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsSet', 'Success', {
      settings: {
        autolock_delay_ms: 0x10000000,
        autoshutdown_delay_ms: 0x10000000,
      },
    });
  });

  it('rejects unsupported Protocol V2 timeout values before sending a command', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V2' });
    const method = new DeviceSettings({
      id: 12,
      payload: {
        method: 'deviceSettings',
        autoLockDelayMs: 0,
      },
    });
    method.init();
    (method as any).device = device;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  it('rejects unknown Protocol V1 safety check levels before sending a command', async () => {
    const { device, typedCall } = createDevice({ protocol: 'V1' });
    const method = new DeviceSettings({
      id: 13,
      payload: {
        method: 'deviceSettings',
        safetyChecks: 3,
      },
    } as never);
    method.init();
    (method as any).device = device;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });
});
