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
  DeviceProfileRaw,
  DeviceProfileVerify,
  DeviceProfileVersions,
  GetDeviceInfoParams,
} from '../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../types';
import type { DevFirmwareImageInfo, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

type BuildProtocolV1ProfileParams = {
  protocol?: DeviceInfoProtocol;
  features?: Features;
  protocolV1OneKeyFeatures?: OnekeyFeatures;
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

const isMeaningfulVersion = (version?: string | null) => Boolean(version && version !== '0.0.0');

const firstMeaningfulVersion = (...versions: Array<string | null | undefined>) =>
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

const getImageVersion = (image?: DevFirmwareImageInfo | null) => image?.version ?? null;

const getImageBuildId = (image?: DevFirmwareImageInfo | null) => image?.build_id ?? undefined;

const getImageHash = (image?: DevFirmwareImageInfo | null) => bytesToHex(image?.hash);

const shouldIncludeVerify = (scope?: GetDeviceInfoParams['scope']) =>
  scope === 'verify' || scope === 'full';

const getDeviceMode = (features?: Features): DeviceInfoStatus['mode'] => {
  if (!features) return 'unknown';
  if (features.bootloaderMode === true) return 'bootloader';
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
  protocolV1OneKeyFeatures?: OnekeyFeatures
): DeviceProfileVersions => ({
  firmware: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_firmware_version,
    versionArrayToString(getDeviceFirmwareVersion(features))
  ),
  bootloader: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_boot_version,
    versionArrayToString(getDeviceBootloaderVersion(features))
  ),
  board: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_board_version,
    versionArrayToString(features ? getDeviceBoardloaderVersion(features) : undefined)
  ),
  ble: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_ble_version,
    features?.bleVersion,
    versionArrayToString(features ? getDeviceBLEFirmwareVersion(features) : undefined)
  ),
  se01: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se01_version,
    features?.se01Version
  ),
  se02: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se02_version,
    features?.se02Version
  ),
  se03: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se03_version,
    features?.se03Version
  ),
  se04: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se04_version,
    features?.se04Version
  ),
  se01Boot: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se01_boot_version,
    features?.se01BootVersion
  ),
  se02Boot: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se02_boot_version,
    features?.se02BootVersion
  ),
  se03Boot: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se03_boot_version,
    features?.se03BootVersion
  ),
  se04Boot: firstMeaningfulVersion(
    protocolV1OneKeyFeatures?.onekey_se04_boot_version,
    features?.se04BootVersion
  ),
});

const normalizeV2Versions = (deviceInfo?: ProtocolV2DeviceInfo): DeviceProfileVersions => ({
  firmware: firstMeaningfulVersion(getImageVersion(deviceInfo?.fw?.app)),
  bootloader: firstMeaningfulVersion(getImageVersion(deviceInfo?.fw?.boot)),
  board: firstMeaningfulVersion(getImageVersion(deviceInfo?.fw?.board)),
  ble: firstMeaningfulVersion(getImageVersion(deviceInfo?.bt?.app)),
  se01: firstMeaningfulVersion(getImageVersion(deviceInfo?.se1?.app)),
  se02: firstMeaningfulVersion(getImageVersion(deviceInfo?.se2?.app)),
  se03: firstMeaningfulVersion(getImageVersion(deviceInfo?.se3?.app)),
  se04: firstMeaningfulVersion(getImageVersion(deviceInfo?.se4?.app)),
  se01Boot: firstMeaningfulVersion(getImageVersion(deviceInfo?.se1?.boot)),
  se02Boot: firstMeaningfulVersion(getImageVersion(deviceInfo?.se2?.boot)),
  se03Boot: firstMeaningfulVersion(getImageVersion(deviceInfo?.se3?.boot)),
  se04Boot: firstMeaningfulVersion(getImageVersion(deviceInfo?.se4?.boot)),
});

