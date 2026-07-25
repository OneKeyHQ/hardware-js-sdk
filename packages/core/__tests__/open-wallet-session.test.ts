import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import GetPassphraseState from '../src/api/GetPassphraseState';
import OpenWalletSession from '../src/api/OpenWalletSession';
import { deviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createDevice = ({
  passphraseProtection = true,
  typedCall = jest.fn(),
  promptPassphrase = jest.fn(),
}: {
  passphraseProtection?: boolean;
  typedCall?: jest.Mock;
  promptPassphrase?: jest.Mock;
} = {}) => {
  const device: Record<string, any> = {
    passphraseState: undefined,
    features: {
      unlocked: true,
      passphraseProtection,
      attachToPinEnabled: false,
    },
    commands: { typedCall, promptPassphrase },
    getDeviceState: jest.fn().mockResolvedValue({
      identity: { deviceId: 'device-1' },
    }),
    getCurrentDeviceId: () => 'device-1',
    getCurrentPassphraseProtection: () => passphraseProtection,
    getInternalState: () =>
      deviceWalletSessionStore.get('device-1', device.passphraseState as string | undefined),
    updateInternalState: jest.fn(
      (_enabled: boolean, passphraseState: string, deviceId: string, sessionId: string) => {
        deviceWalletSessionStore.set(deviceId, passphraseState, sessionId);
      }
    ),
    clearInternalState: jest.fn(() => {
      if (device.passphraseState) {
        deviceWalletSessionStore.delete('device-1', device.passphraseState);
      }
    }),
    lockDevice: jest.fn(),
    unlockDevice: jest.fn(),
    initialize: jest.fn(),
    emit: jest.fn(),
    isProtocolV2: () => true,
    getCurrentFirmwareType: () => 'universal',
  };
  return device;
};

describe('openWalletSession', () => {
  beforeEach(() => {
    deviceWalletSessionStore.clear();
  });

  test('keeps getPassphraseState unsupported on Protocol V2', async () => {
    const method = new GetPassphraseState({
      payload: { method: 'getPassphraseState', connectId: 'connect-id' },
    });
    method.device = createDevice() as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotSupportMethod,
    });
  });

  test('keeps Legacy Protocol V1 getPassphraseState parameterless', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'current-wallet-state',
        session_id: 'current-wallet-session',
        unlocked_attach_pin: false,
      },
    });
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
        useEmptyPassphrase: true,
        initSession: true,
        passphraseState: 'ignored-wallet-state',
      },
    });
    const device = createDevice({ typedCall });
    device.isProtocolV2 = () => false;
    device.features = {
      ...device.features,
      deviceId: 'device-1',
      passphraseProtection: true,
      unlocked: true,
      sessionId: null,
    };
    device.getCurrentFirmwareVersionString = () => '4.15.0';
    device.getCurrentDeviceType = () => EDeviceType.Pro;
    device.getFeatures = jest.fn();
    method.device = device as any;

    await expect(method.run()).resolves.toBe('current-wallet-state');
    expect(device.clearInternalState).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: undefined,
    });
  });

  test('opens the standard wallet through the Protocol V1 empty-passphrase flow', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'main-wallet-state',
        session_id: 'main-wallet-session',
        unlocked_attach_pin: false,
      },
    });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        useEmptyPassphrase: true,
        passphraseState: 'stale-hidden-state',
      },
    });
    method.init();
    const device = createDevice({ typedCall });
    device.isProtocolV2 = () => false;
    device.features = {
      ...device.features,
      deviceId: 'device-1',
      unlocked: true,
      sessionId: null,
    };
    device.getCurrentFirmwareVersionString = () => '4.15.0';
    device.getCurrentDeviceType = () => EDeviceType.Pro;
    device.getFeatures = jest.fn();
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V1',
      walletType: 'standard',
      deviceId: 'device-1',
      passphraseState: null,
      resumed: false,
    });
    expect(method.payload.useEmptyPassphrase).toBe(true);
    expect(typedCall).toHaveBeenCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: undefined,
    });
  });

  test('uses the compatibility form to select a hidden wallet on Protocol V2', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'hidden-state',
        session_id: 'hidden-session',
      },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden secret' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V2',
      walletType: 'hidden',
      passphraseState: 'hidden-state',
    });
  });

  test('reuses the SDK-managed Protocol V1 hidden-wallet session before validation', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'hidden-state',
        session_id: 'known-session',
        unlocked_attach_pin: false,
      },
    });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
        deviceId: 'device-1',
        passphraseState: 'hidden-state',
      },
    });
    method.init();
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'known-session');
    const device = createDevice({ typedCall });
    device.isProtocolV2 = () => false;
    device.features = {
      ...device.features,
      deviceId: 'device-1',
      unlocked: true,
      sessionId: null,
    };
    device.getCurrentFirmwareVersionString = () => '4.15.0';
    device.getCurrentDeviceType = () => EDeviceType.Pro;
    device.getFeatures = jest.fn();
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V1',
      walletType: 'hidden',
      passphraseState: 'hidden-state',
      resumed: true,
    });
    expect(device.initialize).toHaveBeenCalledWith({
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
    });
    expect(typedCall).toHaveBeenCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: 'hidden-state',
    });
  });

  test('opens the standard wallet without selecting a hidden wallet', async () => {
    const typedCall = jest.fn();
    const promptPassphrase = jest.fn();
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.passphraseState = 'previous-hidden-state';
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'standard',
      deviceId: 'device-1',
      passphraseState: null,
      resumed: false,
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
  });

  test('rejects a standard-wallet request when Protocol V2 is unlocked by Attach PIN', async () => {
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice();
    device.features.unlockedAttachPin = true;
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
    });
    expect(device.lockDevice).toHaveBeenCalled();
    expect(device.clearInternalState).toHaveBeenCalled();
  });

  test('selects a hidden wallet and keeps the session inside the SDK store', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'hidden-state',
        session_id: 'hidden-session',
      },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden secret' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.passphraseState = 'previous-hidden-state';
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionOpen', 'DeviceSession', {
      select: {
        host_passphrase: { passphrase: 'hidden secret' },
      },
    });
    expect(device.passphraseState).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('hidden-session');
  });

  test('resumes a known hidden wallet without prompting or device selection', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'hidden-state',
        session_id: 'renewed-session',
      },
    });
    const promptPassphrase = jest.fn();
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
        deviceId: 'device-1',
        passphraseState: 'hidden-state',
      },
    });
    method.init();
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'known-session');
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionOpen', 'DeviceSession', {
      resume: { session_id: 'known-session' },
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('does not fall back to wallet selection when a cached resume is invalid', async () => {
    const typedCall = jest.fn().mockRejectedValue(new Error('Failure_InvalidSession'));
    const promptPassphrase = jest.fn();
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
        deviceId: 'device-1',
        passphraseState: 'hidden-state',
      },
    });
    method.init();
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'expired-session');
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toThrow('Failure_InvalidSession');
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('rejects resume-hidden when the SDK store has no matching session', async () => {
    const typedCall = jest.fn();
    const promptPassphrase = jest.fn();
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
        deviceId: 'device-1',
        passphraseState: 'hidden-state',
      },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toThrow('Failure_InvalidSession');
    expect(typedCall).not.toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
  });
});
