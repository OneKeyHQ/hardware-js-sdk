import { describe, expect, test } from '@jest/globals';

import manifestJson from '../../../public/portfolio-cases/manifest.json';
import {
  countSignificantAsciiDigits,
  getPortfolioDisplayAmounts,
  validatePortfolioSignificantDigits,
  type PortfolioCasesManifest,
} from './portfolioCases';

const manifest = manifestJson as PortfolioCasesManifest;

describe('Portfolio test case validation', () => {
  test.each([
    ['$70,581.74', 7],
    ['0.0₄7276', 4],
    ['> $999.99Q', 5],
    ['XYZ 999.99Q', 5],
    ['$0.00', 0],
  ])('counts significant ASCII digits in %s', (value, expected) => {
    expect(countSignificantAsciiDigits(value)).toBe(expected);
  });

  test('collects every display amount field', () => {
    expect(
      getPortfolioDisplayAmounts({
        totalFiat: '$3.00',
        tokens: [
          { balance: '1', fiatValue: '$1.00' },
          { balance: '2', fiatValue: '$2.00' },
        ],
        otherTokens: { fiat: '$0.00' },
      })
    ).toEqual(['1', '$1.00', '2', '$2.00', '$0.00']);
  });

  test('blocks eight significant digits in token and other amounts before upload', () => {
    expect(
      validatePortfolioSignificantDigits({
        tokens: [{ balance: '12345678', fiatValue: '$1.00' }],
      })
    ).toContain(
      '超过 7 位有效数字'
    );
    expect(
      validatePortfolioSignificantDigits({
        otherTokens: { fiat: '$123,456.78' },
      })
    ).toContain('超过 7 位有效数字');
  });

  test('allows a full totalFiat value because the current App validates it by byte width', () => {
    expect(validatePortfolioSignificantDigits({ totalFiat: '$12,345,678.90' })).toBeNull();
  });

  test('includes the complete normal token mapping fixtures', () => {
    const mappingCases = manifest.cases.filter(item => item.id.startsWith('M'));
    const mappingTokens = mappingCases.flatMap(item =>
      Array.isArray(item.payload.tokens) ? item.payload.tokens : []
    ) as {
      contractAddress: string;
      isAllNetworks: boolean;
      isNative: boolean;
      name: string;
      networkId: string;
    }[];

    expect(mappingCases).toHaveLength(17);
    expect(mappingTokens).toHaveLength(80);
    expect(mappingTokens.filter(token => token.isNative)).toHaveLength(63);
    expect(
      mappingTokens.filter(token => !token.isNative && !token.isAllNetworks)
    ).toHaveLength(9);
    expect(mappingTokens.filter(token => token.isAllNetworks)).toHaveLength(8);
    expect(Math.max(...mappingCases.map(item => item.payload.tokenCount as number))).toBe(5);
  });

  test('preserves case-sensitive contract addresses in mapping fixtures', () => {
    const mappingTokens = manifest.cases
      .filter(item => item.id.startsWith('M'))
      .flatMap(item => (Array.isArray(item.payload.tokens) ? item.payload.tokens : [])) as {
      contractAddress: string;
      networkId: string;
    }[];

    expect(
      mappingTokens.find(
        token => token.networkId === 'sol--101' && Boolean(token.contractAddress)
      )?.contractAddress
    ).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    expect(
      mappingTokens.find(
        token =>
          token.networkId === 'tron--0x2b6653dc' && Boolean(token.contractAddress)
      )?.contractAddress
    ).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  });

  test('matches the current firmware exact-object contract', () => {
    const acceptedCases = manifest.cases.filter(item => item.expected === 'accept');

    for (const item of acceptedCases) {
      expect(Object.keys(item.payload)).toHaveLength(7);
      const otherTokens = item.payload.otherTokens as Record<string, unknown>;
      expect(Object.keys(otherTokens).sort()).toEqual(
        ['color', 'count', 'fiat', 'portfolioPercentage'].sort()
      );
      const tokens = Array.isArray(item.payload.tokens) ? item.payload.tokens : [];
      for (const token of tokens as Record<string, unknown>[]) {
        expect(Object.keys(token)).toHaveLength(11);
      }
    }
  });
});
