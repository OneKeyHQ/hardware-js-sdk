import {
  getDeviceType as getDeviceTypeFromSDK,
  getMethodSupportedProtocols,
} from '@onekeyfe/hd-core';
import { EDeviceType } from '@onekeyfe/hd-shared';

import { DeviceCompatibilityManager } from './DeviceCompatibility';

jest.mock('@onekeyfe/hd-core', () => ({
  getDeviceType: jest.fn(),
  getMethodSupportedProtocols: jest.fn(),
}));

jest.mock('../../provider/DeviceProvider', () => ({
  useDevice: jest.fn(),
}));

const mockedGetDeviceType = getDeviceTypeFromSDK as jest.MockedFunction<
  typeof getDeviceTypeFromSDK
>;
const mockedGetMethodSupportedProtocols = getMethodSupportedProtocols as jest.MockedFunction<
  typeof getMethodSupportedProtocols
>;

describe('DeviceCompatibilityManager Protocol V2 support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDeviceType.mockReturnValue(EDeviceType.Pro2);
  });

  test('skips a V1-only method before a Pro2 test invokes Core', () => {
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1']);
    const manager = new DeviceCompatibilityManager();
    const features = { protocol: 'V2' };

    expect(manager.checkMethod(features, 'stellarGetAddress')).toEqual({
      shouldSkip: true,
      reason: 'stellarGetAddress is not available on Protocol V2',
    });
    expect(manager.getExpectedOverride(features, 'stellarGetAddress', "m/44'/148'/0'")).toBe(false);
  });

  test('keeps methods declared by Core as shared available to Neo', () => {
    mockedGetDeviceType.mockReturnValue(EDeviceType.Neo);
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1', 'V2']);
    const manager = new DeviceCompatibilityManager();

    expect(manager.checkMethod({ protocol: 'V2' }, 'evmGetAddress')).toEqual({
      shouldSkip: false,
    });
  });
});
