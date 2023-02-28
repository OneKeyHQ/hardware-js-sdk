/* eslint-disable no-bitwise */

import { ChangeOutputScriptType, InputScriptType } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

const HD_HARDENED = 0x80000000;
export const toHardened = (n: number): number => (n | HD_HARDENED) >>> 0;
export const fromHardened = (n: number): number => (n & ~HD_HARDENED) >>> 0;

const PATH_NOT_VALID = ERRORS.TypedError(
  HardwareErrorCode.CallMethodInvalidParameter,
  'Not a valid path'
);
const PATH_NEGATIVE_VALUES = ERRORS.TypedError(
  HardwareErrorCode.CallMethodInvalidParameter,
  'Path cannot contain negative values'
);

export const getHDPath = (path: string): Array<number> => {
  const parts: Array<string> = path.toLowerCase().split('/');
  if (parts[0] !== 'm') throw PATH_NOT_VALID;
  return parts
    .filter((p: string) => p !== 'm' && p !== '')
    .map((p: string) => {
      let hardened = false;
      if (p.substr(p.length - 1) === "'") {
        hardened = true;
        p = p.substr(0, p.length - 1);
      }
      let n: number = parseInt(p);
      if (Number.isNaN(n)) {
        throw PATH_NOT_VALID;
      } else if (n < 0) {
        throw PATH_NEGATIVE_VALUES;
      }
      if (hardened) {
        // hardened index
        n = toHardened(n);
      }
      return n;
    });
};

export const isMultisigPath = (path: Array<number>): boolean =>
  Array.isArray(path) && path[0] === toHardened(48);

export const isSegwitPath = (path: Array<number>): boolean =>
  Array.isArray(path) && path[0] === toHardened(49);

export const isBech32Path = (path: Array<number>): boolean =>
  Array.isArray(path) && path[0] === toHardened(84);

export const getScriptType = (path: Array<number>): InputScriptType => {
  if (!Array.isArray(path) || path.length < 1) return 'SPENDADDRESS';

  const p1 = fromHardened(path[0]);
  switch (p1) {
    case 48:
      return 'SPENDMULTISIG';
    case 49:
      return 'SPENDP2SHWITNESS';
    case 84:
      return 'SPENDWITNESS';
    case 86:
      return 'SPENDTAPROOT';
    default:
      return 'SPENDADDRESS';
  }
};

export const getOutputScriptType = (path?: number[]): ChangeOutputScriptType => {
  if (!Array.isArray(path) || path.length < 1) return 'PAYTOADDRESS';

  // compatibility for Casa - allow an unhardened 49 path to use PAYTOP2SHWITNESS
  if (path[0] === 49) {
    return 'PAYTOP2SHWITNESS';
  }

  const p = fromHardened(path[0]);
  switch (p) {
    case 48:
      return 'PAYTOMULTISIG';
    case 49:
      return 'PAYTOP2SHWITNESS';
    case 84:
      return 'PAYTOWITNESS';
    default:
      return 'PAYTOADDRESS';
  }
};

export const serializedPath = (path: Array<number>): string => {
  const pathStr = path
    .map((p: number) => {
      if (p & HD_HARDENED) {
        return `${p & ~HD_HARDENED}'`;
      }
      return p;
    })
    .join('/');

  return `m/${pathStr}`;
};

export const validatePath = (
  path: string | Array<number>,
  length = 0,
  base = false
): Array<number> => {
  let valid: Array<number> | undefined;
  if (typeof path === 'string') {
    valid = getHDPath(path);
  } else if (Array.isArray(path)) {
    valid = path.map((p: any) => {
      const n: number = parseInt(p);
      if (Number.isNaN(n)) {
        throw PATH_NOT_VALID;
      } else if (n < 0) {
        throw PATH_NEGATIVE_VALUES;
      }
      return n;
    });
  } else {
    valid = undefined;
  }
  if (!valid) throw PATH_NOT_VALID;
  if (length > 0 && valid.length < length) throw PATH_NOT_VALID;
  return base ? valid.splice(0, 3) : valid;
};
