import { getDeviceUUID } from '@onekeyfe/hd-core';

import { getProtocolAwareFeatures } from '../../../utils/protocolAwareFeatures';
import {
  createBootloaderDeviceTestCase,
  isBootloaderDevice,
  validateDeviceState,
  waitForBootloaderFeatures,
} from './deviceStateTestUtils';

import type { CoreApi, Features } from '@onekeyfe/hd-core';

jest.mock('@onekeyfe/hd-core', () => ({
  getDeviceUUID: jest.fn((features?: { serialNo?: string }) => features?.serialNo ?? ''),
}));

jest.mock('../../../utils/protocolAwareFeatures', () => ({
  getProtocolAwareFeatures: jest.fn(),
}));

const mockedGetProtocolAwareFeatures = getProtocolAwareFeatures as jest.MockedFunction<
  typeof getProtocolAwareFeatures
>;

const createSdk = () =>
  ({
    searchDevices: jest.fn(),
  } as unknown as CoreApi);

describe('device state functional test helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Bootloader 检测使用 V1/V2 共享的重启方法', () => {
    const features = {
      protocol: 'V2',
      serialNo: 'PRO2-SERIAL',
    } as unknown as Features;

    expect(createBootloaderDeviceTestCase(features)).toMatchObject({
      method: 'deviceRebootToBootloader',
      params: {
        expectedSerialNo: 'PRO2-SERIAL',
        protocolHint: 'V2',
      },
      type: 'bootloader',
    });
    expect(getDeviceUUID).toHaveBeenCalledWith(features);
  });

  test('原连接恢复后读取 Protocol V2 Bootloader 状态', async () => {
    const sdk = createSdk();
    const expected = {
      success: true as const,
      payload: {
        serialNo: 'PRO2-SERIAL',
        protocol: 'V2',
        mode: 'bootloader',
        bootloader_mode: true,
      },
    };
    mockedGetProtocolAwareFeatures.mockResolvedValue(expected as never);

    await expect(
      waitForBootloaderFeatures({
        sdk,
        connectId: 'old-connect-id',
        expectedSerialNo: 'PRO2-SERIAL',
        protocolHint: 'V2',
        attempts: 1,
        initialDelayMs: 0,
        pollIntervalMs: 0,
      })
    ).resolves.toBe(expected);

    expect(mockedGetProtocolAwareFeatures).toHaveBeenCalledWith(
      sdk,
      'old-connect-id',
      {
        retryCount: 0,
        timeout: 3000,
        protocolV2DeviceInfoTimeoutMs: 3000,
      },
      'V2'
    );
    expect(sdk.searchDevices).not.toHaveBeenCalled();
  });

  test('Pro2/Neo 原连接仍可读时不重复搜索设备', async () => {
    const sdk = createSdk();
    mockedGetProtocolAwareFeatures
      .mockResolvedValueOnce({
        success: true,
        payload: {
          serialNo: 'PRO2-SERIAL',
          protocol: 'V2',
          mode: 'normal',
          bootloader_mode: false,
        },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        payload: {
          serialNo: 'PRO2-SERIAL',
          protocol: 'V2',
          mode: 'bootloader',
          bootloader_mode: true,
        },
      } as never);

    await expect(
      waitForBootloaderFeatures({
        sdk,
        connectId: 'same-connect-id',
        expectedSerialNo: 'PRO2-SERIAL',
        protocolHint: 'V2',
        attempts: 2,
        initialDelayMs: 0,
        pollIntervalMs: 0,
      })
    ).resolves.toMatchObject({
      success: true,
      payload: { bootloader_mode: true },
    });

    expect(sdk.searchDevices).not.toHaveBeenCalled();
  });

  test('缺少物理序列号时停止重连，避免误选其他设备', async () => {
    const sdk = createSdk();

    await expect(
      waitForBootloaderFeatures({
        sdk,
        connectId: 'old-connect-id',
        expectedSerialNo: '',
        protocolHint: 'V2',
        initialDelayMs: 0,
      })
    ).rejects.toThrow('无法确认目标设备序列号');

    expect(mockedGetProtocolAwareFeatures).not.toHaveBeenCalled();
    expect(sdk.searchDevices).not.toHaveBeenCalled();
  });

  test('设备重枚举后使用新的 connectId 继续检测', async () => {
    const sdk = createSdk();
    mockedGetProtocolAwareFeatures.mockImplementation((_sdk, connectId) => {
      if (connectId === 'new-connect-id') {
        return Promise.resolve({
          success: true as const,
          payload: {
            serialNo: 'NEO-SERIAL',
            protocol: 'V2',
            mode: 'bootloader',
            bootloader_mode: true,
          },
        } as never);
      }
      return Promise.resolve({
        success: false,
        payload: { error: '旧连接已断开' },
      } as never);
    });
    (sdk.searchDevices as jest.Mock).mockResolvedValue({
      success: true,
      payload: [
        {
          connectId: 'new-connect-id',
          connectProtocol: 'V2',
          serialNo: 'NEO-SERIAL',
          uuid: 'NEO-SERIAL',
        },
      ],
    });

    await expect(
      waitForBootloaderFeatures({
        sdk,
        connectId: 'old-connect-id',
        expectedSerialNo: 'NEO-SERIAL',
        protocolHint: 'V2',
        attempts: 2,
        initialDelayMs: 0,
        pollIntervalMs: 0,
      })
    ).resolves.toMatchObject({
      success: true,
      payload: { bootloader_mode: true },
    });

    expect(mockedGetProtocolAwareFeatures).toHaveBeenCalledWith(
      sdk,
      'new-connect-id',
      {
        retryCount: 0,
        timeout: 3000,
        protocolV2DeviceInfoTimeoutMs: 3000,
      },
      'V2'
    );
  });

  test('不会把其他已连接设备误判为重启后的目标设备', async () => {
    const sdk = createSdk();
    mockedGetProtocolAwareFeatures.mockResolvedValue({
      success: false,
      payload: { error: '旧连接已断开' },
    } as never);
    (sdk.searchDevices as jest.Mock).mockResolvedValue({
      success: true,
      payload: [
        {
          connectId: 'other-connect-id',
          connectProtocol: 'V2',
          serialNo: 'OTHER-SERIAL',
          uuid: 'OTHER-SERIAL',
        },
      ],
    });

    await expect(
      waitForBootloaderFeatures({
        sdk,
        connectId: 'old-connect-id',
        expectedSerialNo: 'PRO2-SERIAL',
        protocolHint: 'V2',
        attempts: 2,
        initialDelayMs: 0,
        pollIntervalMs: 0,
      })
    ).rejects.toThrow('等待 Bootloader 设备超时');

    expect(mockedGetProtocolAwareFeatures).not.toHaveBeenCalledWith(
      sdk,
      'other-connect-id',
      {
        retryCount: 0,
        timeout: 3000,
        protocolV2DeviceInfoTimeoutMs: 3000,
      },
      'V2'
    );
  });
});

