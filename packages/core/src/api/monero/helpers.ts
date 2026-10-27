import { hexToBytes } from '../helpers/hexUtils';
import { invalidParameter } from '../helpers/paramsValidator';
import { toHardened, validatePath } from '../helpers/pathUtils';

import type { DeviceFirmwareRange } from '../../types';

const NETWORK_TYPES = [0, 1, 2];

// SEP-5 account path, m/44'/128'/account', as the firmware's keychain requires.
export function validateMoneroPath(path: string | number[]) {
  const addressN = validatePath(path, 3);
  if (
    addressN.length !== 3 ||
    addressN[0] !== toHardened(44) ||
    addressN[1] !== toHardened(128) ||
    addressN[2] < toHardened(0)
  ) {
    throw invalidParameter("Monero requires an account path m/44'/128'/account'");
  }
  return addressN;
}

export function validateMoneroNetworkType(networkType: number | undefined) {
  const value = networkType ?? 0;
  if (!NETWORK_TYPES.includes(value)) {
    throw invalidParameter('Invalid Monero network type');
  }
  return value;
}

// The device returns the base58 address as ASCII bytes.
export function decodeMoneroAddress(hex: string | undefined) {
  return hex ? Buffer.from(hexToBytes(hex)).toString('utf-8') : undefined;
}

// Pro and Touch ship the Monero app; Pro 2 and the Classic family do not.
export function getMoneroVersionRange(): DeviceFirmwareRange {
  return {
    model_touch: {
      min: '0.0.0',
    },
  };
}
