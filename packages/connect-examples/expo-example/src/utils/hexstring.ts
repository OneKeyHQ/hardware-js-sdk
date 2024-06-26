export const hasHexPrefix = (str: string | undefined): boolean =>
  str?.slice(0, 2)?.toLowerCase() === '0x';

// remove hex prefix
export const stripHexPrefix = (str: string | undefined): string | undefined =>
  hasHexPrefix(str) ? str?.slice(2) : str;

// add hex prefix
export const addHexPrefix = (str: string | undefined): string | undefined =>
  hasHexPrefix(str) ? str : `0x${str}`;