describe('protocol-specific device state expectations', () => {
  const features = (patch: Partial<Features>) => patch as Features;

  it.each([false, true])(
    'accepts V2 onboarding with unlocked=%s and no legacy PIN flag',
    unlocked => {
      expect(
        validateDeviceState(
          features({
            protocol: 'V2',
            mode: 'notInitialized',
            initialized: false,
            unlocked,
            pinProtection: null,
          }),
          'uninitialized'
        )
      ).toBe('');
    }
  );

  it.each([true, null, undefined])(
    'rejects uninitialized tests with initialized=%s',
    initialized => {
      expect(
        validateDeviceState(
          features({
            protocol: 'V2',
            mode: 'notInitialized',
            initialized,
          }),
          'uninitialized'
        )
      ).not.toBe('');
    }
  );

  it('requires the explicit V2 onboarding mode', () => {
    expect(
      validateDeviceState(
        features({
          protocol: 'V2',
          mode: 'unknown',
          initialized: false,
        }),
        'uninitialized'
      )
    ).not.toBe('');
  });

  it('preserves the Pro V1 uninitialized expectations', () => {
    const v1 = features({
      protocol: 'V1',
      initialized: false,
      unlocked: true,
      pin_protection: false,
      passphrase_protection: false,
    });
    expect(validateDeviceState(v1, 'uninitialized')).toBe('');
    expect(validateDeviceState({ ...v1, unlocked: false }, 'uninitialized')).not.toBe('');
    expect(validateDeviceState({ ...v1, pin_protection: true }, 'uninitialized')).not.toBe('');
  });

  it.each(['V1', 'V2'] as const)('requires a known lock state on %s', protocol => {
    expect(validateDeviceState(features({ protocol, unlocked: false }), 'lock')).toBe('');
    for (const unlocked of [true, null, undefined]) {
      expect(validateDeviceState(features({ protocol, unlocked }), 'lock')).not.toBe('');
    }
  });

  it.each(['V1', 'V2'] as const)(
    'requires known initialized and firmware states on %s unlock',
    protocol => {
      const unlocked = features({
        protocol,
        unlocked: true,
        initialized: true,
        mode: 'normal',
        bootloader_mode: false,
        ...(protocol === 'V1' ? { pin_protection: true } : { pinProtection: null }),
      });
      expect(validateDeviceState(unlocked, 'unlock')).toBe('');
      for (const initialized of [false, null, undefined]) {
        expect(validateDeviceState(features({ ...unlocked, initialized }), 'unlock')).not.toBe('');
      }
      expect(
        validateDeviceState({ ...unlocked, mode: 'unknown', bootloader_mode: null }, 'unlock')
      ).not.toBe('');
    }
  );

  it.each(['V1', 'V2'] as const)(
    'does not treat an unknown Passphrase setting as off on %s',
    protocol => {
      const unknown = features({ protocol });
      expect(validateDeviceState(unknown, 'passphraseOpened')).not.toBe('');
      expect(validateDeviceState(unknown, 'passphraseClosed')).not.toBe('');
      const off = features({ protocol, passphraseProtection: false, passphrase_protection: false });
      expect(validateDeviceState(off, 'passphraseClosed')).toBe('');
      expect(validateDeviceState(off, 'passphraseOpened')).not.toBe('');
    }
  );

  it('keeps V1 Bootloader detection and rejects the V2 ROMloader alias', () => {
    expect(isBootloaderDevice(features({ protocol: 'V1', bootloader_mode: true }))).toBe(true);
    expect(
      isBootloaderDevice(features({ protocol: 'V2', mode: 'romloader', bootloader_mode: true }))
    ).toBe(false);
  });

  it('keeps polling a V2 ROMloader instead of accepting it as Bootloader', async () => {
    mockedGetProtocolAwareFeatures.mockResolvedValue({
      success: true,
      payload: features({
        protocol: 'V2',
        serialNo: 'PRO2-SERIAL',
        mode: 'romloader',
        bootloader_mode: true,
      }),
    } as never);
    await expect(
      waitForBootloaderFeatures({
        sdk: createSdk(),
        connectId: 'connection',
        expectedSerialNo: 'PRO2-SERIAL',
        protocolHint: 'V2',
        attempts: 1,
        initialDelayMs: 0,
        pollIntervalMs: 0,
      })
    ).rejects.toThrow('romloader');
  });
});
