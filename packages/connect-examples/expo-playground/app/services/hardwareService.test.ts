import { afterEach, describe, expect, jest, test } from '@jest/globals';

const mockEvmGetAddress = jest.fn(async (...args: unknown[]) => {
  void args;
  return {
    success: true,
    payload: { address: '0x1234' },
  };
});
const mockGetDeviceState = jest.fn(async () => ({
  success: true,
  payload: {
    identity: {},
    status: { passphraseProtection: false },
    settings: {},
    versions: {},
  },
}));
let mockDeviceType = 'pro';

jest.mock('../utils/hardwareInstance', () => ({
  getCurrentSDKInstance: async () => ({
    evmGetAddress: mockEvmGetAddress,
    getDeviceState: mockGetDeviceState,
  }),
  clearSDKInstanceCache: () => undefined,
  TransportManager: {
    getCurrentTransport: () => 'webusb',
    setTransport: () => undefined,
  },
}));

jest.mock('../utils/logger', () => ({
  logError: () => undefined,
  logRequest: () => undefined,
  logResponse: () => undefined,
  logInfo: () => undefined,
}));

jest.mock('../store/deviceStore', () => {
  const useDeviceStore = () => ({});
  useDeviceStore.getState = () => ({
    currentDevice: {
      connectId: 'connect-id',
      deviceType: mockDeviceType,
      features: { passphraseProtection: false },
    },
    deviceFeatures: { passphraseProtection: false },
    deviceState: undefined,
    setDeviceFeatures: () => undefined,
    setCurrentDevice: () => undefined,
  });
  return { useDeviceStore };
});

jest.mock('../store/hardwareStore', () => {
  const state = {
    commonParameters: {
      useEmptyPassphrase: false,
      passphraseState: '',
      deriveCardano: false,
    },
    setCommonParameter: (key: string, value: unknown) => {
      state.commonParameters = {
        ...state.commonParameters,
        [key]: value,
      };
    },
  };
  const useHardwareStore = () => state;
  useHardwareStore.getState = () => state;
  return { useHardwareStore };
});

jest.mock('./previewHardwareParams', () => ({
  previewHardwareParams: () => undefined,
}));

import { callHardwareAPI } from './hardwareService';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

afterEach(() => {
  mockEvmGetAddress.mockClear();
  mockDeviceType = 'pro';
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('callHardwareAPI', () => {
  test('deviceId 字段存在但值为空时仍保留链方法的三参数调用', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: undefined,
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    };

    const result = await callHardwareAPI('evmGetAddress', params);

    expect(result).toEqual({
      success: true,
      payload: { address: '0x1234' },
    });

    expect(mockEvmGetAddress).toHaveBeenCalledWith('connect-id', undefined, params);
    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      path: "m/44'/60'/0'/0/0",
    });
  });

  test('OneKey Pro 的标准钱包调用不被 Pro2 隐藏钱包 mock 覆盖', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: 'device-id',
      path: "m/48'/0'/0'/0'/0/0",
      useEmptyPassphrase: true,
    };

    await callHardwareAPI('evmGetAddress', params);

    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      useEmptyPassphrase: true,
    });
  });

  test('Pro2 显式选择标准钱包时不被临时隐藏钱包 mock 覆盖', async () => {
    mockDeviceType = 'pro2';
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: 'device-id',
      path: "m/48'/0'/0'/0'/0/0",
      useEmptyPassphrase: true,
    };

    await callHardwareAPI('evmGetAddress', params);

    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      useEmptyPassphrase: true,
    });
  });
});
