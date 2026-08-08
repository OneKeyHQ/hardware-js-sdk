import { getMethodSupportedProtocols } from '@onekeyfe/hd-core';

import { executeProtocolAwareMethod, isMethodSupportedOnProtocol } from './protocolAwareMethod';
import { getProtocolAwareFeatures } from './protocolAwareFeatures';

import type { CoreApi } from '@onekeyfe/hd-core';

jest.mock('@onekeyfe/hd-core', () => ({
  getMethodSupportedProtocols: jest.fn(),
}));

jest.mock('./protocolAwareFeatures', () => ({
  getProtocolAwareFeatures: jest.fn(),
}));

const mockedGetMethodSupportedProtocols = getMethodSupportedProtocols as jest.MockedFunction<
  typeof getMethodSupportedProtocols
>;
const mockedGetProtocolAwareFeatures = getProtocolAwareFeatures as jest.MockedFunction<
  typeof getProtocolAwareFeatures
>;

describe('protocolAwareMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses the Core method contract as the protocol support source', () => {
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1']);

    expect(isMethodSupportedOnProtocol('stellarGetAddress', 'V2', { path: 'm/0' })).toBe(false);
    expect(mockedGetMethodSupportedProtocols).toHaveBeenCalledWith('stellarGetAddress', {
      path: 'm/0',
    });
  });

  test('adapts getFeatures instead of sending the V1 command to a V2 device', async () => {
    const response = { success: true, payload: { protocol: 'V2' } };
    mockedGetProtocolAwareFeatures.mockResolvedValue(response as never);
    const sdk = { getFeatures: jest.fn() } as unknown as CoreApi;

    await expect(
      executeProtocolAwareMethod({
        sdk,
        method: 'getFeatures',
        connectId: 'pro2',
        deviceId: 'device-id',
        protocol: 'V2',
        mode: 'connection',
      })
    ).resolves.toBe(response);

    expect(mockedGetProtocolAwareFeatures).toHaveBeenCalledWith(sdk, 'pro2', {}, 'V2');
    expect(sdk.getFeatures).not.toHaveBeenCalled();
  });

  test('returns a skippable 415 response without invoking a V1-only method', async () => {
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1']);
    const stellarGetAddress = jest.fn();
    const sdk = { stellarGetAddress } as unknown as CoreApi;

    await expect(
      executeProtocolAwareMethod({
        sdk,
        method: 'stellarGetAddress',
        connectId: 'pro2',
        deviceId: 'device-id',
        params: { path: "m/44'/148'/0'" },
        protocol: 'V2',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        payload: expect.objectContaining({
          code: 415,
          method: 'stellarGetAddress',
          protocol: 'V2',
        }),
      })
    );
    expect(stellarGetAddress).not.toHaveBeenCalled();
  });
});
