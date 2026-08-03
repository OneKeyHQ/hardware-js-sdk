import ConfluxSignMessageCIP23 from '../src/api/conflux/ConfluxSignMessageCIP23';
import DeviceLock from '../src/api/device/DeviceLock';
import { runMethodWithUnlockPolicy } from '../src/protocols/protocol-v2/unlockPolicyRunner';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('Protocol V2 unlock semantics', () => {
  test('wallet business methods inherit the wallet-session unlock requirement', () => {
    const method = new ConfluxSignMessageCIP23({
      id: 1,
      payload: { method: 'confluxSignMessageCIP23' },
    });

    expect(method.useDevicePassphraseState).toBe(true);
    expect(method.unlockPolicy).toBe('none');
    expect(method.getSupportedProtocols()).toContain('V2');
  });

  test('lock-free Protocol V2 controls explicitly opt out of wallet-session handling', () => {
    const method = new DeviceLock({
      id: 1,
      payload: { method: 'deviceLock' },
    });

    method.init();

    expect(method.useDevicePassphraseState).toBe(false);
    expect(method.unlockPolicy).toBe('none');
  });

  test('pre-unlocks an unregistered wallet business method', async () => {
    const features = { unlocked: false };
    const method = {
      name: 'newWalletBusinessMethod',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      run: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const device = {
      features,
      commands: {
        typedCall: jest.fn().mockResolvedValue({ message: { unlocked: false } }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn().mockImplementation(() => {
        features.unlocked = true;
        return Promise.resolve(features);
      }),
    };

    await expect(runMethodWithUnlockPolicy(method as any, device as any)).resolves.toEqual({
      message: 'ok',
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(method.run).toHaveBeenCalledTimes(1);
  });

  test('lets the standard wallet session own the Main PIN unlock', async () => {
    const calls: string[] = [];
    const features = {
      unlocked: false,
      passphraseProtection: true,
    };
    const method = {
      name: 'btcGetPublicKey',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      payload: { useEmptyPassphrase: true },
      run: jest.fn().mockImplementation(() => {
        calls.push('run');
        return Promise.resolve({ message: 'ok' });
      }),
    };
    const device = {
      features,
      commands: {
        typedCall: jest.fn().mockImplementation(() => {
          calls.push('status');
          return Promise.resolve({
            message: {
              unlocked: false,
              passphraseProtection: true,
            },
          });
        }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn().mockImplementation(() => {
        calls.push('wallet-session-unlock');
        features.unlocked = true;
        return Promise.resolve(features);
      }),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        prepare: async () => {
          await device.unlockDevice();
        },
      })
    ).resolves.toEqual({ message: 'ok' });

    expect(calls).toEqual(['status', 'wallet-session-unlock', 'run']);
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
  });

  test('reuses a Main PIN selected by pre-unlock when locked status hides passphrase state', async () => {
    const calls: string[] = [];
    const features: {
      unlocked: boolean;
      passphraseProtection?: boolean;
      unlockedAttachPin?: boolean;
    } = {
      unlocked: false,
    };
    const method: any = {
      name: 'btcGetPublicKey',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      payload: { useEmptyPassphrase: true },
      run: jest.fn().mockImplementation(() => {
        calls.push('run');
        return Promise.resolve({ message: 'ok' });
      }),
    };
    const device = {
      features,
      commands: {
        typedCall: jest.fn().mockImplementation(() => {
          calls.push('status');
          return Promise.resolve({
            message: {
              unlocked: false,
            },
          });
        }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn().mockImplementation(() => {
        calls.push('main-pin');
        features.unlocked = true;
        features.passphraseProtection = true;
        features.unlockedAttachPin = false;
        return Promise.resolve(features);
      }),
    };

    await expect(
      runMethodWithUnlockPolicy(method, device as any, {
        prepare: async () => {
          if (!(features.unlocked && features.unlockedAttachPin === false)) {
            await device.unlockDevice();
          }
        },
      })
    ).resolves.toEqual({ message: 'ok' });

    expect(calls).toEqual(['status', 'main-pin', 'run']);
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
  });

  test('runs fresh-status validation before starting unlock', async () => {
    const identityError = new Error('Unexpected device');
    const method = {
      name: 'walletBusinessMethod',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      run: jest.fn(),
    };
    const features = { unlocked: false };
    const device = {
      features,
      commands: {
        typedCall: jest.fn().mockResolvedValue({ message: { unlocked: false } }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn(),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        afterStatusBeforeUnlock: () => {
          throw identityError;
        },
      })
    ).rejects.toBe(identityError);

    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(method.run).not.toHaveBeenCalled();
  });
});
