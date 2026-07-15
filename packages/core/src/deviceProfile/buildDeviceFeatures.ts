import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import {
  isProtocolV2BootloaderDeviceInfo,
  isProtocolV2RomloaderDeviceInfo,
} from '../protocols/protocol-v2/features';

import type { DeviceFirmwareImageInfo, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import type { PROTO } from '../constants';
import type { DeviceFeaturesMode, Features } from '../types';

type ProtocolV1FeaturesCompat = PROTO.Features &
  Partial<PROTO.OnekeyFeatures> & {
    protocol_version?: number | null;
    onekey_version?: string;
    onekey_serial?: string;
  };

const getImageVersion = (image?: DeviceFirmwareImageInfo | null) => image?.version ?? null;

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

const getImageBuildId = (image?: DeviceFirmwareImageInfo | null) => image?.build_id ?? undefined;

const getImageHash = (image?: DeviceFirmwareImageInfo | null) => bytesToHex(image?.hash);

const firstValue = <T>(...values: Array<T | null | undefined>) =>
  values.find(value => value !== undefined && value !== null);

const firstMeaningfulVersion = (...versions: Array<string | null | undefined>) =>
  versions.find(version => Boolean(version && version !== '0.0.0')) ?? null;

const versionFromParts = (major?: number | null, minor?: number | null, patch?: number | null) =>
  [major, minor, patch].map(part => Number(part) || 0).join('.');

const getProtocolV1Mode = (features: ProtocolV1FeaturesCompat): Features['mode'] => {
  if (features.bootloader_mode === true) return 'bootloader';
  if (features.initialized === false) return 'notInitialized';
  if (features.initialized === true) return 'normal';
  return 'unknown';
};

const getProtocolV1DeviceType = (features: ProtocolV1FeaturesCompat): Features['deviceType'] => {
  const onekeyDeviceType = features.onekey_device_type as string | null | undefined;
  switch (onekeyDeviceType) {
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
      break;
  }

  const serialNo = features.onekey_serial_no || features.onekey_serial || features.serial_no || '';
  const prefix = serialNo.slice(0, 2).toLowerCase();
  if (prefix === 'bi' || prefix === 'cl') return EDeviceType.Classic;
  if (prefix === 'cp') return EDeviceType.ClassicPure;
  if (prefix === 'mi') return EDeviceType.Mini;
  if (prefix === 'tc') return EDeviceType.Touch;
  if (prefix === 'pr') return EDeviceType.Pro;
  if (prefix === 'p2') return EDeviceType.Pro2;
  if (!serialNo && features.bootloader_mode === true && features.model === '1') {
    return EDeviceType.Classic;
  }
  return EDeviceType.Unknown;
};

const getProtocolV1FirmwareType = (
  features: ProtocolV1FeaturesCompat
): Features['firmwareType'] => {
  if (features.fw_vendor === 'OneKey Bitcoin-only') return EFirmwareType.BitcoinOnly;
  return EFirmwareType.Universal;
};

const getProtocolV1Label = (
  features: ProtocolV1FeaturesCompat,
  deviceType: Features['deviceType'],
  bleName: string | null
) => {
  if (features.label) return features.label;
  if (bleName) return bleName;
  if (deviceType === EDeviceType.Unknown) return null;
  if (deviceType === EDeviceType.ClassicPure) return 'OneKey Classic 1S';
  return `OneKey ${deviceType.charAt(0).toUpperCase()}${deviceType.slice(1)}`;
};

export const buildProtocolV1FeaturesPayload = (
  protocolV1Features: PROTO.Features,
  previous?: Features
): Features => {
  const features = protocolV1Features as ProtocolV1FeaturesCompat;
  const firmwareVersion = firstMeaningfulVersion(
    features.onekey_firmware_version,
    features.onekey_version,
    versionFromParts(features.major_version, features.minor_version, features.patch_version)
  );
  const bootloaderVersion = firstMeaningfulVersion(
    features.onekey_boot_version,
    features.bootloader_version,
    features.bootloader_mode
      ? versionFromParts(features.major_version, features.minor_version, features.patch_version)
      : null
  );
  const boardVersion = firstMeaningfulVersion(
    features.onekey_board_version,
    features.boardloader_version
  );
  const bleVersion = firstMeaningfulVersion(features.onekey_ble_version, features.ble_ver);
  const serialNo = features.onekey_serial_no || features.onekey_serial || features.serial_no || '';
  const bleName = features.onekey_ble_name || features.ble_name || null;
  const deviceType = getProtocolV1DeviceType(features);
  const sessionId = features.session_id ?? previous?.sessionId ?? null;

  return {
    protocol: 'V1',
    protocolVersion: features.protocol_version ?? previous?.protocolVersion ?? 1,
    deviceType,
    firmwareType: getProtocolV1FirmwareType(features),
    model: features.model ?? null,
    vendor: features.vendor ?? null,
    deviceId: features.device_id ?? null,
    serialNo,
    label: getProtocolV1Label(features, deviceType, bleName),
    bleName,
    capabilities: features.capabilities ?? [],
    mode: getProtocolV1Mode(features),
    initialized: features.initialized ?? null,
    bootloaderMode: features.bootloader_mode ?? null,
    unlocked: features.unlocked ?? true,
    firmwarePresent: features.firmware_present ?? null,
    passphraseProtection: features.passphrase_protection ?? null,
    pinProtection: features.pin_protection ?? null,
    backupRequired: features.needs_backup ?? null,
    noBackup: features.no_backup ?? null,
    unfinishedBackup: features.unfinished_backup ?? null,
    recoveryMode: features.recovery_mode ?? null,
    language: features.language ?? null,
    bleEnabled: features.ble_enable ?? null,
    sdCardPresent: features.sd_card_present ?? null,
    sdProtection: features.sd_protection ?? null,
    wipeCodeProtection: features.wipe_code_protection ?? null,
    passphraseAlwaysOnDevice: features.passphrase_always_on_device ?? null,
    safetyChecks: features.safety_checks ?? null,
    autoLockDelayMs: features.auto_lock_delay_ms ?? null,
    displayRotation: features.display_rotation ?? null,
    experimentalFeatures: features.experimental_features ?? null,
    firmwareVersion,
    bootloaderVersion,
    boardVersion,
    bleVersion,
    se01Version: firstMeaningfulVersion(features.onekey_se01_version),
    se02Version: firstMeaningfulVersion(features.onekey_se02_version),
    se03Version: firstMeaningfulVersion(features.onekey_se03_version),
    se04Version: firstMeaningfulVersion(features.onekey_se04_version),
    se01BootVersion: firstMeaningfulVersion(features.onekey_se01_boot_version),
    se02BootVersion: firstMeaningfulVersion(features.onekey_se02_boot_version),
    se03BootVersion: firstMeaningfulVersion(features.onekey_se03_boot_version),
    se04BootVersion: firstMeaningfulVersion(features.onekey_se04_boot_version),
    seVersion: features.se_ver ?? null,
    verify: {
      firmwareBuildId: features.onekey_firmware_build_id,
      firmwareHash: features.onekey_firmware_hash,
      bootloaderBuildId: features.onekey_boot_build_id,
      bootloaderHash: features.onekey_boot_hash,
      boardBuildId: features.onekey_board_build_id,
      boardHash: features.onekey_board_hash,
      bleBuildId: features.onekey_ble_build_id,
      bleHash: features.onekey_ble_hash,
      se01BuildId: features.onekey_se01_build_id,
      se01Hash: features.onekey_se01_hash,
      se02BuildId: features.onekey_se02_build_id,
      se02Hash: features.onekey_se02_hash,
      se03BuildId: features.onekey_se03_build_id,
      se03Hash: features.onekey_se03_hash,
      se04BuildId: features.onekey_se04_build_id,
      se04Hash: features.onekey_se04_hash,
      se01BootBuildId: features.onekey_se01_boot_build_id,
      se01BootHash: features.onekey_se01_boot_hash,
      se02BootBuildId: features.onekey_se02_boot_build_id,
      se02BootHash: features.onekey_se02_boot_hash,
      se03BootBuildId: features.onekey_se03_boot_build_id,
      se03BootHash: features.onekey_se03_boot_hash,
      se04BootBuildId: features.onekey_se04_boot_build_id,
      se04BootHash: features.onekey_se04_boot_hash,
    },
    sessionId,
    raw: {
      protocolV1Features,
    },
  };
};

/**
 * Protocol V2 的结构化 `Features` 构建器。
 *
 * 这是 Device 内部唯一缓存状态。字段只来自 DeviceInfoGet 或前一次 features
 * 缓存的同名字段级合并；不存在协议等价语义的字段保持 null/空值，不再通过
 * DeviceProfile 或 transport path 做身份兜底。
 */
export const buildProtocolV2FeaturesPayload = (
  deviceInfo?: ProtocolV2DeviceInfo,
  previous?: Features
): Features => {
  const info = deviceInfo;
  const fwApplication = info?.fw?.application;
  const fwBootloader = info?.fw?.bootloader;
  const fwBoard = info?.fw?.romloader;
  const bleApplication = info?.coprocessor?.application;
  const status = info?.status;

  const firmwareVersion = firstMeaningfulVersion(
    getImageVersion(fwApplication),
    previous?.firmwareVersion
  );
  const bootloaderVersion = firstMeaningfulVersion(
    getImageVersion(fwBootloader),
    previous?.bootloaderVersion
  );
  const boardVersion = firstMeaningfulVersion(getImageVersion(fwBoard), previous?.boardVersion);
  const bleVersion = firstMeaningfulVersion(getImageVersion(bleApplication), previous?.bleVersion);
  const deviceId = status?.device_id ?? null;
  const serialNo = firstValue(info?.hw?.serial_no, previous?.serialNo) ?? '';
  const label = previous?.label ?? null;
  const bleName = firstValue(info?.coprocessor?.bt_adv_name, previous?.bleName);
  const initialized = firstValue(status?.init_states, previous?.initialized) ?? null;
  const passphraseProtection = status?.passphrase_enabled ?? null;
  const language = previous?.language ?? null;
  const backupRequired = firstValue(status?.backup_required, previous?.backupRequired) ?? null;
  const bleEnabled = previous?.bleEnabled;
  const unlocked = firstValue(status?.unlocked, previous?.unlocked) ?? null;
  const attachToPinEnabled = status?.attach_to_pin_enabled ?? null;
  const unlockedAttachPin = status?.unlocked_by_attach_to_pin ?? undefined;
  const romloaderMode = isProtocolV2RomloaderDeviceInfo(info);
  const bootloaderMode = isProtocolV2BootloaderDeviceInfo(info);
  let mode: DeviceFeaturesMode = 'unknown';
  if (romloaderMode) {
    mode = 'romloader';
  } else if (bootloaderMode) {
    mode = 'bootloader';
  } else if (initialized === false) {
    mode = 'notInitialized';
  } else if (initialized === true) {
    mode = 'normal';
  }

  return {
    protocol: 'V2',
    protocolVersion: deviceInfo?.protocol_version ?? previous?.protocolVersion ?? null,
    deviceType: EDeviceType.Pro2,
    firmwareType: previous?.firmwareType ?? EFirmwareType.Universal,
    model: 'pro2',
    vendor: 'onekey.so',
    deviceId,
    serialNo,
    label,
    bleName: bleName ?? null,
    capabilities: [],
    mode,
    initialized,
    bootloaderMode,
    unlocked,
    firmwarePresent: previous?.firmwarePresent ?? null,
    passphraseProtection,
    pinProtection: null,
    backupRequired,
    noBackup: null,
    unfinishedBackup: null,
    recoveryMode: null,
    language,
    bleEnabled: bleEnabled ?? null,
    sdCardPresent: null,
    sdProtection: null,
    wipeCodeProtection: null,
    passphraseAlwaysOnDevice: null,
    attachToPinEnabled,
    safetyChecks: null,
    autoLockDelayMs: null,
    displayRotation: null,
    experimentalFeatures: null,
    firmwareVersion,
    bootloaderVersion,
    boardVersion,
    bleVersion,
    se01Version: firstMeaningfulVersion(
      getImageVersion(info?.se1?.application),
      previous?.se01Version
    ),
    se02Version: firstMeaningfulVersion(
      getImageVersion(info?.se2?.application),
      previous?.se02Version
    ),
    se03Version: firstMeaningfulVersion(
      getImageVersion(info?.se3?.application),
      previous?.se03Version
    ),
    se04Version: firstMeaningfulVersion(
      getImageVersion(info?.se4?.application),
      previous?.se04Version
    ),
    se01BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se1?.bootloader),
      previous?.se01BootVersion
    ),
    se02BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se2?.bootloader),
      previous?.se02BootVersion
    ),
    se03BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se3?.bootloader),
      previous?.se03BootVersion
    ),
    se04BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se4?.bootloader),
      previous?.se04BootVersion
    ),
    seVersion: previous?.seVersion ?? null,
    verify: {
      firmwareBuildId: getImageBuildId(fwApplication) ?? previous?.verify?.firmwareBuildId,
      firmwareHash: getImageHash(fwApplication) ?? previous?.verify?.firmwareHash,
      bootloaderBuildId: getImageBuildId(fwBootloader) ?? previous?.verify?.bootloaderBuildId,
      bootloaderHash: getImageHash(fwBootloader) ?? previous?.verify?.bootloaderHash,
      boardBuildId: getImageBuildId(fwBoard) ?? previous?.verify?.boardBuildId,
      boardHash: getImageHash(fwBoard) ?? previous?.verify?.boardHash,
      bleBuildId: getImageBuildId(bleApplication) ?? previous?.verify?.bleBuildId,
      bleHash: getImageHash(bleApplication) ?? previous?.verify?.bleHash,
      se01BuildId: getImageBuildId(info?.se1?.application) ?? previous?.verify?.se01BuildId,
      se01Hash: getImageHash(info?.se1?.application) ?? previous?.verify?.se01Hash,
      se02BuildId: getImageBuildId(info?.se2?.application) ?? previous?.verify?.se02BuildId,
      se02Hash: getImageHash(info?.se2?.application) ?? previous?.verify?.se02Hash,
      se03BuildId: getImageBuildId(info?.se3?.application) ?? previous?.verify?.se03BuildId,
      se03Hash: getImageHash(info?.se3?.application) ?? previous?.verify?.se03Hash,
      se04BuildId: getImageBuildId(info?.se4?.application) ?? previous?.verify?.se04BuildId,
      se04Hash: getImageHash(info?.se4?.application) ?? previous?.verify?.se04Hash,
      se01BootBuildId: getImageBuildId(info?.se1?.bootloader) ?? previous?.verify?.se01BootBuildId,
      se01BootHash: getImageHash(info?.se1?.bootloader) ?? previous?.verify?.se01BootHash,
      se02BootBuildId: getImageBuildId(info?.se2?.bootloader) ?? previous?.verify?.se02BootBuildId,
      se02BootHash: getImageHash(info?.se2?.bootloader) ?? previous?.verify?.se02BootHash,
      se03BootBuildId: getImageBuildId(info?.se3?.bootloader) ?? previous?.verify?.se03BootBuildId,
      se03BootHash: getImageHash(info?.se3?.bootloader) ?? previous?.verify?.se03BootHash,
      se04BootBuildId: getImageBuildId(info?.se4?.bootloader) ?? previous?.verify?.se04BootBuildId,
      se04BootHash: getImageHash(info?.se4?.bootloader) ?? previous?.verify?.se04BootHash,
    },
    sessionId: previous?.sessionId ?? null,
    passphraseState: previous?.passphraseState,
    unlockedAttachPin,
    raw: {
      protocolV2DeviceInfo: deviceInfo,
    },
  };
};
