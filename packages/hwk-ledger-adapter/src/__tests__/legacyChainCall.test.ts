import { isLegacyWrongAppError } from '../connector/chains/legacyChainCall';

describe('isLegacyWrongAppError', () => {
  it('returns true for canonical wrong-app codes', () => {
    expect(isLegacyWrongAppError({ statusCode: '6e00' }, 'Tron')).toBe(true);
    expect(isLegacyWrongAppError({ statusCode: '6d00' }, 'Tron')).toBe(true);
    expect(isLegacyWrongAppError({ statusCode: '6a83' }, 'Tron')).toBe(true);
  });

  it('returns true for numeric statusCode (legacy TransportStatusError shape)', () => {
    expect(isLegacyWrongAppError({ statusCode: 0x6e00 }, 'Tron')).toBe(true);
    expect(isLegacyWrongAppError({ statusCode: 28160 }, 'Tron')).toBe(true); // decimal 0x6e00
  });

  it('returns true for "CLA not supported" wording', () => {
    expect(isLegacyWrongAppError({ message: 'CLA not supported' }, 'Tron')).toBe(true);
    expect(isLegacyWrongAppError({ message: 'Please open the Tron app' }, 'Tron')).toBe(true);
  });

  // Former false-positive cases — strict check means these now return false.
  it('returns false when the error is a legit app-specific status code', () => {
    // 0x6a8d: Tron missing Custom Contracts setting — NOT a wrong-app error
    expect(isLegacyWrongAppError({ statusCode: '6a8d' }, 'Tron')).toBe(false);
    // 0x6985: user rejected — NOT a wrong-app error
    expect(isLegacyWrongAppError({ statusCode: '6985' }, 'Tron')).toBe(false);
  });

  it('returns false when the error message incidentally contains a hex token', () => {
    // Prior behavior would have treated "0x1234" as a mystery wrong-app code
    // and triggered an app close→reopen cycle on the device.
    expect(isLegacyWrongAppError(new Error('transport path: 0x1234'), 'Tron')).toBe(false);
  });

  it('returns false for unknown firmware status codes', () => {
    // A future firmware returning e.g. 0x662f should NOT be guessed as wrong-app.
    expect(isLegacyWrongAppError({ statusCode: '662f' }, 'Tron')).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(isLegacyWrongAppError(new Error('network down'), 'Tron')).toBe(false);
    expect(isLegacyWrongAppError(null, 'Tron')).toBe(false);
    expect(isLegacyWrongAppError(undefined, 'Tron')).toBe(false);
  });
});
