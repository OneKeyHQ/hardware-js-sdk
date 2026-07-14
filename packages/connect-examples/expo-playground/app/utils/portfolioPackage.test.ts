import { describe, expect, test } from '@jest/globals';

import {
  decodePortfolioPackageBase64,
  inspectPortfolioPackage,
} from './portfolioPackage';

function buildPortfolioPackage(size = 24) {
  const bytes = new Uint8Array(size);
  bytes.set([0x4f, 0x4b, 0x50, 0x50], 0);
  bytes.set([0x50, 0x46, 0x4f, 0x4c], 8);
  return bytes;
}

describe('portfolioPackage', () => {
  test('decodes trimmed Base64 input', () => {
    const bytes = buildPortfolioPackage();
    const base64 = Buffer.from(bytes).toString('base64');

    expect(decodePortfolioPackageBase64(`  \n${base64}\n `)).toEqual(bytes);
  });

  test.each(['', '   ', 'not base64!'])('rejects invalid Base64 input %p', (value: string) => {
    expect(() => decodePortfolioPackageBase64(value)).toThrow();
  });

  test('inspects a valid Portfolio package', () => {
    const bytes = buildPortfolioPackage();

    expect(inspectPortfolioPackage(bytes, 'file')).toEqual({
      bytes,
      byteLength: bytes.byteLength,
      prefixHex: '4f 4b 50 50 00 00 00 00 50 46 4f 4c',
      source: 'file',
    });
  });

  test('rejects invalid container and type magic', () => {
    const invalidContainer = buildPortfolioPackage();
    invalidContainer[0] = 0;
    expect(() => inspectPortfolioPackage(invalidContainer, 'base64')).toThrow('OKPP');

    const invalidType = buildPortfolioPackage();
    invalidType[8] = 0;
    expect(() => inspectPortfolioPackage(invalidType, 'base64')).toThrow('PFOL');
  });

  test('rejects empty, truncated, and oversized packages', () => {
    expect(() => inspectPortfolioPackage(new Uint8Array(), 'file')).toThrow();
    expect(() => inspectPortfolioPackage(new Uint8Array(11), 'file')).toThrow();
    expect(() => inspectPortfolioPackage(buildPortfolioPackage(64 * 1024 + 1), 'file')).toThrow(
      '64 KiB'
    );
  });
});
/// <reference types="jest" />
