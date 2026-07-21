import { afterEach, describe, expect, jest, test } from '@jest/globals';

const mockEvmGetAddress = jest.fn().mockResolvedValue({
  success: true,
  payload: { address: '0x1234' },
});

jest.mock('../utils/hardwareInstance', () => ({
  getCurrentSDKInstance: async () => ({
    evmGetAddress: mockEvmGetAddress,
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
      features: { passphraseProtection: false },
    },
    deviceFeatures: { passphraseProtection: false },
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
});
