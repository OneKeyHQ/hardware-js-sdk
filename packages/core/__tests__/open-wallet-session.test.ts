import { HardwareErrorCode } from '@onekeyfe/hd-shared';

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
    unlockDevice: jest.fn(),
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
      sessionId: null,
      resumed: false,
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
  });

  test('selects a hidden wallet and returns its complete binding', async () => {
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
      sessionId: 'hidden-session',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionOpen', 'DeviceSession', {
      select: {
        host_passphrase: { passphrase: 'hidden secret' },
      },
    });
    expect(device.passphraseState).toBeUndefined();
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
        sessionId: 'known-session',
      },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      sessionId: 'renewed-session',
      resumed: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionOpen', 'DeviceSession', {
      resume: { session_id: 'known-session' },
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('does not fall back to wallet selection when an explicit resume is invalid', async () => {
    const typedCall = jest.fn().mockRejectedValue(new Error('Failure_InvalidSession'));
    const promptPassphrase = jest.fn();
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
        deviceId: 'device-1',
        passphraseState: 'hidden-state',
        sessionId: 'expired-session',
      },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toThrow('Failure_InvalidSession');
    expect(promptPassphrase).not.toHaveBeenCalled();
  });
});
