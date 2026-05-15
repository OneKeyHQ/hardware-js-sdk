import { isEmpty } from 'lodash';
import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import { Enum_Capability } from '@onekeyfe/hd-transport';

import { DeviceModelToTypes } from '../types';
import { existCapability } from './capabilitieUtils';

import type { Features, IDeviceModel, IDeviceType, IVersionRange } from '../types';

/**
 * get device type by features
 */
export const getDeviceType = (features?: Features): IDeviceType => {
  if (!features || typeof features !== 'object') {
    return EDeviceType.Unknown;
  }

  // classic1s 3.5.0 pro 4.6.0
  switch (features.onekey_device_type) {
    case 'CLASSIC':
      return EDeviceType.Classic;
    case 'CLASSIC1S':
      return EDeviceType.Classic1s;
    case 'MINI':
      return EDeviceType.Mini;
    case 'TOUCH':
      return EDeviceType.Touch;
    case 'PRO':
      return EDeviceType.Pro;
    case 'PRO2':
    case 'pro2':
      return EDeviceType.Pro2;
    case 'PURE':
      return EDeviceType.ClassicPure;
    default:
      // future And old device onekey_device_type is empty
      if (!isEmpty(features.onekey_serial_no)) {
        return EDeviceType.Unknown;
      }
    // old device type
  }

  // low version hardware
  // onekey_serial_no > onekey_serial > serial_no
  const serialNo = getDeviceUUID(features);

  // not exist serialNo, bootloader mode, model 1 is classic
  if (isEmpty(serialNo) && features.bootloader_mode === true && features.model === '1') {
    return EDeviceType.Classic;
  }

  if (isEmpty(serialNo)) return EDeviceType.Unknown;

  const miniFlag = serialNo.slice(0, 2);
  // By May 2021, the miniFlag is 'bixin' for all classic devices
  if (miniFlag.toLowerCase() === 'bi') return EDeviceType.Classic;
  if (miniFlag.toLowerCase() === 'cl') return EDeviceType.Classic;
  if (miniFlag.toLowerCase() === 'cp') return EDeviceType.ClassicPure;
  if (miniFlag.toLowerCase() === 'mi') return EDeviceType.Mini;
  if (miniFlag.toLowerCase() === 'tc') return EDeviceType.Touch;
  if (miniFlag.toLowerCase() === 'pr') return EDeviceType.Pro;

  // unknown device
  return EDeviceType.Unknown;
};

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

  if (/\bPro\s*2\b/i.test(name) || /^Pro2/i.test(name)) return EDeviceType.Pro2;
  if (/\bPro\b/i.test(name) || /^Pro/i.test(name)) return EDeviceType.Pro;

  return EDeviceType.Unknown;
};

/**
 * Get Connected Device ble name by features
 * @returns
 */
export const getDeviceBleName = (features?: Features): string | null => {
  if (features == null) return null;
  return features.onekey_ble_name || features.ble_name || null;
};

/**
 * Get Connected Device UUID by features
 */
export const getDeviceUUID = (features: Features) => {
  const serialNo = features.onekey_serial_no || features.onekey_serial || features.serial_no;
  return serialNo ?? '';
};

/**
 * Get Connected Device label by features
 */
export const getDeviceLabel = (features?: Features) => {
  if (!features) return null;

  const deviceType = getDeviceType(features);
  if (deviceType == null) return null;

  if (typeof features.label === 'string' && !isEmpty(features.label)) {
    return features.label;
  }

  const bleName = getDeviceBleName(features);
  if (!isEmpty(bleName)) return bleName;

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
  features: Features | undefined,
  getVersionRange: (deviceModel: IDeviceType | IDeviceModel) => IVersionRange | undefined
): IVersionRange | undefined => {
  const deviceType = getDeviceType(features);
  let versionRange: IVersionRange | undefined = getVersionRange(deviceType);

  if (versionRange) {
    return versionRange;
  }

  const modelFallbacks: IDeviceModel[] = [
    'model_classic1s',
    'model_classic',
    'model_mini',
    'model_touch',
  ];
  for (const model of modelFallbacks) {
    if (DeviceModelToTypes[model].includes(deviceType)) {
      versionRange = getVersionRange(model);
      if (versionRange) {
        return versionRange;
      }
    }
  }

  return versionRange;
};

export const shouldSkipMethodSupportCheck = (
  features: Features | undefined,
  protocolType?: string
): boolean => protocolType === 'V2' || getDeviceType(features) === EDeviceType.Pro2;

export const getFirmwareType = (features: Features | undefined) => {
  if (!features) {
    return EFirmwareType.Universal;
  }
  if (features.fw_vendor === 'OneKey Bitcoin-only') {
    return EFirmwareType.BitcoinOnly;
  }
  // old firmware
  return features?.capabilities?.length > 0 &&
    !existCapability(features, Enum_Capability.Capability_Bitcoin_like)
    ? EFirmwareType.BitcoinOnly
    : EFirmwareType.Universal;
};
