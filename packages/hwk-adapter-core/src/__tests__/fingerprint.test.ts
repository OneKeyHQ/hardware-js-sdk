import { deriveDeviceFingerprint, parseBip32MasterFingerprint } from '../types/fingerprint';

describe('fingerprint utilities', () => {
  it('keeps the short chain fingerprint format for compatibility', () => {
    expect(deriveDeviceFingerprint('fixture')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('accepts only the complete 4-byte BIP32 fingerprint wire shape', () => {
    expect(parseBip32MasterFingerprint(' AABBCCDD ')).toBe('aabbccdd');
    expect(parseBip32MasterFingerprint('aabbccd')).toBeUndefined();
    expect(parseBip32MasterFingerprint('aabbccddee')).toBeUndefined();
    expect(parseBip32MasterFingerprint('0xaabbccdd')).toBeUndefined();
    expect(parseBip32MasterFingerprint('wallet-id')).toBeUndefined();
  });
});
