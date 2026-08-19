import { EDeviceType } from '@onekeyfe/hd-shared';

import { DeviceModelToTypes } from '../types';
import {
  resolveDeviceBleName,
  resolveDeviceFirmwareType,
  resolveDeviceSerialNo,
  resolveDeviceType,
} from './deviceFeaturesCompat';

import type { IDeviceModel, IDeviceType, IVersionRange } from '../types';
import type { DeviceFeaturesInput } from './deviceFeaturesCompat';

/**
 * get device type by features
 */
export const getDeviceType = (features?: DeviceFeaturesInput): IDeviceType =>
  resolveDeviceType(features);

/**
 * get device type by ble name
 * @param name Ble name
 */
export const getDeviceTypeByBleName = (name?: string): IDeviceType => {
  if (!name) return EDeviceType.Unknown;

  if (/^BixinKey/i.test(name)) return EDeviceType.Classic;
  if (/^K/i.test(name)) return EDeviceType.Classic;

  if (/^T/i.test(name)) return EDeviceType.Touch;
  if (/^Touch/i.test(name)) return EDeviceType.Touch;

  const compactName = name.replace(/[\s-]/g, '');
  // Require a 4-hex Pro2 suffix in the compact form. A bare `^Pro2` prefix
  // would also match OneKey Pro names such as "Pro 22D8" / "Pro 2D8F".
  if (/\bPro\s*2\b/i.test(name) || /^(?:OneKey)?Pro2[a-f0-9]{4}$/i.test(compactName)) {
    return EDeviceType.Pro2;
  }
  if (/\bNeo\b/i.test(name) || /^Neo/i.test(name) || /^(?:OneKey)?Neo/i.test(compactName)) {
    return EDeviceType.Neo;
  }
  if (/\bPro\b/i.test(name) || /^Pro/i.test(name)) return EDeviceType.Pro;

  return EDeviceType.Unknown;
};

/**
 * Get Connected Device ble name by features
 * @returns
 */
export const getDeviceBleName = (features?: DeviceFeaturesInput): string | null =>
  resolveDeviceBleName(features);

/**
 * Get Connected Device serial number by features
 */
export const getDeviceSerialNo = (features?: DeviceFeaturesInput): string =>
  resolveDeviceSerialNo(features);

/**
 * @deprecated Use getDeviceSerialNo instead.
 */
export const getDeviceUUID = getDeviceSerialNo;

/**
 * Get Connected Device label by features
 */
export const getDeviceLabel = (features?: DeviceFeaturesInput) => {
  if (!features) return null;

  const deviceType = getDeviceType(features);
  if (deviceType == null) return null;

  if ('label' in features && typeof features.label === 'string' && features.label.length > 0) {
    return features.label;
  }

  const bleName = getDeviceBleName(features);
  if (bleName) return bleName;

  if (deviceType === EDeviceType.ClassicPure) {
    return 'OneKey Classic 1S';
  }

  return `OneKey ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
};

/**
 * Get firmware version range by features
 * Type has a higher priority than Model
 */
export const getMethodVersionRange = (
  features: DeviceFeaturesInput | undefined,
  getVersionRange: (deviceModel: IDeviceType | IDeviceModel) => IVersionRange | undefined
): IVersionRange | undefined => {
  const deviceType = getDeviceType(features);

  const versionRange = getVersionRange(deviceType);
  if (versionRange) {
    return versionRange;
  }

  const modelFallbacks: IDeviceModel[] = [
    'model_pro2',
    'model_classic1s',
    'model_classic',
    'model_mini',
    'model_touch',
  ];
  for (const model of modelFallbacks) {
    if (DeviceModelToTypes[model].includes(deviceType)) {
      const versionRange = getVersionRange(model);
      if (versionRange) {
        return versionRange;
      }
    }
  }

  return undefined;
};

export const getFirmwareType = (features?: DeviceFeaturesInput) =>
  resolveDeviceFirmwareType(features);
