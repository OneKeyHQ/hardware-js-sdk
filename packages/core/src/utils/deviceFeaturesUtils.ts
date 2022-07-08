import type { Features, IVersionArray, IDeviceType, IDeviceModel } from '../types';

export const getDeviceModel = (features?: Features): IDeviceModel => {
  if (!features || typeof features !== 'object') {
    return 'model_mini';
  }

  if (features.model === '1') {
    return 'model_mini';
  }
  // model === 'T'
  return 'model_touch';
};

export const getDeviceType = (features?: Features): IDeviceType => {
  if (!features || typeof features !== 'object') {
    return 'classic';
  }

  const serialNo = features.serial_no ?? features.onekey_serial;
  if (!serialNo) {
    // Command to enter the mini Bootloader mode
    // @ts-expect-error
    if (features?.cpu_info && !features.model) {
      return 'mini';
    }
    return 'classic';
  }

  const miniFlag = serialNo.slice(0, 2);
  if (miniFlag.toLowerCase() === 'mi') return 'mini';
  if (miniFlag.toLowerCase() === 'tc') return 'touch';
  return 'classic';
};

export const getDeviceTypeByBleName = (name?: string): IDeviceType | null => {
  if (!name) return 'classic';
  if (name.startsWith('MI')) return 'mini';
  if (name.startsWith('T')) return 'touch';
  return 'classic';
};

export const getDeviceTypeByDeviceId = (deviceId?: string): IDeviceType => {
  if (!deviceId) {
    return 'classic';
  }

  const miniFlag = deviceId.slice(0, 2);
  if (miniFlag.toLowerCase() === 'mi') return 'mini';
  return 'classic';
};

export const getDeviceUUID = (features: Features) => {
  const deviceType = getDeviceType(features);
  if (deviceType === 'classic') {
    return features.onekey_serial;
  }
  return features.serial_no;
};

export const getDeviceLabel = (features: Features) => {
  const deviceType = getDeviceType(features);
  // '' empty string or string
  if (typeof features.label === 'string') {
    return features.label;
  }
  return `My OneKey ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
};

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

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
