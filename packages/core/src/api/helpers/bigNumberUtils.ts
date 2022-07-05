import BigNumber from 'bignumber.js';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

/**
 * Converts a number to a two's complement representation.
 *
 * E.g. -128 would be 0x80 in two's complement, while 127 would be 0x7F.
 *
 * BigNumber.js has no built-in function, unlike https://www.npmjs.com/package/bn.js
 */
export const twosComplement = (number: BigNumber, bytes: number): BigNumber => {
  if (bytes < 1 || bytes > 32) {
    throw ERRORS.TypedError('Runtime', 'Int byte size must be between 1 and 32 (8 and 256 bits)');
  }
  // Determine value range
  const minValue = new BigNumber(2).exponentiatedBy(bytes * 8 - 1).negated();
  const maxValue = minValue.negated().minus(1);

  const bigNumber = new BigNumber(number);

  if (bigNumber.isGreaterThan(maxValue) || bigNumber.isLessThan(minValue)) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Overflow when trying to convert number ${number.toString()} into ${bytes} bytes`
    );
  }

  if (bigNumber.isPositive()) {
    return bigNumber;
  }
  return bigNumber.minus(minValue).minus(minValue);
};

export const intToHex = (
  number: number | BigNumber | string,
  bytes: number,
  signed: boolean
): string => {
  let bigNumber = new BigNumber(number);
  if (signed) {
    bigNumber = twosComplement(bigNumber, bytes);
  }
  if (bigNumber.isNegative()) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Cannot convert negative number to unsigned interger: ${number.toString()}`
    );
  }
  const hex = bigNumber.toString(16);
  const hexChars = bytes * 2;
  if (hex.length > hexChars) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Overflow when trying to convert number ${number.toString()} into ${bytes} bytes`
    );
  }
  return hex.padStart(bytes * 2, '0');
};
