import { getKeystoneFirmwareProfile } from '../adapter/firmwareCapabilities';

describe('Keystone firmware capabilities', () => {
  it('advertises only adapter methods supported by Multi-Coin firmware', () => {
    expect(getKeystoneFirmwareProfile('3.1.4')).toEqual({
      variant: 'multi-coin',
      supportedChains: ['btc', 'evm', 'sol', 'tron'],
    });
  });

  it.each(['3.1.4-B', '3.1.4-BTC', '3.1.4-BTC-ONLY'])(
    'recognizes Bitcoin-only QR firmware %s',
    version => {
      expect(getKeystoneFirmwareProfile(version)).toEqual({
        variant: 'bitcoin-only',
        supportedChains: ['btc'],
      });
    }
  );

  it.each(['3.1.4-C', '3.1.4-CYPHERPUNK', '3.1.4-CYPHERPUNK-B'])(
    'does not infer Zcash or Monero adapter support from %s',
    version => {
      expect(getKeystoneFirmwareProfile(version)).toEqual({
        variant: 'cypherpunk',
        supportedChains: ['btc'],
      });
    }
  );

  it.each([undefined, '', '0.0.0', '3.1.4-future', '3.1.4-C-extra', 'invalid'])(
    'leaves capabilities unadvertised for unknown firmware %s',
    version => {
      expect(getKeystoneFirmwareProfile(version)).toBeUndefined();
    }
  );
});
