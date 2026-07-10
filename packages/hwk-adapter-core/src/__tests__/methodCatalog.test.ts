import {
  ALL_NETWORK_METHOD_NAMES,
  getHardwareMethodMetadata,
  isAllNetworkMethodName,
} from '../index';

describe('hardware method catalog', () => {
  it('describes current allNetwork methods and their chains', () => {
    expect(ALL_NETWORK_METHOD_NAMES).toEqual([
      'evmGetAddress',
      'btcGetAddress',
      'btcGetPublicKey',
      'solGetAddress',
      'tronGetAddress',
    ]);
    expect(getHardwareMethodMetadata('btcGetPublicKey')).toEqual({
      chain: 'btc',
      allNetwork: true,
    });
    expect(getHardwareMethodMetadata('evmSignTransaction')).toEqual({
      chain: 'evm',
      allNetwork: false,
    });
  });

  it('narrows allNetwork method names without guessing from the network', () => {
    expect(isAllNetworkMethodName('btcGetAddress')).toBe(true);
    expect(isAllNetworkMethodName('btcGetPublicKey')).toBe(true);
    expect(isAllNetworkMethodName('btcSignTransaction')).toBe(false);
    expect(isAllNetworkMethodName('notARealMethod')).toBe(false);
  });
});
