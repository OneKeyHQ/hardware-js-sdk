import { PROTO } from '../constants';
import type { Features, IVersionArray, IDeviceType } from '../types';

const DEFAULT_CAPABILITIES_T1: PROTO.Capability[] = [
  'Capability_Bitcoin',
  'Capability_Bitcoin_like',
  'Capability_Crypto',
  'Capability_Ethereum',
  'Capability_NEM',
  'Capability_Stellar',
  'Capability_U2F',
];

const DEFAULT_CAPABILITIES_TT: PROTO.Capability[] = [
  'Capability_Bitcoin',
  'Capability_Bitcoin_like',
  'Capability_Binance',
  'Capability_Cardano',
  'Capability_Crypto',
  'Capability_EOS',
  'Capability_Ethereum',
  'Capability_Monero',
  'Capability_NEM',
  'Capability_Ripple',
  'Capability_Stellar',
  'Capability_Tezos',
  'Capability_U2F',
];

export const parseCapabilities = (features?: Features): PROTO.Capability[] => {
  if (!features || features.firmware_present === false) return []; // no features or no firmware - no capabilities
  // fallback for older firmware that does not report capabilities
  if (!features.capabilities || !features.capabilities.length) {
    return features.major_version === 1 ? DEFAULT_CAPABILITIES_T1 : DEFAULT_CAPABILITIES_TT;
  }
  return features.capabilities;
};

export const getDeviceType = (features?: Features): IDeviceType => {
  if (!features || typeof features !== 'object' || !features.serial_no) {
    return 'classic';
  }

  const serialNo = features.serial_no;
  const miniFlag = serialNo.slice(0, 2);
  if (miniFlag.toLowerCase() === 'mi') return 'mini';
  return 'classic';
};

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features): IVersionArray => {
  if (features.onekey_version) {
    return features.onekey_version.split('.') as unknown as IVersionArray;
  }
  return [features.major_version, features.minor_version, features.patch_version];
};

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features: Features): IVersionArray | null => {
  if (!features.ble_ver) {
    return null;
  }
  return features.ble_ver.split('.') as unknown as IVersionArray;
};
