import {
  deriveDeviceFingerprint,
  deriveWalletId,
  parseBip32MasterFingerprint,
} from '../types/fingerprint';

describe('fingerprint utilities', () => {
  it('keeps the short chain fingerprint format for compatibility', () => {
    expect(deriveDeviceFingerprint('fixture')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('derives a deterministic full-width wallet id with a separate domain', () => {
    const first = deriveWalletId("keystone:secp256k1:m/44'/60'/0':fixture-xpub");
    const second = deriveWalletId("keystone:secp256k1:m/44'/60'/0':fixture-xpub");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(deriveWalletId("keystone:secp256k1:m/44'/60'/1':fixture-xpub"));
  });

  it('accepts only the complete 4-byte BIP32 fingerprint wire shape', () => {
    expect(parseBip32MasterFingerprint(' AABBCCDD ')).toBe('aabbccdd');
    expect(parseBip32MasterFingerprint('aabbccd')).toBeUndefined();
    expect(parseBip32MasterFingerprint('aabbccddee')).toBeUndefined();
    expect(parseBip32MasterFingerprint('0xaabbccdd')).toBeUndefined();
    expect(parseBip32MasterFingerprint('wallet-id')).toBeUndefined();
  });
});
