import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import { OneKeyDeviceType, OneKeySEState, OneKeySeType } from '@onekeyfe/hd-transport';

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
  /**
   * hw.serial_no 为空时的回退身份（通常传 transport 层的 device path）。
   * 早期 Pro2 工程板没有烧录 serial_no，空 serialNo 会导致设备无法进入
   * DevicePool 的 devices 字典，后续 getDevice(connectId) 必然失败。
   */
  fallbackSerialNo?: string;
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

const getImageVersion = (image?: DevFirmwareImageInfo | null) => image?.version ?? null;

const getImageBuildId = (image?: DevFirmwareImageInfo | null) => image?.build_id ?? undefined;

const getImageHash = (image?: DevFirmwareImageInfo | null) => bytesToHex(image?.hash);

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

// V2 状态由 normalizeV2Status 处理，这里只服务 buildProfileFromProtocolV1 的 V1 路径。
const normalizeV1Status = (features?: Features): DeviceInfoStatus => ({
  mode: getDeviceMode(features),
  initialized: features?.initialized ?? null,
  bootloaderMode: features?.bootloader_mode ?? null,
  unlocked: features?.unlocked ?? null,
  passphraseProtection: features?.passphrase_protection ?? null,
  backupRequired: features?.needs_backup ?? null,
  noBackup: features?.no_backup ?? null,
  language: features?.language ?? null,
  bleEnabled: features?.ble_enable ?? null,
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
): DeviceProfileVerify => ({
  firmwareBuildId: onekeyFeatures?.onekey_firmware_build_id ?? features?.onekey_firmware_build_id,
  firmwareHash: onekeyFeatures?.onekey_firmware_hash ?? features?.onekey_firmware_hash,
  bootloaderBuildId: onekeyFeatures?.onekey_boot_build_id ?? features?.onekey_boot_build_id,
  bootloaderHash: onekeyFeatures?.onekey_boot_hash ?? features?.onekey_boot_hash,
  boardBuildId: onekeyFeatures?.onekey_board_build_id ?? features?.onekey_board_build_id,
  boardHash: onekeyFeatures?.onekey_board_hash ?? features?.onekey_board_hash,
  bleBuildId: onekeyFeatures?.onekey_ble_build_id ?? features?.onekey_ble_build_id,
  bleHash: onekeyFeatures?.onekey_ble_hash ?? features?.onekey_ble_hash,
  se01BuildId: onekeyFeatures?.onekey_se01_build_id ?? features?.onekey_se01_build_id,
  se01Hash: onekeyFeatures?.onekey_se01_hash ?? features?.onekey_se01_hash,
  se02BuildId: onekeyFeatures?.onekey_se02_build_id ?? features?.onekey_se02_build_id,
  se02Hash: onekeyFeatures?.onekey_se02_hash ?? features?.onekey_se02_hash,
  se03BuildId: onekeyFeatures?.onekey_se03_build_id ?? features?.onekey_se03_build_id,
  se03Hash: onekeyFeatures?.onekey_se03_hash ?? features?.onekey_se03_hash,
  se04BuildId: onekeyFeatures?.onekey_se04_build_id ?? features?.onekey_se04_build_id,
  se04Hash: onekeyFeatures?.onekey_se04_hash ?? features?.onekey_se04_hash,
  se01BootBuildId: onekeyFeatures?.onekey_se01_boot_build_id ?? features?.onekey_se01_boot_build_id,
  se01BootHash: onekeyFeatures?.onekey_se01_boot_hash ?? features?.onekey_se01_boot_hash,
  se02BootBuildId: onekeyFeatures?.onekey_se02_boot_build_id ?? features?.onekey_se02_boot_build_id,
  se02BootHash: onekeyFeatures?.onekey_se02_boot_hash ?? features?.onekey_se02_boot_hash,
  se03BootBuildId: onekeyFeatures?.onekey_se03_boot_build_id ?? features?.onekey_se03_boot_build_id,
  se03BootHash: onekeyFeatures?.onekey_se03_boot_hash ?? features?.onekey_se03_boot_hash,
  se04BootBuildId: onekeyFeatures?.onekey_se04_boot_build_id ?? features?.onekey_se04_boot_build_id,
  se04BootHash: onekeyFeatures?.onekey_se04_boot_hash ?? features?.onekey_se04_boot_hash,
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

/**
 * V1 profile 构建用的 features 合并视图。
 *
 * OnekeyFeatures 与 Features 的同名字段（onekey_device_type / onekey_se_type /
 * onekey_se0X_state）wire 同源：传输层解码会把 proto 枚举输出为名称字符串，与
 * Features 侧的 string 声明一致，仅生成类型分别声明为枚举/字符串，这里按
 * Features 的声明显式归一，避免整体 as Features 断言。
 */
const mergeV1Features = (
  features?: Features,
  onekeyFeatures?: OnekeyFeatures
): Features | undefined => {
  if (!features && !onekeyFeatures) return undefined;

  const {
    onekey_device_type: onekeyDeviceType,
    onekey_se_type: onekeySeType,
    onekey_se01_state: onekeySe01State,
    onekey_se02_state: onekeySe02State,
    onekey_se03_state: onekeySe03State,
    onekey_se04_state: onekeySe04State,
    ...restOnekeyFeatures
  } = onekeyFeatures ?? {};

  const toEnumName = (
    enumObject: Record<string | number, string | number>,
    value: number | string | null | undefined
  ): string | null | undefined => {
    if (value == null || typeof value === 'string') return value;
    const label = enumObject[value];
    return typeof label === 'string' ? label : String(value);
  };

  return {
    // 仅 onekeyFeatures 的场景没有完整 Features 底座（与历史 as Features 行为一致，
    // 该路径目前没有调用方触达：两处调用都至少携带 features）。
    ...((features ?? {}) as Features),
    ...restOnekeyFeatures,
    ...(onekeyDeviceType !== undefined
      ? { onekey_device_type: toEnumName(OneKeyDeviceType, onekeyDeviceType) }
      : {}),
    ...(onekeySeType !== undefined
      ? { onekey_se_type: toEnumName(OneKeySeType, onekeySeType) }
      : {}),
    ...(onekeySe01State !== undefined
      ? { onekey_se01_state: toEnumName(OneKeySEState, onekeySe01State) }
      : {}),
    ...(onekeySe02State !== undefined
      ? { onekey_se02_state: toEnumName(OneKeySEState, onekeySe02State) }
      : {}),
    ...(onekeySe03State !== undefined
      ? { onekey_se03_state: toEnumName(OneKeySEState, onekeySe03State) }
      : {}),
    ...(onekeySe04State !== undefined
      ? { onekey_se04_state: toEnumName(OneKeySEState, onekeySe04State) }
      : {}),
  };
};

export function buildProfileFromProtocolV1({
  protocol = 'V1',
  features,
  onekeyFeatures,
  sources = ['features'],
  scope = 'basic',
  includeRaw = false,
}: BuildProtocolV1ProfileParams): DeviceProfile {
  const sourceFeatures = mergeV1Features(features, onekeyFeatures);
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
    status: normalizeV1Status(sourceFeatures),
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
  fallbackSerialNo,
}: BuildProtocolV2ProfileParams): DeviceProfile {
  // 早期工程板 hw.serial_no 为空串，回退到调用方提供的 transport path（mock 身份）。
  const serialNo = deviceInfo?.hw?.serial_no || fallbackSerialNo || '';
  const label = deviceInfo?.status?.label ?? null;
  const bleName = deviceInfo?.bt?.adv_name ?? null;
  const verify = normalizeV2Verify(deviceInfo);

  return {
    protocol: 'V2',
    sources,
    deviceType: EDeviceType.Pro2,
    firmwareType: EFirmwareType.Universal,
    // Protocol V2 的 DevGetDeviceInfo 没有 device_id 字段（固件 proto 仅提供 hw.serial_no），
    // 这里只能回退 serialNo。注意语义差异：V1 的 device_id 随擦除/换种子轮换，serialNo 永不变化。
    // 固件在 DevStatus 暴露 device_id 后，此处必须改为读取它，否则 wipe 后基于 deviceId 的
    // session 缓存（deviceSessionCache）不会自然失效。
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
