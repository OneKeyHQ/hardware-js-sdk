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
    protocol: mockProtocol,
    protocolVersion: mockProtocolVersion,
    status: { passphraseProtection: mockPassphraseProtection },
    settings: {},
    versions: {},
  },
}));
const mockGetPassphraseState = jest.fn(async () => ({
  success: true,
  payload: 'legacy-hidden-state',
}));
const mockOpenWalletSession = jest.fn(async () => ({
  success: true,
  payload: {
    protocol: 'V2',
    walletType: 'hidden',
    deviceId: 'device-1',
    passphraseState: 'pro2-hidden-state',
    resumed: false,
  },
}));
const mockPromptWebDeviceAccess = jest.fn(async (...args: unknown[]) => {
  void args;
  return {
    success: true,
    payload: { device: null },
  };
});
const mockClearSessionCache = jest.fn(async (...args: unknown[]) => {
  void args;
  return {
    success: true,
    payload: { cleared: true },
  };
});
let mockDeviceType = 'pro';
let mockProtocol: 'V1' | 'V2' = 'V1';
let mockProtocolVersion: number | null = 1;
let mockPassphraseProtection = false;
jest.mock('../utils/hardwareInstance', () => ({
  getCurrentSDKInstance: async () => ({
    evmGetAddress: mockEvmGetAddress,
    getDeviceState: mockGetDeviceState,
    getPassphraseState: mockGetPassphraseState,
    openWalletSession: mockOpenWalletSession,
    promptWebDeviceAccess: mockPromptWebDeviceAccess,
    clearSessionCache: mockClearSessionCache,
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
      features: { passphraseProtection: mockPassphraseProtection },
      state: {
        protocol: mockProtocol,
        protocolVersion: mockProtocolVersion,
        status: { passphraseProtection: mockPassphraseProtection },
      },
      connectProtocol: mockProtocol,
      protocolVersion: mockProtocolVersion,
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

import { callHardwareAPI, getDeviceSearchUserMessage } from './hardwareService';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

afterEach(() => {
  mockEvmGetAddress.mockClear();
  mockPromptWebDeviceAccess.mockClear();
  mockClearSessionCache.mockClear();
  mockGetPassphraseState.mockClear();
  mockOpenWalletSession.mockClear();
  mockDeviceType = 'pro';
  mockProtocol = 'V1';
  mockProtocolVersion = 1;
  mockPassphraseProtection = false;
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

  test('无连接方法只传入 params，不注入空 connectId', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      deviceSerialNumberFromUI: 'SERIAL-1',
    };

    await callHardwareAPI('promptWebDeviceAccess', params);

    expect(mockPromptWebDeviceAccess).toHaveBeenCalledWith(params);
  });

  test('无连接方法的业务 deviceId 不会被误判为链方法参数', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      deviceId: 'device-id',
    };

    await callHardwareAPI('clearSessionCache', params, 'params');

    expect(mockClearSessionCache).toHaveBeenCalledWith(params);
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
    expect(mockOpenWalletSession).not.toHaveBeenCalled();
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
    expect(mockOpenWalletSession).not.toHaveBeenCalled();
  });

  test('Protocol V2 隐藏钱包准备使用 openWalletSession 而不是 Legacy API', async () => {
    mockDeviceType = 'pro2';
    mockProtocol = 'V2';
    mockPassphraseProtection = true;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: 'device-id',
      path: "m/44'/60'/0'/0/0",
    };

    await callHardwareAPI('evmGetAddress', params);

    expect(mockOpenWalletSession).toHaveBeenCalledWith('connect-id', {
      mode: 'select-hidden',
    });
    expect(mockGetPassphraseState).not.toHaveBeenCalled();
    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      passphraseState: 'pro2-hidden-state',
    });
  });

  test('Protocol V1 隐藏钱包准备也使用统一 openWalletSession', async () => {
    mockPassphraseProtection = true;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: 'device-id',
      path: "m/44'/60'/0'/0/0",
    };

    await callHardwareAPI('evmGetAddress', params);

    expect(mockGetPassphraseState).not.toHaveBeenCalled();
    expect(mockOpenWalletSession).toHaveBeenCalledWith('connect-id', {
      mode: 'select-hidden',
    });
    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      passphraseState: 'pro2-hidden-state',
    });
  });

  test('后续 signer 调用只传 passphraseState，由 SDK Store 自动恢复', async () => {
    mockPassphraseProtection = true;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    const params = {
      connectId: 'connect-id',
      deviceId: 'device-id',
      path: "m/44'/60'/0'/0/0",
      passphraseState: 'pro2-hidden-state',
    };

    await callHardwareAPI('evmGetAddress', params);

    expect(mockOpenWalletSession).not.toHaveBeenCalled();
    expect(mockEvmGetAddress.mock.calls[0]?.[2]).toMatchObject({
      passphraseState: 'pro2-hidden-state',
    });
  });
});

describe('getDeviceSearchUserMessage', () => {
  test('将协议探测异常转换为可操作文案，不暴露内部探测细节', () => {
    const message = getDeviceSearchUserMessage(
      new Error(
        'Unable to detect USB protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
      )
    );

    expect(message).toBe(
      'The device did not respond. Reconnect it, unlock it if needed, and try again.'
    );
    expect(message).not.toContain('Protocol V1');
    expect(message).not.toContain('Protocol V2');
  });

  test('将 WebUSB 权限异常转换为授权引导', () => {
    expect(
      getDeviceSearchUserMessage(
        new Error('Web-USB or Web-Bluetooth device not found or needs permission')
      )
    ).toBe('Device permission is required. Reconnect the device and approve the browser prompt.');
  });
});
