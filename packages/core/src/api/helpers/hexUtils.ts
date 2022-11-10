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

const hexes = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
 */
export function bytesToHex(uint8a: Uint8Array): string {
  // pre-caching improves the speed 6x
  if (!(uint8a instanceof Uint8Array)) throw new Error('Uint8Array expected');
  let hex = '';
  for (let i = 0; i < uint8a.length; i++) {
    hex += hexes[uint8a[i]];
  }
  return hex;
}

/**
 * @example hexToBytes('deadbeef')
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') {
    throw new TypeError(`hexToBytes: expected string, got ${typeof hex}`);
  }
  if (hex.length % 2) throw new Error('hexToBytes: received invalid unpadded hex');
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    const hexByte = hex.slice(j, j + 2);
    const byte = Number.parseInt(hexByte, 16);
    if (Number.isNaN(byte) || byte < 0) throw new Error('Invalid byte sequence');
    array[i] = byte;
  }
  return array;
}
