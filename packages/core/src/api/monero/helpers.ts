import { hexToBytes } from '../helpers/hexUtils';
import { invalidParameter } from '../helpers/paramsValidator';

import type { DeviceFirmwareRange } from '../../types';

const NETWORK_TYPES = [0, 1, 2];

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
