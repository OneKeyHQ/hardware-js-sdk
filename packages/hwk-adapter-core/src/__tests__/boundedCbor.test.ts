import { HardwareErrorCode } from '../types/errors';
import { assertBoundedCbor, boundedCborFromHex } from '../utils/boundedCbor';

const bytes = (hex: string) => Buffer.from(hex, 'hex');

describe('assertBoundedCbor', () => {
  it.each([
    ['an unsigned integer', '17'],
    ['a byte string', '44deadbeef'],
    ['a text string', '6449455446'],
    ['an array', '83010203'],
    ['a map', 'a201020304'],
    ['a tagged item', 'd9012f44deadbeef'],
    ['nested containers', '82a1016161810a'],
    ['a float', 'f93c00'],
  ])('accepts %s', (_case, hex) => {
    expect(() => assertBoundedCbor(bytes(hex))).not.toThrow();
  });

  // Each of these exhausts memory or hangs the vendor decoders.
  it.each([
    ['an indefinite array', '9f'],
    ['an indefinite map', 'bf'],
    ['an indefinite byte string', '5f'],
    ['an array declaring 4 billion items', '9affffffff'],
    ['a map declaring more entries than bytes', 'a3010203'],
    ['a byte string longer than the payload', '5affffffff'],
    ['a truncated length', '59ff'],
    ['a reserved length', '1c'],
    ['trailing bytes', '0101'],
    ['nesting deeper than any payload', `${'81'.repeat(100)}00`],
    ['an empty payload', ''],
  ])('refuses %s', (_case, hex) => {
    expect(() => assertBoundedCbor(bytes(hex))).toThrow(
      expect.objectContaining({ code: HardwareErrorCode.InvalidParams })
    );
  });

  it('refuses a payload above the size limit', () => {
    expect(() => assertBoundedCbor(bytes('44deadbeef'), 4)).toThrow(/larger than/);
  });
});

describe('boundedCborFromHex', () => {
  it('returns the bytes of well-formed CBOR hex', () => {
    expect(boundedCborFromHex('83010203')).toEqual(bytes('83010203'));
  });

  it.each([
    ['odd length', '830'],
    ['non-hex', '83zz'],
  ])('refuses %s', (_case, hex) => {
    expect(() => boundedCborFromHex(hex)).toThrow(
      expect.objectContaining({ code: HardwareErrorCode.InvalidParams })
    );
  });
});
