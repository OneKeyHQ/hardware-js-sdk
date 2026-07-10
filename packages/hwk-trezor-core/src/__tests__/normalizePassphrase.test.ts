import { normalizePassphrase } from '../index';

// Two byte sequences a user could type for the SAME visible passphrase "cafe":
const COMPOSED = 'caf\u00e9'; // e-acute as one codepoint (U+00E9)
const DECOMPOSED = 'cafe\u0301'; // e + combining acute accent (U+0301)

describe('normalizePassphrase (NFKD)', () => {
  it('maps composed and decomposed Unicode to the SAME bytes -> same wallet', () => {
    expect(COMPOSED).not.toBe(DECOMPOSED); // different input bytes
    expect(normalizePassphrase(COMPOSED)).toBe(normalizePassphrase(DECOMPOSED));
    expect(normalizePassphrase(COMPOSED)).toBe(DECOMPOSED); // NFKD = decomposed
  });

  it('applies compatibility decomposition (NFKD, not just NFC)', () => {
    // U+00BD (vulgar one-half) -> '1' + U+2044 (fraction slash) + '2'
    expect(normalizePassphrase('\u00bd')).toBe('1\u20442');
  });

  it('leaves plain ASCII untouched', () => {
    expect(normalizePassphrase('hunter2')).toBe('hunter2');
    expect(normalizePassphrase('')).toBe('');
  });

  it('treats undefined as empty passphrase', () => {
    expect(normalizePassphrase(undefined)).toBe('');
  });

  it('is idempotent', () => {
    const once = normalizePassphrase(COMPOSED);
    expect(normalizePassphrase(once)).toBe(once);
  });
});
