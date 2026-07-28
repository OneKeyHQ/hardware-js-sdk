import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

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
      status: { passphraseProtection },
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

  test('keeps the legacy getPassphraseState App flow working on Protocol V2', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { eventless_wallet_session: true } })
      .mockResolvedValueOnce({ message: { message: 'passphrase prepared' } })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'pro2-wallet-state',
          session_id: 'pro2-wallet-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'legacy app secret' });
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
        initSession: true,
        useEmptyPassphrase: false,
      },
    });
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toBe('pro2-wallet-state');
    expect(promptPassphrase).toHaveBeenCalledWith(
      expect.objectContaining({ deviceOnly: true }),
      expect.anything()
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      { timeoutMs: 120_000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(3, 'DeviceSessionGet', 'DeviceSession', {});
    expect(JSON.stringify(typedCall.mock.calls)).not.toContain('legacy app secret');
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
        initSession: true,
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
      sessionId: 'main-wallet-session',
      resumed: false,
    });
    expect(method.payload.useEmptyPassphrase).toBe(true);
    expect(typedCall).toHaveBeenCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: undefined,
    });
    expect(device.clearInternalState).toHaveBeenCalled();
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
    expect(promptPassphrase).toHaveBeenCalledWith(
      expect.objectContaining({ deviceOnly: true }),
      expect.anything()
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      { timeoutMs: 120_000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(3, 'DeviceSessionGet', 'DeviceSession', {});
    expect(JSON.stringify(typedCall.mock.calls)).not.toContain('hidden secret');
  });

  test('classifies the selected Pro2 wallet from the post-unlock device state', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: { message: 'passphrase prepared' } })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state-after-unlock',
          session_id: 'hidden-session-after-unlock',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden secret' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ passphraseProtection: false, typedCall, promptPassphrase });
    device.features.unlocked = false;
    device.getCurrentPassphraseProtection = () => device.features.passphraseProtection;
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      device.features.passphraseProtection = true;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state-after-unlock',
      sessionId: 'hidden-session-after-unlock',
      resumed: false,
    });
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main);
    expect(promptPassphrase).toHaveBeenCalledTimes(1);
  });

  test('uses legacy initSession to replace a hidden-wallet session on Protocol V2', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'new-hidden-state',
        session_id: 'new-hidden-session',
      },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'new hidden secret' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        initSession: true,
        deviceId: 'device-1',
        passphraseState: 'stale-hidden-state',
      },
    });
    method.init();
    deviceWalletSessionStore.set('device-1', 'stale-hidden-state', 'stale-hidden-session');
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'new-hidden-state',
      sessionId: 'new-hidden-session',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      {
        timeoutMs: 120_000,
      }
    );
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(promptPassphrase).toHaveBeenCalled();
    expect(deviceWalletSessionStore.get('device-1', 'stale-hidden-state')).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-1', 'new-hidden-state')).toBe('new-hidden-session');
  });

  test('does not clear another device wallet through legacy initSession', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'current-device-state',
        session_id: 'current-device-session',
      },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden secret' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        initSession: true,
        deviceId: 'other-device',
        passphraseState: 'other-device-state',
      },
    });
    method.init();
    deviceWalletSessionStore.set('other-device', 'other-device-state', 'other-device-session');
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({
      deviceId: 'device-1',
      passphraseState: 'current-device-state',
      resumed: false,
    });
    expect(deviceWalletSessionStore.get('other-device', 'other-device-state')).toBe(
      'other-device-session'
    );
  });

  test('uses a complete legacy wallet binding to resume on Protocol V2', async () => {
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
        initSession: false,
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
      sessionId: 'renewed-session',
      resumed: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'known-session',
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test.each([
    {
      mode: 'standard',
      initSession: true,
    },
    {
      mode: 'select-hidden',
      useEmptyPassphrase: false,
    },
    {
      mode: 'select-hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
    },
    {
      mode: 'resume-hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      initSession: false,
    },
  ])('rejects legacy parameters combined with explicit mode: %o', params => {
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        ...params,
      } as any,
    });

    expect(() => method.init()).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      })
    );
  });

  test.each([{ initSession: 'true' }, { useEmptyPassphrase: 'false' }])(
    'rejects a non-boolean legacy flag: %o',
    params => {
      const method = new OpenWalletSession({
        payload: {
          method: 'openWalletSession',
          connectId: 'connect-id',
          ...params,
        } as any,
      });

      expect(() => method.init()).toThrow(
        expect.objectContaining({
          errorCode: HardwareErrorCode.CallMethodInvalidParameter,
        })
      );
    }
  );

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
    const typedCall = jest.fn().mockResolvedValue({ message: { version: 2 } });
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
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
  });

  test('opens a locked Protocol V2 standard wallet after deviceId becomes available', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { version: 2 } });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice({ typedCall });
    device.features.unlocked = false;
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: undefined },
        status: { passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: { passphraseProtection: true },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'standard',
      deviceId: 'device-1',
      passphraseState: null,
      resumed: false,
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(device.getDeviceState).toHaveBeenCalledTimes(2);
  });

  test('rejects a standard-wallet request when Protocol V2 is unlocked by Attach PIN', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'attach-wallet-state',
        session_id: 'attach-wallet-session',
      },
    });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice({ typedCall });
    device.features.unlockedAttachPin = true;
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
    });
    expect(device.lockDevice).toHaveBeenCalled();
    expect(device.clearInternalState).toHaveBeenCalled();
  });

  test('selects a hidden wallet and returns the CLI compatibility session', async () => {
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
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      {
        timeoutMs: 120_000,
      }
    );
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(promptPassphrase).toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('hidden-session');
  });

  test('selects on-device passphrase entry before getting the prepared session', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: { btc_test_address: 'device-state', session_id: 'device-session' },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphraseOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'device-state',
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      {
        timeoutMs: 120_000,
      }
    );
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('selects Attach PIN only when the device reports an existing binding', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: { btc_test_address: 'attach-state', session_id: 'attach-session' },
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.features.attachToPinEnabled = true;
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'attach-state',
    });
    expect(promptPassphrase).toHaveBeenCalledWith(
      expect.objectContaining({ existsAttachPinUser: true, deviceOnly: true }),
      { cancelDeviceOnReject: false }
    );
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.AttachToPin);
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test.each([
    {
      missingField: 'session_id',
      message: { btc_test_address: 'hidden-state' },
    },
    {
      missingField: 'btc_test_address',
      message: { session_id: 'hidden-session' },
    },
  ])(
    'rejects an incomplete Protocol V2 hidden-wallet response missing $missingField',
    async ({ message }) => {
      const typedCall = jest.fn().mockResolvedValue({ message });
      const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden secret' });
      const method = new OpenWalletSession({
        payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
      });
      method.init();
      const device = createDevice({ typedCall, promptPassphrase });
      method.device = device as any;

      await expect(method.run()).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
        message: 'DeviceSessionGet returned an incomplete DeviceSession response.',
      });
      expect(device.clearInternalState).toHaveBeenCalled();
      expect(device.updateInternalState).not.toHaveBeenCalled();
    }
  );

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
      sessionId: 'renewed-session',
      resumed: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'known-session',
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('validates a locked Protocol V2 resume binding after deviceId refresh', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'hidden-state',
        session_id: 'renewed-session',
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
    device.features.unlocked = false;
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: undefined },
        status: { passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: { passphraseProtection: true },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: true,
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(device.getDeviceState).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'known-session',
    });
    const sessionGetCall = typedCall.mock.calls.findIndex(
      ([requestName]) => requestName === 'DeviceSessionGet'
    );
    expect(device.getDeviceState.mock.invocationCallOrder[1]).toBeLessThan(
      typedCall.mock.invocationCallOrder[sessionGetCall]
    );
  });

  test('rejects a Protocol V2 resume when the refreshed deviceId does not match', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        btc_test_address: 'hidden-state',
        session_id: 'renewed-session',
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
    device.features.unlocked = false;
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: undefined },
        status: { passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'other-device' },
        status: { passphraseProtection: true },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckDeviceIdError,
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(device.clearInternalState).not.toHaveBeenCalled();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBeUndefined();
  });

  test('does not fall back to wallet selection when a cached resume is invalid', async () => {
    const typedCall = jest.fn().mockRejectedValue(
      Object.assign(new Error('Invalid session'), {
        errorCode: HardwareErrorCode.WalletSessionInvalid,
      })
    );
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

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WalletSessionInvalid,
    });
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

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WalletSessionInvalid,
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
  });
});
