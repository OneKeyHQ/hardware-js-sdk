import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import { Enum_Capability } from '@onekeyfe/hd-transport';

import type { PROTO } from '../constants';
import type { Features, IDeviceType } from '../types';

export type DeviceFeaturesInput = Features | PROTO.Features;

type CompatibleDeviceFeatures = Partial<Features> &
  Partial<PROTO.Features> & {
    onekey_serial?: string;
    onekey_version?: string;
  };

const asCompatibleFeatures = (features: DeviceFeaturesInput): CompatibleDeviceFeatures =>
  features as CompatibleDeviceFeatures;

const firstNonEmptyString = (...values: Array<string | null | undefined>) =>
  values.find(value => typeof value === 'string' && value.length > 0);

const firstMeaningfulVersion = (...versions: Array<string | null | undefined>) =>
  versions.find(version => Boolean(version && version !== '0.0.0')) ?? null;

const versionFromParts = (major?: number | null, minor?: number | null, patch?: number | null) =>
  [major, minor, patch].map(part => Number(part) || 0).join('.');

export const resolveDeviceSerialNo = (features?: DeviceFeaturesInput): string => {
  if (!features) return '';
  const compatible = asCompatibleFeatures(features);
  return (
    firstNonEmptyString(
      compatible.serialNo,
      compatible.onekey_serial_no,
      compatible.onekey_serial,
      compatible.serial_no
    ) ?? ''
  );
};

export const resolveDeviceType = (features?: DeviceFeaturesInput): IDeviceType => {
  if (!features || typeof features !== 'object') {
    return EDeviceType.Unknown;
  }

  const compatible = asCompatibleFeatures(features);
  if (compatible.deviceType && compatible.deviceType !== EDeviceType.Unknown) {
    return compatible.deviceType;
  }

  switch (compatible.onekey_device_type?.toString().toUpperCase()) {
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
      return EDeviceType.Pro2;
    case 'PURE':
      return EDeviceType.ClassicPure;
    default:
      break;
  }

  if (compatible.model?.toString().toLowerCase() === EDeviceType.Pro2) {
    return EDeviceType.Pro2;
  }

  const serialNo = resolveDeviceSerialNo(features);
  const prefix = serialNo.slice(0, 2).toLowerCase();
  if (prefix === 'bi' || prefix === 'cl') return EDeviceType.Classic;
  if (prefix === 'cp') return EDeviceType.ClassicPure;
  if (prefix === 'mi') return EDeviceType.Mini;
  if (prefix === 'tc') return EDeviceType.Touch;
  if (prefix === 'pr') return EDeviceType.Pro;
  if (prefix === 'p2') return EDeviceType.Pro2;

  const bootloaderMode = compatible.bootloaderMode ?? compatible.bootloader_mode;
  if (!serialNo && bootloaderMode === true && compatible.model === '1') {
    return EDeviceType.Classic;
  }

  return compatible.deviceType ?? EDeviceType.Unknown;
};

export const resolveDeviceFirmwareType = (features?: DeviceFeaturesInput): EFirmwareType => {
  if (!features) {
    return EFirmwareType.Universal;
  }

  const compatible = asCompatibleFeatures(features);
  if (compatible.firmwareType) {
    return compatible.firmwareType;
  }
  if (compatible.fw_vendor === 'OneKey Bitcoin-only') {
    return EFirmwareType.BitcoinOnly;
  }

  const capabilities = compatible.capabilities as Array<number | string> | null | undefined;
  const supportsBitcoinLike = capabilities?.some(
    capability =>
      capability === Enum_Capability.Capability_Bitcoin_like ||
      capability === 'Capability_Bitcoin_like'
  );
  return capabilities?.length && !supportsBitcoinLike
    ? EFirmwareType.BitcoinOnly
    : EFirmwareType.Universal;
};

export const resolveDeviceBleName = (features?: DeviceFeaturesInput): string | null => {
  if (!features) return null;
  const compatible = asCompatibleFeatures(features);
  return (
    firstNonEmptyString(compatible.bleName, compatible.onekey_ble_name, compatible.ble_name) ?? null
  );
};

export const resolveDeviceFirmwareVersion = (features?: DeviceFeaturesInput): string | null => {
  if (!features) return null;
  const compatible = asCompatibleFeatures(features);
  return firstMeaningfulVersion(
    compatible.firmwareVersion,
    compatible.onekey_firmware_version,
    compatible.onekey_version,
    versionFromParts(compatible.major_version, compatible.minor_version, compatible.patch_version)
  );
};

export const resolveDeviceBootloaderVersion = (features?: DeviceFeaturesInput): string | null => {
  if (!features) return null;
  const compatible = asCompatibleFeatures(features);
  const bootloaderMode = compatible.bootloaderMode ?? compatible.bootloader_mode;
  return firstMeaningfulVersion(
    compatible.bootloaderVersion,
    compatible.onekey_boot_version,
    compatible.bootloader_version,
    compatible.onekey_bootloader_version,
    bootloaderMode
      ? versionFromParts(
          compatible.major_version,
          compatible.minor_version,
          compatible.patch_version
        )
      : null
  );
};

export const resolveDeviceBoardVersion = (features?: DeviceFeaturesInput): string | null => {
  if (!features) return null;
  const compatible = asCompatibleFeatures(features);
  return firstMeaningfulVersion(
    compatible.boardVersion,
    compatible.onekey_board_version,
    compatible.boardloader_version,
    compatible.onekey_romloader_version,
    compatible.romloader_version
  );
};

export const resolveDeviceBleFirmwareVersion = (features?: DeviceFeaturesInput): string | null => {
  if (!features) return null;
  const compatible = asCompatibleFeatures(features);
  return firstMeaningfulVersion(
    compatible.bleVersion,
    compatible.onekey_ble_version,
    compatible.ble_ver,
    compatible.onekey_coprocessor_version
  );
};
