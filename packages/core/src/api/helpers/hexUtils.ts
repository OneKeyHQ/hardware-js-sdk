export const hasHexPrefix = (str: string): boolean => str.slice(0, 2).toLowerCase() === '0x';

// remove hex prefix
export const stripHexPrefix = (str: string): string => (hasHexPrefix(str) ? str.slice(2) : str);

// add hex prefix
export const addHexPrefix = (str: string): string => (hasHexPrefix(str) ? str : `0x${str}`);

export const isHexString = (value: string, length?: number) => {
  if (typeof value !== 'string' || !value.match(/^(0x|0X)?[0-9A-Fa-f]*$/)) {
    return false;
  }
  if (length && value.length !== 2 + 2 * length) {
    return false;
  }
  return true;
};

export const stripHexStartZeroes = (str: string) => {
  while (/^00/.test(str)) {
    str = str.slice(2);
  }
  return str;
};

const modifyValues = (object: any, transformer: (value: any, key: string) => any) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transformer(value, key)]));

/**
 * Passing to the hardware requires formatting hex strings in the following way.
 */
export const formatAnyHex: (value: any) => any = value => {
  if (typeof value === 'string') {
    let stripped = stripHexPrefix(value);
    // pad with zeroes
    if (stripped.length % 2 !== 0) {
      stripped = `0${stripped}`;
    }
    return stripped;
  }
  if (Array.isArray(value)) {
    return value.map(formatAnyHex);
  }
  if (typeof value === 'object') {
    return modifyValues(value, value => formatAnyHex(value));
  }

  return value;
};
