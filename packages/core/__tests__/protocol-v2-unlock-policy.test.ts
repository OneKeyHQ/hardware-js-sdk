import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import ConfluxSignMessageCIP23 from '../src/api/conflux/ConfluxSignMessageCIP23';
import DeviceLock from '../src/api/device/DeviceLock';
import OpenWalletSession from '../src/api/OpenWalletSession';
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

  test('pre-unlocks openWalletSession before opening or restoring a wallet session', async () => {
    const method = new OpenWalletSession({
      id: 1,
      payload: { method: 'openWalletSession', mode: 'standard' },
    });
    method.init();
    const run = jest.fn().mockResolvedValue({ walletType: 'standard' });
    method.run = run as any;
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
      unlockDevice: jest.fn().mockImplementation(() => {
        features.unlocked = true;
        return Promise.resolve(features);
      }),
    };

    await expect(runMethodWithUnlockPolicy(method, device as any)).resolves.toEqual({
      walletType: 'standard',
    });

    expect(method.unlockPolicy).toBe('unlock-before-run');
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
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

  test('allows either PIN type when pre-unlocking a known hidden wallet', async () => {
    const features = { unlocked: false };
    const method = {
      name: 'btcGetAddress',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      payload: { passphraseState: 'expected-hidden-wallet-state' },
      run: jest.fn().mockResolvedValue({ address: 'bc1qexample' }),
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
      address: 'bc1qexample',
    });

    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Any, expect.any(Object));
    expect(method.run).toHaveBeenCalledTimes(1);
  });

  test('does not let an unrelated control opt into Any with a passphraseState-shaped field', async () => {
    const features = { unlocked: false };
    const method = {
      name: 'securityControl',
      unlockPolicy: 'unlock-before-run',
      useDevicePassphraseState: false,
      payload: { passphraseState: 'untrusted-field' },
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

    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, expect.any(Object));
  });

  test('pre-unlocks a locked standard wallet before wallet-session preparation', async () => {
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
        calls.push('pre-unlock');
        features.unlocked = true;
        return Promise.resolve(features);
      }),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        prepare: () => {
          calls.push('prepare');
          expect(features.unlocked).toBe(true);
          return Promise.resolve();
        },
      })
    ).resolves.toEqual({ message: 'ok' });

    expect(calls).toEqual(['status', 'pre-unlock', 'prepare', 'run']);
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, expect.any(Object));
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
