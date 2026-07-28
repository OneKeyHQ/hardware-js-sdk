import { describe, expect, test } from '@jest/globals';

import {
  countSignificantAsciiDigits,
  getPortfolioDisplayAmounts,
  validatePortfolioSignificantDigits,
} from './portfolioCases';

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
    ).toEqual(['$3.00', '1', '$1.00', '2', '$2.00', '$0.00']);
  });

  test('blocks eight significant digits before upload', () => {
    expect(validatePortfolioSignificantDigits({ totalFiat: '$123,456.78' })).toContain(
      '超过 7 位有效数字'
    );
    expect(validatePortfolioSignificantDigits({ totalFiat: '$12,345.67' })).toBeNull();
  });
});
