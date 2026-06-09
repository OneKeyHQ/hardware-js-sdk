import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import {
  getDeviceBLEFirmwareVersion,
  getDeviceBoardloaderVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../utils/deviceVersionUtils';
import {
  getDeviceBleName,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
} from '../utils/deviceInfoUtils';

import type {
  DeviceInfoProtocol,
  DeviceInfoSource,
  DeviceInfoStatus,
  DeviceProfile,
  GetDeviceInfoParams,
  DeviceProfileRaw,
  DeviceProfileVerify,
  DeviceProfileVersions,
} from '../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../types';
import type { ProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';

type BuildProtocolV1ProfileParams = {
  protocol?: DeviceInfoProtocol;
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  sources?: DeviceInfoSource[];
  scope?: GetDeviceInfoParams['scope'];
  includeRaw?: boolean;
};

type BuildProtocolV2ProfileParams = {
  deviceInfo?: ProtocolV2DeviceInfo;
  sources?: DeviceInfoSource[];
  scope?: GetDeviceInfoParams['scope'];
  includeRaw?: boolean;
};

type ProtocolV2Bytes = Uint8Array | number[] | string;

type ProtocolV2FirmwareImageInfo = {
  version?: string;
  build_id?: string;
  hash?: ProtocolV2Bytes;
};

type ProtocolV2SEInfo = {
  boot?: ProtocolV2FirmwareImageInfo;
  app?: ProtocolV2FirmwareImageInfo;
  state?: number;
};

const isMeaningfulVersion = (version?: string | null) => Boolean(version && version !== '0.0.0');

const firstVersion = (...versions: Array<string | null | undefined>) =>
  versions.find(isMeaningfulVersion) ?? null;

const versionArrayToString = (version?: Array<number | string | null> | null) => {
  if (!version || version.length === 0) return null;
  const value = version.join('.');
  return isMeaningfulVersion(value) ? value : null;
};

const bytesToHex = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  if (Array.isArray(value)) {
    return value.map(byte => Number(byte).toString(16).padStart(2, '0')).join('');
  }
  return undefined;
};

const getImageVersion = (image?: ProtocolV2FirmwareImageInfo | null) => image?.version ?? null;

const getImageBuildId = (image?: ProtocolV2FirmwareImageInfo | null) =>
  image?.build_id ?? undefined;

const getImageHash = (image?: ProtocolV2FirmwareImageInfo | null) => bytesToHex(image?.hash);

const getSeState = (se?: ProtocolV2SEInfo | null) => {
  switch (se?.state) {
    case 0:
      return 'BOOT';
    case 51:
      return 'APP_FACTORY';
    case 85:
      return 'APP';
    default:
      return null;
  }
};

const shouldIncludeVerify = (scope?: GetDeviceInfoParams['scope']) =>
  scope === 'verify' || scope === 'full';

const getDeviceMode = (features?: Features): DeviceInfoStatus['mode'] => {
  if (!features) return 'unknown';
  if (features.bootloader_mode === true) return 'bootloader';
  if (features.initialized === false) return 'notInitialized';
  if (features.initialized === true) return 'normal';
  return 'unknown';
};

const getProtocolV2Mode = (deviceInfo?: ProtocolV2DeviceInfo): DeviceInfoStatus['mode'] => {
  const initialized = deviceInfo?.status?.init_states;
  if (initialized === false) return 'notInitialized';
  if (initialized === true) return 'normal';
  return 'unknown';
};

const normalizeV1Versions = (
  features?: Features,
  onekeyFeatures?: OnekeyFeatures
): DeviceProfileVersions => ({
  firmware: firstVersion(
    onekeyFeatures?.onekey_firmware_version,
    versionArrayToString(getDeviceFirmwareVersion(features))
  ),
  bootloader: firstVersion(
    onekeyFeatures?.onekey_boot_version,
    versionArrayToString(getDeviceBootloaderVersion(features))
  ),
  board: firstVersion(
    onekeyFeatures?.onekey_board_version,
    versionArrayToString(features ? getDeviceBoardloaderVersion(features) : undefined)
  ),
  ble: firstVersion(
    onekeyFeatures?.onekey_ble_version,
    features?.onekey_ble_version,
    features?.ble_ver,
    versionArrayToString(features ? getDeviceBLEFirmwareVersion(features) : undefined)
  ),
  se01: firstVersion(onekeyFeatures?.onekey_se01_version, features?.onekey_se01_version),
  se02: firstVersion(onekeyFeatures?.onekey_se02_version, features?.onekey_se02_version),
  se03: firstVersion(onekeyFeatures?.onekey_se03_version, features?.onekey_se03_version),
  se04: firstVersion(onekeyFeatures?.onekey_se04_version, features?.onekey_se04_version),
  se01Boot: firstVersion(
    onekeyFeatures?.onekey_se01_boot_version,
    features?.onekey_se01_boot_version
  ),
  se02Boot: firstVersion(
    onekeyFeatures?.onekey_se02_boot_version,
    features?.onekey_se02_boot_version
  ),
  se03Boot: firstVersion(
    onekeyFeatures?.onekey_se03_boot_version,
    features?.onekey_se03_boot_version
  ),
  se04Boot: firstVersion(
    onekeyFeatures?.onekey_se04_boot_version,
    features?.onekey_se04_boot_version
  ),
});

const normalizeV2Versions = (deviceInfo?: ProtocolV2DeviceInfo): DeviceProfileVersions => ({
  firmware: firstVersion(getImageVersion(deviceInfo?.fw?.app)),
  bootloader: firstVersion(getImageVersion(deviceInfo?.fw?.boot)),
  board: firstVersion(getImageVersion(deviceInfo?.fw?.board)),
  ble: firstVersion(getImageVersion(deviceInfo?.bt?.app)),
  se01: firstVersion(getImageVersion(deviceInfo?.se1?.app)),
  se02: firstVersion(getImageVersion(deviceInfo?.se2?.app)),
  se03: firstVersion(getImageVersion(deviceInfo?.se3?.app)),
  se04: firstVersion(getImageVersion(deviceInfo?.se4?.app)),
  se01Boot: firstVersion(getImageVersion(deviceInfo?.se1?.boot)),
  se02Boot: firstVersion(getImageVersion(deviceInfo?.se2?.boot)),
  se03Boot: firstVersion(getImageVersion(deviceInfo?.se3?.boot)),
  se04Boot: firstVersion(getImageVersion(deviceInfo?.se4?.boot)),
});

const normalizeV1Status = (
  protocol: DeviceInfoProtocol,
  features?: Features
): DeviceInfoStatus => ({
  mode: getDeviceMode(features),
  initialized: features?.initialized ?? null,
  bootloaderMode: features?.bootloader_mode ?? null,
  unlocked: protocol === 'V2' ? null : features?.unlocked ?? null,
  passphraseProtection: features?.passphrase_protection ?? null,
  backupRequired: features?.needs_backup ?? null,
  noBackup: features?.no_backup ?? null,
  language: features?.language ?? null,
  bleEnabled: (features as { ble_enable?: boolean } | undefined)?.ble_enable ?? null,
});

const normalizeV2Status = (deviceInfo?: ProtocolV2DeviceInfo): DeviceInfoStatus => ({
  mode: getProtocolV2Mode(deviceInfo),
  initialized: deviceInfo?.status?.init_states ?? null,
  bootloaderMode: false,
  unlocked: null,
  passphraseProtection: deviceInfo?.status?.passphrase_protection ?? null,
  backupRequired: deviceInfo?.status?.backup_required ?? null,
  noBackup: null,
  language: deviceInfo?.status?.language ?? null,
  bleEnabled: deviceInfo?.status?.bt_enable ?? null,
});

const normalizeV1Verify = (
  features?: Features,
  onekeyFeatures?: OnekeyFeatures
): DeviceProfileVerify => {
  const featureRecord = features as Record<string, string | undefined> | undefined;
  return {
    firmwareBuildId: onekeyFeatures?.onekey_firmware_build_id ?? features?.onekey_firmware_build_id,
    firmwareHash: onekeyFeatures?.onekey_firmware_hash ?? features?.onekey_firmware_hash,
    bootloaderBuildId: onekeyFeatures?.onekey_boot_build_id ?? features?.onekey_boot_build_id,
    bootloaderHash: onekeyFeatures?.onekey_boot_hash ?? features?.onekey_boot_hash,
    boardBuildId: onekeyFeatures?.onekey_board_build_id ?? featureRecord?.onekey_board_build_id,
    boardHash: onekeyFeatures?.onekey_board_hash ?? features?.onekey_board_hash,
    bleBuildId: onekeyFeatures?.onekey_ble_build_id ?? features?.onekey_ble_build_id,
    bleHash: onekeyFeatures?.onekey_ble_hash ?? features?.onekey_ble_hash,
    se01BuildId: onekeyFeatures?.onekey_se01_build_id ?? features?.onekey_se01_build_id,
    se01Hash: onekeyFeatures?.onekey_se01_hash ?? featureRecord?.onekey_se01_hash,
    se02BuildId: onekeyFeatures?.onekey_se02_build_id ?? featureRecord?.onekey_se02_build_id,
    se02Hash: onekeyFeatures?.onekey_se02_hash ?? featureRecord?.onekey_se02_hash,
    se03BuildId: onekeyFeatures?.onekey_se03_build_id ?? featureRecord?.onekey_se03_build_id,
    se03Hash: onekeyFeatures?.onekey_se03_hash ?? featureRecord?.onekey_se03_hash,
    se04BuildId: onekeyFeatures?.onekey_se04_build_id ?? featureRecord?.onekey_se04_build_id,
    se04Hash: onekeyFeatures?.onekey_se04_hash ?? featureRecord?.onekey_se04_hash,
    se01BootBuildId:
      onekeyFeatures?.onekey_se01_boot_build_id ?? features?.onekey_se01_boot_build_id,
    se01BootHash: onekeyFeatures?.onekey_se01_boot_hash ?? features?.onekey_se01_boot_hash,
    se02BootBuildId:
      onekeyFeatures?.onekey_se02_boot_build_id ?? features?.onekey_se02_boot_build_id,
    se02BootHash: onekeyFeatures?.onekey_se02_boot_hash ?? features?.onekey_se02_boot_hash,
    se03BootBuildId:
      onekeyFeatures?.onekey_se03_boot_build_id ?? features?.onekey_se03_boot_build_id,
    se03BootHash: onekeyFeatures?.onekey_se03_boot_hash ?? features?.onekey_se03_boot_hash,
    se04BootBuildId:
      onekeyFeatures?.onekey_se04_boot_build_id ?? features?.onekey_se04_boot_build_id,
    se04BootHash: onekeyFeatures?.onekey_se04_boot_hash ?? features?.onekey_se04_boot_hash,
  };
};

const normalizeV2Verify = (deviceInfo?: ProtocolV2DeviceInfo): DeviceProfileVerify => ({
  firmwareBuildId: getImageBuildId(deviceInfo?.fw?.app),
  firmwareHash: getImageHash(deviceInfo?.fw?.app),
  bootloaderBuildId: getImageBuildId(deviceInfo?.fw?.boot),
  bootloaderHash: getImageHash(deviceInfo?.fw?.boot),
  boardBuildId: getImageBuildId(deviceInfo?.fw?.board),
  boardHash: getImageHash(deviceInfo?.fw?.board),
  bleBuildId: getImageBuildId(deviceInfo?.bt?.app),
  bleHash: getImageHash(deviceInfo?.bt?.app),
  se01BuildId: getImageBuildId(deviceInfo?.se1?.app),
  se01Hash: getImageHash(deviceInfo?.se1?.app),
  se02BuildId: getImageBuildId(deviceInfo?.se2?.app),
  se02Hash: getImageHash(deviceInfo?.se2?.app),
  se03BuildId: getImageBuildId(deviceInfo?.se3?.app),
  se03Hash: getImageHash(deviceInfo?.se3?.app),
  se04BuildId: getImageBuildId(deviceInfo?.se4?.app),
  se04Hash: getImageHash(deviceInfo?.se4?.app),
  se01BootBuildId: getImageBuildId(deviceInfo?.se1?.boot),
  se01BootHash: getImageHash(deviceInfo?.se1?.boot),
  se02BootBuildId: getImageBuildId(deviceInfo?.se2?.boot),
  se02BootHash: getImageHash(deviceInfo?.se2?.boot),
  se03BootBuildId: getImageBuildId(deviceInfo?.se3?.boot),
  se03BootHash: getImageHash(deviceInfo?.se3?.boot),
  se04BootBuildId: getImageBuildId(deviceInfo?.se4?.boot),
  se04BootHash: getImageHash(deviceInfo?.se4?.boot),
});

const normalizeRaw = ({
  features,
  onekeyFeatures,
  protocolV2DeviceInfo,
}: {
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
}): DeviceProfileRaw => ({
  ...(features ? { features } : {}),
  ...(onekeyFeatures ? { onekeyFeatures } : {}),
  ...(protocolV2DeviceInfo ? { protocolV2DeviceInfo } : {}),
});

export function buildProfileFromProtocolV1({
  protocol = 'V1',
  features,
  onekeyFeatures,
  sources = ['features'],
  scope = 'basic',
  includeRaw = false,
}: BuildProtocolV1ProfileParams): DeviceProfile {
  const mergedFeatures = {
    ...(features ?? {}),
    ...(onekeyFeatures ?? {}),
  } as Features;
  const hasFeatures = Boolean(features || onekeyFeatures);
  const sourceFeatures = hasFeatures ? mergedFeatures : undefined;
  const verify = normalizeV1Verify(sourceFeatures, onekeyFeatures);

  return {
    protocol,
    sources,
    deviceType: getDeviceType(sourceFeatures),
    firmwareType: getFirmwareType(sourceFeatures),
    deviceId: sourceFeatures?.device_id || (sourceFeatures ? getDeviceUUID(sourceFeatures) : ''),
    serialNo: sourceFeatures ? getDeviceUUID(sourceFeatures) : '',
    label: getDeviceLabel(sourceFeatures),
    bleName: getDeviceBleName(sourceFeatures),
    status: normalizeV1Status(protocol, sourceFeatures),
    versions: normalizeV1Versions(sourceFeatures, onekeyFeatures),
    ...(shouldIncludeVerify(scope) ? { verify } : {}),
    ...(includeRaw
      ? {
          raw: normalizeRaw({
            features,
            onekeyFeatures,
          }),
        }
      : {}),
  };
}

export function buildProfileFromProtocolV2({
  deviceInfo,
  sources = ['deviceInfo'],
  scope = 'basic',
  includeRaw = false,
}: BuildProtocolV2ProfileParams): DeviceProfile {
  const serialNo = deviceInfo?.hw?.serial_no ?? '';
  const label = deviceInfo?.status?.label ?? null;
  const bleName = deviceInfo?.bt?.adv_name ?? null;
  const verify = normalizeV2Verify(deviceInfo);

  return {
    protocol: 'V2',
    sources,
    deviceType: EDeviceType.Pro2,
    firmwareType: EFirmwareType.Universal,
    deviceId: serialNo,
    serialNo,
    label,
    bleName,
    status: normalizeV2Status(deviceInfo),
    versions: normalizeV2Versions(deviceInfo),
    ...(shouldIncludeVerify(scope) ? { verify } : {}),
    ...(includeRaw
      ? {
          raw: normalizeRaw({
            protocolV2DeviceInfo: deviceInfo,
          }),
        }
      : {}),
  };
}

export const getProtocolV2SeState = getSeState;
