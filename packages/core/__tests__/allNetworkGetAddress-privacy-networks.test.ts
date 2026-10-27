import AllNetworkGetAddress from '../src/api/allnetwork/AllNetworkGetAddress';

import type { AllNetworkAddressParams } from '../src/types/api/allNetworkGetAddress';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// Breaks the api index import cycle, as the all-network tests do.
jest.mock('../src/api/utils', () => ({
  findMethod: jest.fn(),
}));

function mapItem(payload: AllNetworkAddressParams) {
  const method = new AllNetworkGetAddress({
    id: 1,
    payload: { method: 'allNetworkGetAddress', bundle: [payload] },
  });
  return method.generateMethodName({ network: payload.network, payload, originalIndex: 0 });
}

describe('allNetworkGetAddress privacy networks', () => {
  test.each([
    [undefined, 0],
    ['mainnet', 0],
    ['testnet', 1],
  ])('asks moneroGetAddress on the %s network type', (chainName, networkType) => {
    const payload = {
      network: 'xmr' as const,
      path: "m/44'/128'/0'",
      chainName,
      showOnOneKey: false,
    };

    expect(mapItem(payload)).toEqual(
      expect.objectContaining({
        methodName: 'moneroGetAddress',
        params: {
          path: "m/44'/128'/0'",
          networkType,
          showOnOneKey: false,
          originPayload: payload,
        },
      })
    );
  });

  test('asks zcashGetAddress for the Orchard address with its viewing key', () => {
    const payload = { network: 'zcash' as const, path: "m/32'/133'/0'", showOnOneKey: false };

    expect(mapItem(payload)).toEqual(
      expect.objectContaining({
        methodName: 'zcashGetAddress',
        params: {
          path: "m/32'/133'/0'",
          showOnOneKey: false,
          addressType: 2,
          scope: 0,
          diversifierIndex: 0,
          includeUfvk: true,
          includeSeedFingerprint: true,
          originPayload: payload,
        },
      })
    );
  });
});
