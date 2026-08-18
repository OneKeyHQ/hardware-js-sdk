import TransportUtils, { DeviceSessionPinType } from '@onekeyfe/hd-transport';
import { encode as encodeJpeg } from 'jpeg-js';

import ConfluxSignMessageCIP23 from '../src/api/conflux/ConfluxSignMessageCIP23';
import DeviceChangePin from '../src/api/device/DeviceChangePin';
import DeviceLock from '../src/api/device/DeviceLock';
import DeviceRebootToBoardloader from '../src/api/device/DeviceRebootToBoardloader';
import DeviceRebootToBootloader from '../src/api/device/DeviceRebootToBootloader';
import DeviceSettings from '../src/api/device/DeviceSettings';
import DeviceVerify from '../src/api/device/DeviceVerify';
import DeviceWipe from '../src/api/device/DeviceWipe';
import DeviceReboot from '../src/api/protocol-v2/DeviceReboot';
import DeviceUploadNft from '../src/api/protocol-v2/DeviceUploadNft';
import DeviceUploadWallpaper from '../src/api/protocol-v2/DeviceUploadWallpaper';
import FirmwareUpdateV4 from '../src/api/FirmwareUpdateV4';
import OpenWalletSession from '../src/api/OpenWalletSession';
import DataManager from '../src/data-manager/DataManager';
import { runMethodWithUnlockPolicy } from '../src/protocols/protocol-v2/unlockPolicyRunner';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const createJpegBase64 = (width: number, height: number) => {
  const data = new Uint8Array(width * height * 4);
  for (let index = 3; index < data.length; index += 4) data[index] = 0xff;
  return encodeJpeg({ width, height, data }, 80).data.toString('base64');
};

describe('Protocol V2 unlock semantics', () => {
  test('serializes genuine-device verification with Protocol V2 certificate messages', async () => {
    const method = new DeviceVerify({
      id: 1,
      payload: { method: 'deviceVerify', dataHex: 'aabb' },
    });
    method.init();
    const protocolV2Messages = TransportUtils.parseConfigure(
      DataManager.getProtobufMessages('v2Schema')
    );
    const typedCall = jest.fn(
      (requestType: string, responseType: string, payload: Record<string, unknown> = {}) => {
        const request = TransportUtils.createMessageFromName(protocolV2Messages, requestType);
        request.Message.encode(request.Message.create(payload)).finish();
        TransportUtils.createMessageFromName(protocolV2Messages, responseType);
        if (requestType === 'DeviceCertificateSign') {
          return Promise.resolve({ message: { data: 'signature' } });
        }
        return Promise.resolve({ message: { cert_and_pubkey: 'certificate' } });
      }
    );
    method.device = {
      getCurrentDeviceType: () => 'pro2',
      isProtocolV2: () => true,
      commands: { typedCall },
    } as any;

    await expect(method.run()).resolves.toEqual({
      cert: 'certificate',
      signature: 'signature',
    });
    expect(typedCall.mock.calls.map(call => call.slice(0, 2))).toEqual([
      ['DeviceCertificateSign', 'DeviceCertificateSignature'],
      ['DeviceCertificateRead', 'DeviceCertificate'],
    ]);
  });

  test('wallet business methods inherit the wallet-session unlock requirement', () => {
    const method = new ConfluxSignMessageCIP23({
      id: 1,
      payload: { method: 'confluxSignMessageCIP23' },
    });

    expect(method.useDevicePassphraseState).toBe(true);
    expect(method.unlockPolicy).toBe('none');
    expect(method.getSupportedProtocols()).toContain('V2');
  });

  test.each([
    [
      'deviceReboot',
      () =>
        new DeviceReboot({
          id: 1,
          payload: { method: 'deviceReboot', rebootType: 2 },
        }),
    ],
    [
      'deviceRebootToBootloader',
      () =>
        new DeviceRebootToBootloader({
          id: 1,
          payload: { method: 'deviceRebootToBootloader' },
        }),
    ],
    [
      'deviceRebootToBoardloader',
      () =>
        new DeviceRebootToBoardloader({
          id: 1,
          payload: { method: 'deviceRebootToBoardloader' },
        }),
    ],
  ])('pre-unlocks %s before sending DeviceReboot', (_name, createMethod) => {
    const method = createMethod();
    method.init();

    expect(method.unlockPolicy).toBe('unlock-before-run');
    expect(method.protocolV2PreUnlockPinType).toBe(DeviceSessionPinType.Any);
    expect(method.useDevicePassphraseState).toBe(false);
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

  test('allows either PIN type when pre-unlocking device settings', async () => {
    const method = new DeviceSettings({
      id: 1,
      payload: { method: 'deviceSettings', autoLockDelayMs: 60_000 },
    });
    method.init();
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
    method.run = jest.fn().mockResolvedValue({ message: 'ok' });

    await expect(runMethodWithUnlockPolicy(method, device as any)).resolves.toEqual({
      message: 'ok',
    });

    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Any, expect.any(Object));
  });

  test.each([
    [
      'PIN changes',
      () =>
        new DeviceChangePin({
          id: 1,
          payload: { method: 'deviceChangePin', remove: false },
        }),
    ],
    ['device wipe', () => new DeviceWipe({ id: 1, payload: { method: 'deviceWipe' } })],
    [
      'firmware updates',
      () =>
        new FirmwareUpdateV4({
          id: 1,
          payload: { method: 'firmwareUpdateV4', platform: 'desktop' } as any,
        }),
    ],
    [
      'genuine-device verification',
      () =>
        new DeviceVerify({
          id: 1,
          payload: { method: 'deviceVerify', dataHex: '00' },
        }),
    ],
    [
      'wallpaper uploads',
      () =>
        new DeviceUploadWallpaper({
          id: 1,
          payload: {
            method: 'deviceUploadWallpaper',
            jpegBase64: createJpegBase64(604, 1024),
          },
        }),
    ],
    [
      'NFT uploads',
      () =>
        new DeviceUploadNft({
          id: 1,
          payload: {
            method: 'deviceUploadNft',
            imageJpegBase64: createJpegBase64(540, 540),
            thumbnailJpegBase64: createJpegBase64(263, 263),
            title: 'NFT',
            subtitle: '',
            timestampMs: 1,
          },
        }),
    ],
  ])('allows either PIN type when pre-unlocking %s', async (_name, createMethod) => {
    const method = createMethod();
    method.init();
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
    method.run = jest.fn().mockResolvedValue({ message: 'ok' });

    await expect(runMethodWithUnlockPolicy(method, device as any)).resolves.toEqual({
      message: 'ok',
    });

    expect(method.unlockPolicy).toBe('unlock-before-run');
    expect(method.getSupportedProtocols()).toContain('V2');
    expect(device.unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Any, expect.any(Object));
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
