import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType, DeviceSessionSeedDomain } from '@onekeyfe/hd-transport';

import GetPassphraseState from '../src/api/GetPassphraseState';
import OpenWalletSession from '../src/api/OpenWalletSession';
import { Device } from '../src/device/Device';
import { deviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';
import { DEVICE } from '../src/events';
import {
  ensureProtocolV2WalletSessionUnlocked,
  getProtocolV2WalletSession,
} from '../src/protocols/protocol-v2/walletSession';

const STANDARD_SEED_DOMAINS = [DeviceSessionSeedDomain.SeedDomain_Standard];
const CARDANO_SEED_DOMAINS = [
  DeviceSessionSeedDomain.SeedDomain_Standard,
  DeviceSessionSeedDomain.SeedDomain_Cardano,
];
const standardSessionGet = {};

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createDevice = ({
  passphraseProtection = true,
  unlockedAttachPin = false,
  refreshedUnlocked = true,
  refreshedPassphraseProtection = passphraseProtection,
  refreshedUnlockedAttachPin = unlockedAttachPin,
  typedCall = jest.fn(),
  promptPassphrase = jest.fn(),
}: {
  passphraseProtection?: boolean;
  unlockedAttachPin?: boolean;
  refreshedUnlocked?: boolean;
  refreshedPassphraseProtection?: boolean;
  refreshedUnlockedAttachPin?: boolean;
  typedCall?: jest.Mock;
  promptPassphrase?: jest.Mock;
} = {}) => {
  const device: Record<string, any> = {
    passphraseState: undefined,
    features: {
      unlocked: true,
      passphraseProtection,
      attachToPinEnabled: unlockedAttachPin,
      unlockedAttachPin,
    },
    commands: {
      typedCall: jest.fn((request: string, ...args: unknown[]) => {
        if (request === 'DeviceStatusGet') {
          return {
            message: {
              device_id: 'device-1',
              unlocked: refreshedUnlocked,
              attach_to_pin_enabled: unlockedAttachPin,
              unlocked_attach_pin: refreshedUnlockedAttachPin,
              unlocked_by_attach_to_pin: refreshedUnlockedAttachPin,
              passphrase_enabled: refreshedPassphraseProtection,
            },
          };
        }
        return typedCall(request, ...args);
      }),
      promptPassphrase,
    },
    ensureProtocolV2RuntimeContext: jest.fn(() =>
      device.commands.typedCall('ProtocolInfoRequest', 'ProtocolInfo', {
        eventless_wallet_session: true,
      })
    ),
    getDeviceState: jest.fn(() =>
      Promise.resolve({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: device.features.unlocked,
          passphraseProtection: device.features.passphraseProtection,
          unlockedAttachPin: device.features.unlockedAttachPin,
        },
      })
    ),
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
    updateProtocolV2Status: jest.fn((status: Record<string, unknown>) => {
      device.features.unlocked = status.unlocked ?? device.features.unlocked;
      device.features.passphraseProtection =
        status.passphrase_enabled ?? device.features.passphraseProtection;
      device.features.attachToPinEnabled =
        status.attach_to_pin_enabled ?? device.features.attachToPinEnabled;
      device.features.unlockedAttachPin =
        status.unlocked_by_attach_to_pin ??
        status.unlocked_attach_pin ??
        device.features.unlockedAttachPin;
      return device.features;
    }),
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

  test('selects the standard wallet explicitly when passphrase is enabled', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({ typedCall });

    await expect(
      getProtocolV2WalletSession(device as any, {
        onlyMainPin: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'standard-state',
      newSession: 'standard-session',
    });

    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: '',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('opens the already-unlocked standard wallet without repeating Main PIN when passphrase is disabled', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({ passphraseProtection: false, typedCall });

    await getProtocolV2WalletSession(device as any, { onlyMainPin: true });

    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('refreshes stale wallet status before accepting an only-Main-PIN session', async () => {
    let attachPinSelected = true;
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      passphraseProtection: false,
      unlockedAttachPin: false,
      typedCall,
    });
    device.commands.typedCall.mockImplementation((request: string, ...args: unknown[]) => {
      if (request === 'DeviceStatusGet') {
        return {
          message: {
            device_id: 'device-1',
            unlocked: true,
            attach_to_pin_enabled: true,
            unlocked_attach_pin: attachPinSelected,
            unlocked_by_attach_to_pin: attachPinSelected,
            passphrase_enabled: true,
          },
        };
      }
      return typedCall(request, ...args);
    });
    device.unlockDevice.mockImplementation(() => {
      attachPinSelected = false;
      device.features.unlockedAttachPin = false;
      return Promise.resolve(device.features);
    });

    await expect(
      getProtocolV2WalletSession(device as any, { onlyMainPin: true })
    ).resolves.toMatchObject({
      unlockedAttachPin: false,
    });

    expect(device.commands.typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'wallet-session-coordinator',
      reason: 'open-wallet',
      deviceOnly: true,
    });
  });

  test('still requires Main PIN when a cached standard session resolves to another wallet', async () => {
    let sessionGetCount = 0;
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionGet') {
        sessionGetCount += 1;
        return {
          message: {
            btc_test_address:
              sessionGetCount === 1 ? 'unexpected-wallet-state' : 'cached-standard-state',
            session_id:
              sessionGetCount === 1 ? 'unexpected-wallet-session' : 'cached-standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({ passphraseProtection: false, typedCall });
    device.getStandardInternalState = jest.fn(() => ({
      passphraseState: 'cached-standard-state',
      sessionId: 'cached-standard-session',
    }));
    device.clearStandardInternalState = jest.fn();

    await expect(
      getProtocolV2WalletSession(device as any, { onlyMainPin: true })
    ).resolves.toMatchObject({
      passphraseState: 'cached-standard-state',
      newSession: 'cached-standard-session',
    });

    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'wallet-session-coordinator',
      reason: 'session-recovery',
      deviceOnly: true,
    });
    expect(sessionGetCount).toBe(2);
  });

  test('reuses a Main PIN selected by the current preflight when passphrase is disabled', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({ passphraseProtection: false, typedCall });

    await getProtocolV2WalletSession(device as any, {
      onlyMainPin: true,
      mainPinSelected: true,
    });

    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('does not treat an Attach PIN DeviceStatus as the Main wallet', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({ refreshedUnlockedAttachPin: true, typedCall });

    await getProtocolV2WalletSession(device as any, { onlyMainPin: true });

    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'wallet-session-coordinator',
      reason: 'open-wallet',
      deviceOnly: true,
    });
  });

  test('unlocks a locked Protocol V2 device before restoring a wallet session', async () => {
    const device = {
      commands: {
        typedCall: jest.fn().mockResolvedValue({ message: { unlocked: false } }),
      },
      isBootloader: jest.fn().mockReturnValue(false),
      isProtocolV2: jest.fn().mockReturnValue(true),
      isRomloader: jest.fn().mockReturnValue(false),
      state: { status: { unlocked: false } },
      unlockDevice: jest.fn().mockResolvedValue(undefined),
      updateProtocolV2Status: jest.fn(function updateProtocolV2Status(
        this: { state: { status: { unlocked: boolean } } },
        status: { unlocked?: boolean }
      ) {
        this.state.status.unlocked = status.unlocked ?? this.state.status.unlocked;
      }),
    };

    await expect(ensureProtocolV2WalletSessionUnlocked(device as any)).resolves.toBe(true);
    expect(device.commands.typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'unlock-coordinator',
      reason: 'device-locked',
      deviceOnly: true,
    });
  });

  test('does not request PIN when wallet-session recovery finds the device unlocked', async () => {
    const device = {
      commands: {
        typedCall: jest.fn().mockResolvedValue({ message: { unlocked: true } }),
      },
      isBootloader: jest.fn().mockReturnValue(false),
      isProtocolV2: jest.fn().mockReturnValue(true),
      isRomloader: jest.fn().mockReturnValue(false),
      state: { status: { unlocked: true } },
      unlockDevice: jest.fn(),
      updateProtocolV2Status: jest.fn(),
    };

    await expect(ensureProtocolV2WalletSessionUnlocked(device as any)).resolves.toBe(false);
    expect(device.unlockDevice).not.toHaveBeenCalled();
  });

  test.each([{ useEmptyPassphrase: true }, { initSession: true }, {}])(
    'requires the explicit mode in the new public API: %p',
    legacyParams => {
      const method = new OpenWalletSession({
        payload: {
          method: 'openWalletSession',
          connectId: 'connect-id',
          ...legacyParams,
        },
      });

      expect(() => method.init()).toThrow('Parameter [mode] is required');
    }
  );

  test('keeps the legacy getPassphraseState App flow working on Protocol V2', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'pro2-wallet-state',
          session_id: 'pro2-wallet-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
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
      {
        existsAttachPinUser: false,
        deviceOnly: false,
        source: 'wallet-session-coordinator',
        reason: 'open-wallet',
      },
      { cancelDeviceOnReject: false }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenNthCalledWith(
      3,
      'DeviceSessionGet',
      'DeviceSession',
      standardSessionGet
    );
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
        mode: 'standard',
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
    expect(device.clearInternalState).not.toHaveBeenCalled();
  });

  test('uses the explicit mode to select a hidden wallet on Protocol V2', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'hidden-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'select-hidden',
      },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V2',
      walletType: 'hidden',
      passphraseState: 'hidden-state',
    });
    expect(promptPassphrase).toHaveBeenCalled();
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenNthCalledWith(
      3,
      'DeviceSessionGet',
      'DeviceSession',
      standardSessionGet
    );
  });

  test('refreshes Pro2 status and unlocks before selecting a hidden wallet when locked', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state-after-preflight',
          session_id: 'hidden-session-after-preflight',
        },
      });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphraseOnDevice: true }),
    });
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: false,
          passphraseProtection: null,
          unlockedAttachPin: null,
        },
      })
      .mockResolvedValue({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
      });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'hidden-state-after-preflight',
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(device.unlockDevice.mock.invocationCallOrder[0]).toBeLessThan(
      typedCall.mock.invocationCallOrder[0]
    );
  });

  test('classifies the selected Pro2 wallet from the post-unlock device state', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state-after-unlock',
          session_id: 'hidden-session-after-unlock',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({
      passphraseProtection: false,
      typedCall,
      promptPassphrase,
    });
    device.features.unlocked = false;
    device.getCurrentPassphraseProtection = () => device.features.passphraseProtection;
    device.commands.typedCall = jest.fn((request: string, ...args: unknown[]) => {
      if (request === 'DeviceStatusGet') {
        return {
          message: {
            device_id: 'device-1',
            unlocked: true,
            passphrase_enabled: true,
          },
        };
      }
      return typedCall(request, ...args);
    });
    device.updateProtocolV2Status = jest.fn((status: Record<string, unknown>) => {
      device.features.unlocked = status.unlocked ?? device.features.unlocked;
      device.features.passphraseProtection =
        status.passphrase_enabled ?? device.features.passphraseProtection;
      return device.features;
    });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      device.features.passphraseProtection = true;
      device.features.unlockedAttachPin = false;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state-after-unlock',
      resumed: false,
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(promptPassphrase).toHaveBeenCalledTimes(1);
  });

  test('unlocks before wallet selection when the Protocol V2 wallet status is unknown', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state-after-unknown-status',
          session_id: 'hidden-session-after-unknown-status',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: undefined,
          passphraseProtection: null,
          unlockedAttachPin: null,
        },
      })
      .mockResolvedValue({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      device.features.passphraseProtection = true;
      device.features.unlockedAttachPin = false;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'hidden-state-after-unknown-status',
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(device.unlockDevice.mock.invocationCallOrder[0]).toBeLessThan(
      promptPassphrase.mock.invocationCallOrder[0]
    );
  });

  test('rejects wallet selection when the post-unlock Protocol V2 status remains incomplete', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state-from-incomplete-status',
          session_id: 'hidden-session-from-incomplete-status',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.getDeviceState = jest.fn().mockResolvedValue({
      identity: { deviceId: 'device-1' },
      status: {
        unlocked: true,
        passphraseProtection: null,
        unlockedAttachPin: null,
      },
    });
    device.unlockDevice = jest.fn().mockResolvedValue(device.features);
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInitializeFailed,
    });
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('rejects before prompting for a hidden wallet when Pro2 passphrase is disabled', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'standard-wallet-state',
          session_id: 'standard-wallet-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphraseOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({
      passphraseProtection: false,
      typedCall,
      promptPassphrase,
    });
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotOpenedPassphrase,
    });
    expect(device.clearInternalState).toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
  });

  test('reuses the current Attach PIN session without reopening wallet selection', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'attach-state',
            session_id: 'attach-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'must not be requested' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({
      typedCall,
      promptPassphrase,
      unlockedAttachPin: true,
    });
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'attach-state',
      resumed: false,
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(device.commands.typedCall).toHaveBeenCalledWith(
      'DeviceSessionGet',
      'DeviceSession',
      standardSessionGet
    );
    expect(device.commands.typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
    expect(device.commands.typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPin',
      'Success',
      expect.anything()
    );
  });

  test('fails closed when the Attach PIN state changes before reading the current session', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'unexpected-state',
            session_id: 'unexpected-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'must not be requested' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({
      typedCall,
      promptPassphrase,
      unlockedAttachPin: true,
      refreshedUnlockedAttachPin: false,
    });
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
    });
    expect(device.clearInternalState).toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.commands.typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
    expect(device.commands.typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionGet',
      'DeviceSession',
      expect.anything()
    );
  });

  test('select-hidden starts a fresh hidden-wallet session on Protocol V2', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'new-hidden-state',
          session_id: 'new-hidden-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'select-hidden',
      },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'new-hidden-state',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
    expect(promptPassphrase).toHaveBeenCalled();
    expect(deviceWalletSessionStore.get('device-1', 'new-hidden-state')).toBe('new-hidden-session');
  });

  test('select-hidden does not clear another device wallet', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'current-device-state',
          session_id: 'current-device-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'select-hidden',
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

  test('uses an explicit wallet binding to resume on Protocol V2', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
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
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'known-session',
      btc_test_address: 'hidden-state',
      ...standardSessionGet,
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
    'rejects legacy flags without an explicit mode: %o',
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

  test('rejects a Protocol V1 resume when the device returns another hidden wallet', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'other-hidden-state',
        session_id: 'other-session',
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

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
    });
    expect(device.clearInternalState).toHaveBeenCalledTimes(1);
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBeUndefined();
  });

  test('opens the standard wallet without selecting a hidden wallet', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      });
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
    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: '',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
  });

  test('opens a locked Protocol V2 standard wallet after deviceId becomes available', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice({ refreshedUnlocked: false, typedCall });
    device.features.unlocked = false;
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: undefined },
        status: { unlocked: false, passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
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
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'wallet-session-coordinator',
      reason: 'open-wallet',
      deviceOnly: true,
    });
    expect(device.getDeviceState).toHaveBeenCalledTimes(2);
  });

  test('does not restrict a locked hidden-wallet selection to the Main PIN', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'hidden-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.features.unlocked = false;
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: undefined },
        status: { unlocked: false, passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      device.features.unlocked = true;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'hidden-state',
    });
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Any, {
      source: 'unlock-coordinator',
      reason: 'device-locked',
      deviceOnly: true,
      method: 'openWalletSession',
    });
    expect(device.unlockDevice).not.toHaveBeenCalledWith(
      DeviceSessionPinType.Main,
      expect.anything()
    );
  });

  test('switches from Attach PIN to Main PIN before opening the standard wallet', async () => {
    let attachPinSelected = true;
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'standard' },
    });
    method.init();
    const device = createDevice({ typedCall });
    device.features.unlockedAttachPin = true;
    device.commands.typedCall.mockImplementation((request: string, ...args: unknown[]) => {
      if (request === 'DeviceStatusGet') {
        return {
          message: {
            device_id: 'device-1',
            unlocked: true,
            attach_to_pin_enabled: true,
            unlocked_attach_pin: attachPinSelected,
            unlocked_by_attach_to_pin: attachPinSelected,
            passphrase_enabled: true,
          },
        };
      }
      return typedCall(request, ...args);
    });
    device.getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          unlockedAttachPin: true,
          passphraseProtection: true,
        },
      })
      .mockResolvedValue({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          unlockedAttachPin: false,
          passphraseProtection: true,
        },
      });
    device.unlockDevice = jest.fn().mockImplementation(() => {
      attachPinSelected = false;
      device.features.unlockedAttachPin = false;
      return Promise.resolve(device.features);
    });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'standard',
      passphraseState: null,
    });
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Main, {
      source: 'wallet-session-coordinator',
      reason: 'open-wallet',
      deviceOnly: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('selects a hidden wallet without exposing the internal device session', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'hidden-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
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
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
    expect(promptPassphrase).toHaveBeenCalled();
    expect(device.passphraseState).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('hidden-session');
  });

  test('reuses the fresh unlock and wallet-selection statuses', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'hidden-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.protocolV2UnlockContext = {
      preflightCompleted: true,
      preflightStatusRefreshed: true,
    };
    const device = createDevice({ typedCall, promptPassphrase });
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'hidden-state',
    });

    expect(device.getDeviceState.mock.calls).toEqual([[], []]);
  });

  test('gets the prepared session after host passphrase entry', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'device-state', session_id: 'device-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'device-state',
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('selects an on-device passphrase wallet with an explicit on_device request', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'device-state', session_id: 'device-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphraseOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    const passphraseInteraction = {
      interactionId: 'interaction-1',
      phaseId: 'interaction-1:phase-1',
      sequence: 1,
      phase: 'passphrase',
      transition: 'start',
      protocol: 'V2',
    } as const;
    const passphraseOnDeviceInteraction = {
      interactionId: 'interaction-1',
      phaseId: 'interaction-1:phase-2',
      sequence: 2,
      phase: 'passphrase-on-device',
      transition: 'start',
      protocol: 'V2',
    } as const;
    device.createProtocolV2UiPhaseMetadata = jest
      .fn()
      .mockReturnValueOnce(passphraseInteraction)
      .mockReturnValueOnce(passphraseOnDeviceInteraction);
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'device-state',
    });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      on_device: true,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenNthCalledWith(
      3,
      'DeviceSessionGet',
      'DeviceSession',
      standardSessionGet
    );
    expect(device.createProtocolV2UiPhaseMetadata).toHaveBeenNthCalledWith(
      2,
      'passphrase-on-device',
      'start'
    );
    expect(device.emit).toHaveBeenCalledWith(DEVICE.PASSPHRASE_ON_DEVICE, device, {
      source: 'wallet-session-coordinator',
      reason: 'open-wallet',
      interaction: passphraseOnDeviceInteraction,
    });
  });

  test('forwards a host passphrase to Pro2 firmware', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'host-state', session_id: 'host-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'select-hidden',
      },
    });
    method.init();
    method.device = createDevice({
      typedCall,
      promptPassphrase,
    }) as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'host-state',
    });
    expect(promptPassphrase).toHaveBeenCalledWith(
      {
        existsAttachPinUser: false,
        deviceOnly: false,
        source: 'wallet-session-coordinator',
        reason: 'open-wallet',
      },
      { cancelDeviceOnReject: false }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
    expect(typedCall).toHaveBeenNthCalledWith(
      3,
      'DeviceSessionGet',
      'DeviceSession',
      standardSessionGet
    );
  });

  test('normalizes a Unicode Host passphrase before sending it to Pro2 firmware', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'host-state', session_id: 'host-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'caf\u00e9' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({ passphraseState: 'host-state' });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'cafe\u0301',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
  });

  test('accepts a Host passphrase at the 50-byte firmware boundary', async () => {
    const passphrase = 'a'.repeat(50);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'host-state', session_id: 'host-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).resolves.toMatchObject({ passphraseState: 'host-state' });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase,
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
  });

  test('selects Attach PIN only when the device reports an existing binding', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
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
      {
        existsAttachPinUser: true,
        deviceOnly: false,
        source: 'wallet-session-coordinator',
        reason: 'open-wallet',
      },
      { cancelDeviceOnReject: false }
    );
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.AttachToPin, {
      emitUiEvent: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('uses the complete Attach PIN wire flow without a main PIN unlock', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: { message: 'PIN verified' } })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'attach-state', session_id: 'attach-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.features.attachToPinEnabled = true;
    device.unlockDevice = Device.prototype.unlockDevice.bind(device);
    method.device = device as any;

    await expect(method.run()).resolves.toMatchObject({
      walletType: 'hidden',
      passphraseState: 'attach-state',
    });
    expect(device.commands.typedCall.mock.calls).toEqual([
      ['ProtocolInfoRequest', 'ProtocolInfo', { eventless_wallet_session: true }],
      ['DeviceSessionAskPin', 'Success', { type: DeviceSessionPinType.AttachToPin }],
      ['DeviceStatusGet', 'DeviceStatus', {}],
      ['DeviceSessionGet', 'DeviceSession', standardSessionGet],
    ]);
    expect(device.commands.typedCall).not.toHaveBeenCalledWith('DeviceSessionAskPin', 'Success', {
      type: DeviceSessionPinType.Main,
    });
  });

  test.each([
    ['no selection', {}],
    ['an empty Host passphrase', { passphrase: '' }],
    ['more than one selection', { passphrase: 'host hidden wallet', passphraseOnDevice: true }],
  ])('rejects %s before sending a wallet selection command', async (_name, response) => {
    const typedCall = jest.fn().mockResolvedValueOnce({ message: { version: 2 } });
    const promptPassphrase = jest.fn().mockResolvedValue(response);
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Wallet selection must contain exactly one passphrase access mode.',
    });
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('stops before sending a wallet command when the App cancels selection', async () => {
    const cancellation = new Error('Wallet selection cancelled');
    const typedCall = jest.fn().mockResolvedValueOnce({ message: { version: 2 } });
    const promptPassphrase = jest.fn().mockRejectedValue(cancellation);
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toBe(cancellation);
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test.each(['User cancelled', 'Device disconnected'])(
    'does not issue a resume request after the wallet selection reports %s',
    async message => {
      const typedCall = jest
        .fn()
        .mockResolvedValueOnce({ message: { version: 2 } })
        .mockRejectedValueOnce(new Error(message));
      const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
      const method = new OpenWalletSession({
        payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
      });
      method.init();
      method.device = createDevice({ typedCall, promptPassphrase }) as any;

      await expect(method.run()).rejects.toThrow(message);
      expect(typedCall).toHaveBeenCalledTimes(2);
      expect(typedCall.mock.calls.some(([name]) => name === 'DeviceSessionGet')).toBe(false);
    }
  );

  test.each([
    ['a NUL byte', 'hidden\0wallet'],
    ['more than 50 UTF-8 bytes', 'a'.repeat(51)],
    ['more than 50 UTF-8 bytes after NFKD normalization', '\u00e9'.repeat(17)],
    ['an unpaired UTF-16 surrogate', '\ud800'],
  ])('rejects a Host passphrase containing %s', async (_name, passphrase) => {
    const typedCall = jest.fn().mockResolvedValueOnce({ message: { version: 2 } });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    method.device = createDevice({ typedCall, promptPassphrase }) as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Host passphrase must contain 1 to 50 valid UTF-8 bytes without NUL.',
    });
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('rejects an unavailable Attach PIN selection before asking the device for a PIN', async () => {
    const typedCall = jest.fn().mockResolvedValueOnce({ message: { version: 2 } });
    const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    device.features.attachToPinEnabled = false;
    method.device = device as any;

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Attach PIN wallet selection is unavailable on this device.',
    });
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('does not unlock or retry when wallet preparation reports a late DeviceLocked', async () => {
    const lockedError = { errorCode: HardwareErrorCode.DeviceLocked };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockRejectedValueOnce(lockedError)
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: { btc_test_address: 'hidden-state', session_id: 'hidden-session' },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    method.device = device as any;

    await expect(method.run()).rejects.toBe(lockedError);
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('does not fall back when wallet preparation is rejected', async () => {
    const invalidSessionError = { errorCode: HardwareErrorCode.WalletSessionInvalid };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockRejectedValueOnce(invalidSessionError);
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new OpenWalletSession({
      payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
    });
    method.init();
    const device = createDevice({ typedCall, promptPassphrase });
    method.device = device as any;

    await expect(method.run()).rejects.toBe(invalidSessionError);
    expect(promptPassphrase).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(device.updateInternalState).not.toHaveBeenCalled();
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
      const typedCall = jest
        .fn()
        .mockResolvedValueOnce({ message: { version: 2 } })
        .mockResolvedValueOnce({ message: {} })
        .mockResolvedValueOnce({ message });
      const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
      const method = new OpenWalletSession({
        payload: { method: 'openWalletSession', connectId: 'connect-id', mode: 'select-hidden' },
      });
      method.init();
      const device = createDevice({ typedCall, promptPassphrase });
      method.device = device as any;

      await expect(method.run()).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
        message: 'Device returned an incomplete DeviceSession response.',
      });
      expect(device.clearInternalState).toHaveBeenCalled();
      expect(device.updateInternalState).not.toHaveBeenCalled();
    }
  );

  test('resumes a known hidden wallet without prompting or device selection', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
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
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'known-session',
      btc_test_address: 'hidden-state',
      ...standardSessionGet,
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('validates a locked Protocol V2 resume binding after deviceId refresh', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
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
        status: { unlocked: false, passphraseProtection: true },
      })
      .mockResolvedValueOnce({
        identity: { deviceId: 'device-1' },
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
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
      btc_test_address: 'hidden-state',
      ...standardSessionGet,
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
        status: {
          unlocked: true,
          passphraseProtection: true,
          unlockedAttachPin: false,
        },
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

  test('reselects the expected hidden wallet when a cached Protocol V2 session is invalid', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockRejectedValueOnce(
        Object.assign(new Error('Invalid session'), {
          errorCode: HardwareErrorCode.WalletSessionInvalid,
        })
      )
      .mockResolvedValueOnce({ message: {} })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'renewed-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
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

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'expired-session',
      btc_test_address: 'hidden-state',
      ...standardSessionGet,
    });
    expect(promptPassphrase).toHaveBeenCalledTimes(1);
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('renewed-session');
  });

  test('recovers the current Attach PIN wallet when the cached session is invalid', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockRejectedValueOnce(
        Object.assign(new Error('Invalid session'), {
          errorCode: HardwareErrorCode.WalletSessionInvalid,
        })
      )
      .mockResolvedValueOnce({
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
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'expired-session');
    const device = createDevice({ unlockedAttachPin: true, typedCall, promptPassphrase });
    method.device = device as any;

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: false,
    });
    expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionGet')).toEqual([
      [
        'DeviceSessionGet',
        'DeviceSession',
        {
          session_id: 'expired-session',
          btc_test_address: 'hidden-state',
        },
      ],
      ['DeviceSessionGet', 'DeviceSession', {}],
    ]);
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.lockDevice).not.toHaveBeenCalled();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('renewed-session');
  });

  test('selects the expected hidden wallet when Protocol V2 has no cached session', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'hidden-state',
          session_id: 'new-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
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

    await expect(method.run()).resolves.toEqual({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: 'device-1',
      passphraseState: 'hidden-state',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      btc_test_address: 'hidden-state',
      ...standardSessionGet,
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-state')).toBe('new-session');
  });

  test.each([false, true])(
    'openWalletSession does not thread CommonParams.deriveCardano: %s',
    async deriveCardano => {
      const typedCall = jest
        .fn()
        .mockResolvedValueOnce({ message: { version: 2 } })
        .mockResolvedValueOnce({ message: {} })
        .mockResolvedValueOnce({
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'new-session',
          },
        });
      const method = new OpenWalletSession({
        payload: {
          method: 'openWalletSession',
          connectId: 'connect-id',
          mode: 'select-hidden',
          deriveCardano,
        },
      });
      method.init();
      method.device = createDevice({
        typedCall,
        promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
      }) as any;

      await expect(method.run()).resolves.toMatchObject({
        walletType: 'hidden',
        passphraseState: 'hidden-state',
      });
      expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
        passphrase: 'host hidden wallet',
        on_device: false,
        seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
      });
      expect(typedCall).toHaveBeenCalledWith(
        'DeviceSessionGet',
        'DeviceSession',
        standardSessionGet
      );
    }
  );

  test('requests Cardano seed domains when a V2 session rebuild has Cardano intent', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'new-session',
            seed_domains: [
              DeviceSessionSeedDomain.SeedDomain_Standard,
              DeviceSessionSeedDomain.SeedDomain_Cardano,
            ],
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    });

    await expect(
      getProtocolV2WalletSession(device as any, {
        forceWalletSelection: true,
        deriveCardano: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'hidden-state',
      newSession: 'new-session',
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: CARDANO_SEED_DOMAINS,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', standardSessionGet);
  });

  test('asks Cardano seed domains after Get reports a Standard-only session', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        const hasCardanoAsk = typedCall.mock.calls.some(
          call =>
            call[0] === 'DeviceSessionAskPassphrase' &&
            Array.isArray(call[2]?.seed_domains) &&
            call[2].seed_domains.includes(DeviceSessionSeedDomain.SeedDomain_Cardano)
        );
        return {
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'new-session',
            seed_domains: hasCardanoAsk
              ? [
                  DeviceSessionSeedDomain.SeedDomain_Standard,
                  DeviceSessionSeedDomain.SeedDomain_Cardano,
                ]
              : [DeviceSessionSeedDomain.SeedDomain_Standard],
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    });
    device.passphraseState = 'hidden-state';
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'cached-session');

    await getProtocolV2WalletSession(device as any, {
      expectedPassphraseState: 'hidden-state',
      deriveCardano: true,
    });

    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'cached-session',
      btc_test_address: 'hidden-state',
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [
        DeviceSessionSeedDomain.SeedDomain_Standard,
        DeviceSessionSeedDomain.SeedDomain_Cardano,
      ],
    });
  });

  test('uses empty AskPassphrase to add Cardano on an Attach PIN session', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        const askedCardano = typedCall.mock.calls.some(
          call =>
            call[0] === 'DeviceSessionAskPassphrase' &&
            Array.isArray(call[2]?.seed_domains) &&
            call[2].seed_domains.includes(DeviceSessionSeedDomain.SeedDomain_Cardano)
        );
        return {
          message: {
            btc_test_address: 'attach-state',
            session_id: 'attach-session',
            seed_domains: askedCardano ? CARDANO_SEED_DOMAINS : STANDARD_SEED_DOMAINS,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'should-not-ask' });
    const device = createDevice({
      typedCall,
      promptPassphrase,
      unlockedAttachPin: true,
    });

    await expect(
      getProtocolV2WalletSession(device as any, {
        readCurrentAttachPinSession: true,
        deriveCardano: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'attach-state',
      newSession: 'attach-session',
      unlockedAttachPin: true,
    });
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: '',
      on_device: false,
      seed_domains: CARDANO_SEED_DOMAINS,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(
      typedCall.mock.calls
        .filter(call => call[0] === 'DeviceSessionGet')
        .every(call => !('seed_domains' in (call[2] ?? {})))
    ).toBe(true);
  });

  test('uses empty AskPassphrase after selecting Attach PIN for Cardano intent', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'attach-state',
            session_id: 'attach-session',
            seed_domains: CARDANO_SEED_DOMAINS,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
    const device = createDevice({ typedCall, promptPassphrase });
    device.features.attachToPinEnabled = true;

    await expect(
      getProtocolV2WalletSession(device as any, {
        forceWalletSelection: true,
        deriveCardano: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'attach-state',
      newSession: 'attach-session',
      unlockedAttachPin: true,
    });
    expect(promptPassphrase).toHaveBeenCalledTimes(1);
    expect(device.unlockDevice).toHaveBeenCalledWith(
      DeviceSessionPinType.AttachToPin,
      expect.objectContaining({ emitUiEvent: false })
    );
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: '',
      on_device: false,
      seed_domains: CARDANO_SEED_DOMAINS,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(
      typedCall.mock.calls
        .filter(call => call[0] === 'DeviceSessionGet')
        .every(call => !('seed_domains' in (call[2] ?? {})))
    ).toBe(true);
  });

  test('still locks before a passphrase picker after Attach PIN Cardano empty Ask', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'attach-state',
            session_id: 'attach-session',
            seed_domains: CARDANO_SEED_DOMAINS,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'should-not-ask' });
    const device = createDevice({
      typedCall,
      promptPassphrase,
      unlockedAttachPin: true,
    });

    await getProtocolV2WalletSession(device as any, {
      readCurrentAttachPinSession: true,
      deriveCardano: true,
    });
    await expect(
      getProtocolV2WalletSession(device as any, { forceWalletSelection: true })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
    });
    expect(device.lockDevice).toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('uses a second Get for Cardano when passphrase protection is off', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionGet') {
        const getCount = typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionGet').length;
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
            seed_domains: getCount > 1 ? CARDANO_SEED_DOMAINS : STANDARD_SEED_DOMAINS,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      typedCall,
      passphraseProtection: false,
    });

    await expect(
      getProtocolV2WalletSession(device as any, {
        onlyMainPin: true,
        deriveCardano: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'standard-state',
      newSession: 'standard-session',
    });
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
    expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionGet')).toHaveLength(2);
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('fails closed when Cardano fallback still lacks Cardano', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'hidden-session',
            seed_domains: STANDARD_SEED_DOMAINS,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    });
    deviceWalletSessionStore.set('device-1', 'hidden-state', 'cached-session');

    await expect(
      getProtocolV2WalletSession(device as any, {
        expectedPassphraseState: 'hidden-state',
        deriveCardano: true,
      })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WalletSessionInvalid,
    });
    expect(device.clearInternalState).toHaveBeenCalled();
  });

  test('locks before selecting a passphrase wallet from an Attach PIN session', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceStatusGet') {
        return {
          message: {
            device_id: 'device-1',
            unlocked: true,
            passphrase_enabled: true,
            unlocked_by_attach_to_pin: true,
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'should-not-ask' });
    const device = createDevice({
      typedCall,
      promptPassphrase,
      unlockedAttachPin: true,
    });

    await expect(
      getProtocolV2WalletSession(device as any, { forceWalletSelection: true })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
    });
    expect(device.lockDevice).toHaveBeenCalled();
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionAskPassphrase',
      'Success',
      expect.anything()
    );
  });

  test('asks Standard-only seed domains when deriveCardano is false', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return { message: { version: 2 } };
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return { message: {} };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'new-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const device = createDevice({
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    });

    await getProtocolV2WalletSession(device as any, {
      forceWalletSelection: true,
      deriveCardano: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
      seed_domains: [DeviceSessionSeedDomain.SeedDomain_Standard],
    });
  });
});
