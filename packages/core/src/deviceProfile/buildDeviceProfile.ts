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
import type { DeviceFirmwareImageInfo, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import { isProtocolV2BootloaderDeviceInfo } from '../protocols/protocol-v2/features';

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

const getImageVersion = (image?: DeviceFirmwareImageInfo | null) => image?.version ?? null;

const getImageBuildId = (image?: DeviceFirmwareImageInfo | null) => image?.build_id ?? undefined;

const getImageHash = (image?: DeviceFirmwareImageInfo | null) => bytesToHex(image?.hash);

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
  if (isProtocolV2BootloaderDeviceInfo(deviceInfo)) return 'bootloader';
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

const normalizeV2Versions = (deviceInfo?: ProtocolV2DeviceInfo): DeviceProfileVersions => {
  const info = deviceInfo;
  return {
    firmware: firstMeaningfulVersion(getImageVersion(info?.fw?.application)),
    bootloader: firstMeaningfulVersion(getImageVersion(info?.fw?.bootloader)),
    board: firstMeaningfulVersion(
      getImageVersion(info?.fw?.application_data ?? info?.fw?.romloader)
    ),
    ble: firstMeaningfulVersion(getImageVersion(info?.coprocessor?.application)),
    se01: firstMeaningfulVersion(getImageVersion(info?.se1?.application)),
    se02: firstMeaningfulVersion(getImageVersion(info?.se2?.application)),
    se03: firstMeaningfulVersion(getImageVersion(info?.se3?.application)),
    se04: firstMeaningfulVersion(getImageVersion(info?.se4?.application)),
    se01Boot: firstMeaningfulVersion(getImageVersion(info?.se1?.bootloader)),
    se02Boot: firstMeaningfulVersion(getImageVersion(info?.se2?.bootloader)),
    se03Boot: firstMeaningfulVersion(getImageVersion(info?.se3?.bootloader)),
    se04Boot: firstMeaningfulVersion(getImageVersion(info?.se4?.bootloader)),
  };
};

// V2 状态由 normalizeV2Status 处理，这里只服务 buildProfileFromProtocolV1 的 V1 路径。
const normalizeV1Status = (features?: Features): DeviceInfoStatus => ({
  mode: getDeviceMode(features),
  initialized: features?.initialized ?? null,
  bootloaderMode: features?.bootloaderMode ?? null,
  unlocked: features?.unlocked ?? null,
  passphraseProtection: features?.passphraseProtection ?? null,
  attachToPinEnabled: features?.attachToPinEnabled ?? null,
  unlockedAttachPin: features?.unlockedAttachPin ?? null,
  backupRequired: features?.backupRequired ?? null,
  noBackup: features?.noBackup ?? null,
  language: features?.language ?? null,
  bleEnabled: features?.bleEnabled ?? null,
});

const normalizeV2Status = (deviceInfo?: ProtocolV2DeviceInfo): DeviceInfoStatus => {
  const status = deviceInfo?.status;
  const bootloaderMode = isProtocolV2BootloaderDeviceInfo(deviceInfo);
  return {
    mode: getProtocolV2Mode(deviceInfo),
    initialized: status?.init_states ?? null,
    bootloaderMode,
    unlocked: status?.unlocked ?? null,
    passphraseProtection: status?.passphrase_enabled ?? null,
    attachToPinEnabled: status?.attach_to_pin_enabled ?? null,
    unlockedAttachPin: status?.unlocked_by_attach_to_pin ?? null,
    backupRequired: status?.backup_required ?? null,
    noBackup: null,
    language: null,
    bleEnabled: null,
  };
};

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

const normalizeV2Verify = (deviceInfo?: ProtocolV2DeviceInfo): DeviceProfileVerify => {
  const info = deviceInfo;
  return {
    firmwareBuildId: getImageBuildId(info?.fw?.application),
    firmwareHash: getImageHash(info?.fw?.application),
    bootloaderBuildId: getImageBuildId(info?.fw?.bootloader),
    bootloaderHash: getImageHash(info?.fw?.bootloader),
    boardBuildId: getImageBuildId(info?.fw?.application_data ?? info?.fw?.romloader),
    boardHash: getImageHash(info?.fw?.application_data ?? info?.fw?.romloader),
    bleBuildId: getImageBuildId(info?.coprocessor?.application),
    bleHash: getImageHash(info?.coprocessor?.application),
    se01BuildId: getImageBuildId(info?.se1?.application),
    se01Hash: getImageHash(info?.se1?.application),
    se02BuildId: getImageBuildId(info?.se2?.application),
    se02Hash: getImageHash(info?.se2?.application),
    se03BuildId: getImageBuildId(info?.se3?.application),
    se03Hash: getImageHash(info?.se3?.application),
    se04BuildId: getImageBuildId(info?.se4?.application),
    se04Hash: getImageHash(info?.se4?.application),
    se01BootBuildId: getImageBuildId(info?.se1?.bootloader),
    se01BootHash: getImageHash(info?.se1?.bootloader),
    se02BootBuildId: getImageBuildId(info?.se2?.bootloader),
    se02BootHash: getImageHash(info?.se2?.bootloader),
    se03BootBuildId: getImageBuildId(info?.se3?.bootloader),
    se03BootHash: getImageHash(info?.se3?.bootloader),
    se04BootBuildId: getImageBuildId(info?.se4?.bootloader),
    se04BootHash: getImageHash(info?.se4?.bootloader),
  };
};

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
  const info = deviceInfo;
  const deviceId = info?.status?.device_id || '';
  const serialNo = deviceInfo?.hw?.serial_no || '';
  const label = null;
  const bleName = info?.coprocessor?.bt_adv_name ?? null;
  const verify = normalizeV2Verify(deviceInfo);

  return {
    protocol: 'V2',
    sources,
    deviceType: EDeviceType.Pro2,
    firmwareType: EFirmwareType.Universal,
    deviceId,
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
