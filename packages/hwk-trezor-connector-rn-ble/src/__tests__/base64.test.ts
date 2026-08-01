import { base64ToBytes, bytesToBase64 } from '../base64';

describe('base64 utilities', () => {
  it('encodes and decodes byte arrays without Buffer', () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 252, 253, 254, 255]);
    const base64 = bytesToBase64(bytes);

    expect(base64).toBe('AAECA/z9/v8=');
    expect(Array.from(base64ToBytes(base64))).toEqual(Array.from(bytes));
  });
});