// V2 状态由 normalizeV2Status 处理，这里只服务 buildProfileFromProtocolV1 的 V1 路径。
const normalizeV1Status = (features?: Features): DeviceInfoStatus => ({
  mode: getDeviceMode(features),
  initialized: features?.initialized ?? null,
  bootloaderMode: features?.bootloaderMode ?? null,
  unlocked: features?.unlocked ?? null,
  passphraseProtection: features?.passphraseProtection ?? null,
  backupRequired: features?.backupRequired ?? null,
  noBackup: features?.noBackup ?? null,
  language: features?.language ?? null,
  bleEnabled: features?.bleEnabled ?? null,
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
  protocolV1OneKeyFeatures?: OnekeyFeatures
): DeviceProfileVerify => ({
  firmwareBuildId:
    protocolV1OneKeyFeatures?.onekey_firmware_build_id ?? features?.verify?.firmwareBuildId,
  firmwareHash: protocolV1OneKeyFeatures?.onekey_firmware_hash ?? features?.verify?.firmwareHash,
  bootloaderBuildId:
    protocolV1OneKeyFeatures?.onekey_boot_build_id ?? features?.verify?.bootloaderBuildId,
  bootloaderHash: protocolV1OneKeyFeatures?.onekey_boot_hash ?? features?.verify?.bootloaderHash,
  boardBuildId: protocolV1OneKeyFeatures?.onekey_board_build_id ?? features?.verify?.boardBuildId,
  boardHash: protocolV1OneKeyFeatures?.onekey_board_hash ?? features?.verify?.boardHash,
  bleBuildId: protocolV1OneKeyFeatures?.onekey_ble_build_id ?? features?.verify?.bleBuildId,
  bleHash: protocolV1OneKeyFeatures?.onekey_ble_hash ?? features?.verify?.bleHash,
  se01BuildId: protocolV1OneKeyFeatures?.onekey_se01_build_id ?? features?.verify?.se01BuildId,
  se01Hash: protocolV1OneKeyFeatures?.onekey_se01_hash ?? features?.verify?.se01Hash,
  se02BuildId: protocolV1OneKeyFeatures?.onekey_se02_build_id ?? features?.verify?.se02BuildId,
  se02Hash: protocolV1OneKeyFeatures?.onekey_se02_hash ?? features?.verify?.se02Hash,
  se03BuildId: protocolV1OneKeyFeatures?.onekey_se03_build_id ?? features?.verify?.se03BuildId,
  se03Hash: protocolV1OneKeyFeatures?.onekey_se03_hash ?? features?.verify?.se03Hash,
  se04BuildId: protocolV1OneKeyFeatures?.onekey_se04_build_id ?? features?.verify?.se04BuildId,
  se04Hash: protocolV1OneKeyFeatures?.onekey_se04_hash ?? features?.verify?.se04Hash,
  se01BootBuildId:
    protocolV1OneKeyFeatures?.onekey_se01_boot_build_id ?? features?.verify?.se01BootBuildId,
  se01BootHash: protocolV1OneKeyFeatures?.onekey_se01_boot_hash ?? features?.verify?.se01BootHash,
  se02BootBuildId:
    protocolV1OneKeyFeatures?.onekey_se02_boot_build_id ?? features?.verify?.se02BootBuildId,
  se02BootHash: protocolV1OneKeyFeatures?.onekey_se02_boot_hash ?? features?.verify?.se02BootHash,
  se03BootBuildId:
    protocolV1OneKeyFeatures?.onekey_se03_boot_build_id ?? features?.verify?.se03BootBuildId,
  se03BootHash: protocolV1OneKeyFeatures?.onekey_se03_boot_hash ?? features?.verify?.se03BootHash,
  se04BootBuildId:
    protocolV1OneKeyFeatures?.onekey_se04_boot_build_id ?? features?.verify?.se04BootBuildId,
  se04BootHash: protocolV1OneKeyFeatures?.onekey_se04_boot_hash ?? features?.verify?.se04BootHash,
});

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
  protocolV1OneKeyFeatures,
  protocolV2DeviceInfo,
}: {
  features?: Features;
  protocolV1OneKeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
}): DeviceProfileRaw => ({
  ...(features ? { features } : {}),
  ...(protocolV1OneKeyFeatures ? { protocolV1OneKeyFeatures } : {}),
  ...(protocolV2DeviceInfo ? { protocolV2DeviceInfo } : {}),
});

export function buildProfileFromProtocolV1({
  protocol = 'V1',
  features,
  protocolV1OneKeyFeatures,
  sources = ['features'],
  scope = 'basic',
  includeRaw = false,
}: BuildProtocolV1ProfileParams): DeviceProfile {
  const sourceFeatures = features;
  const verify = normalizeV1Verify(sourceFeatures, protocolV1OneKeyFeatures);

  return {
    protocol,
    sources,
    deviceType: getDeviceType(sourceFeatures),
    firmwareType: getFirmwareType(sourceFeatures),
    deviceId: sourceFeatures?.deviceId || (sourceFeatures ? getDeviceUUID(sourceFeatures) : ''),
    serialNo: sourceFeatures ? getDeviceUUID(sourceFeatures) : '',
    label: getDeviceLabel(sourceFeatures),
    bleName: getDeviceBleName(sourceFeatures),
    status: normalizeV1Status(sourceFeatures),
    versions: normalizeV1Versions(sourceFeatures, protocolV1OneKeyFeatures),
    ...(shouldIncludeVerify(scope) ? { verify } : {}),
    ...(includeRaw
      ? {
          raw: normalizeRaw({
            features,
            protocolV1OneKeyFeatures,
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
  const serialNo = deviceInfo?.hw?.serial_no || '';
  const label = deviceInfo?.status?.label ?? null;
  const bleName = deviceInfo?.bt?.adv_name ?? null;
  const verify = normalizeV2Verify(deviceInfo);

  return {
    protocol: 'V2',
    sources,
    deviceType: EDeviceType.Pro2,
    firmwareType: EFirmwareType.Universal,
    // Protocol V2 的 DevGetDeviceInfo 没有 device_id 字段；serialNo 与 deviceId
    // 不是等价语义，这里保持空值，避免把稳定硬件序列号误当会随 wipe 轮换的身份。
    deviceId: '',
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
