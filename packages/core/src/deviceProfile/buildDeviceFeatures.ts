import {
  EDeviceType,
  EFirmwareType,
  canonicalizePro2BleAdvertisementName,
} from '@onekeyfe/hd-shared';

import {
  resolveDeviceBleFirmwareVersion,
  resolveDeviceBleName,
  resolveDeviceBoardVersion,
  resolveDeviceBootloaderVersion,
  resolveDeviceFirmwareType,
  resolveDeviceFirmwareVersion,
  resolveDeviceSerialNo,
  resolveDeviceType,
} from '../utils/deviceFeaturesCompat';
import { normalizeSafetyCheckLevel } from '../utils/deviceSettings';
import { resolveProtocolV2DeviceIdentity } from './protocolV2DeviceIdentity';

import type {
  DeviceFirmwareImageInfo,
  DeviceStatus,
  ProtocolV2DeviceInfo,
} from '@onekeyfe/hd-transport';
import type { PROTO } from '../constants';
import type { ProtocolV2RuntimeMode } from '../protocols/protocol-v2/features';
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

const getProtocolV1Mode = (features: ProtocolV1FeaturesCompat): Features['mode'] => {
  if (features.bootloader_mode === true) return 'bootloader';
  if (features.initialized === false) return 'notInitialized';
  if (features.no_backup === true) return 'backupMode';
  return 'normal';
};

const getProtocolV1Label = (features: ProtocolV1FeaturesCompat) =>
  typeof features.label === 'string' && features.label.length > 0 ? features.label : null;

export const buildProtocolV1FeaturesPayload = (
  protocolV1Features: PROTO.Features,
  previous?: Features
): Features => {
  const features = protocolV1Features as ProtocolV1FeaturesCompat;
  const firmwareVersion = firstMeaningfulVersion(
    resolveDeviceFirmwareVersion(features),
    previous?.firmwareVersion
  );
  const bootloaderVersion = firstMeaningfulVersion(
    resolveDeviceBootloaderVersion(features),
    previous?.bootloaderVersion
  );
  const boardVersion = firstMeaningfulVersion(
    resolveDeviceBoardVersion(features),
    previous?.boardVersion
  );
  const bleVersion = firstMeaningfulVersion(
    resolveDeviceBleFirmwareVersion(features),
    previous?.bleVersion
  );
  const serialNo = resolveDeviceSerialNo(features);
  const bleName = resolveDeviceBleName(features);
  const deviceType = resolveDeviceType(features);
  const sessionId = features.session_id ?? previous?.sessionId ?? null;

  return {
    ...features,
    protocol: 'V1',
    protocolVersion: features.protocol_version ?? previous?.protocolVersion ?? 1,
    deviceType,
    firmwareType: resolveDeviceFirmwareType(features),
    model: features.model ?? null,
    vendor: features.vendor ?? null,
    deviceId: features.device_id ?? null,
    serialNo,
    label: getProtocolV1Label(features),
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
    attachToPinEnabled: features.attach_to_pin_user ?? previous?.attachToPinEnabled ?? null,
    unlockedAttachPin: features.unlocked_attach_pin ?? previous?.unlockedAttachPin ?? undefined,
    safetyChecks: normalizeSafetyCheckLevel(features.safety_checks) ?? null,
    autoLockDelayMs: features.auto_lock_delay_ms ?? null,
    autoShutdownDelayMs: features.auto_shutdown_delay_ms ?? null,
    displayRotation: features.display_rotation ?? null,
    experimentalFeatures: features.experimental_features ?? null,
    wallpaperPath: previous?.wallpaperPath ?? null,
    brightness: features.brightness_prcent ?? previous?.brightness ?? null,
    animationEnabled: previous?.animationEnabled ?? null,
    tapToWake: previous?.tapToWake ?? null,
    hapticFeedback: features.haptic_feedback ?? previous?.hapticFeedback ?? null,
    deviceNameDisplayEnabled: previous?.deviceNameDisplayEnabled ?? null,
    airgapMode: previous?.airgapMode ?? null,
    fidoEnabled: previous?.fidoEnabled ?? null,
    usbLockEnabled: previous?.usbLockEnabled ?? null,
    randomKeypad: previous?.randomKeypad ?? null,
    firmwareVersion,
    bootloaderVersion,
    boardVersion,
    bleVersion,
    se01Version: firstMeaningfulVersion(features.onekey_se01_version, previous?.se01Version),
    se02Version: firstMeaningfulVersion(features.onekey_se02_version, previous?.se02Version),
    se03Version: firstMeaningfulVersion(features.onekey_se03_version, previous?.se03Version),
    se04Version: firstMeaningfulVersion(features.onekey_se04_version, previous?.se04Version),
    se01BootVersion: firstMeaningfulVersion(
      features.onekey_se01_boot_version,
      previous?.se01BootVersion
    ),
    se02BootVersion: firstMeaningfulVersion(
      features.onekey_se02_boot_version,
      previous?.se02BootVersion
    ),
    se03BootVersion: firstMeaningfulVersion(
      features.onekey_se03_boot_version,
      previous?.se03BootVersion
    ),
    se04BootVersion: firstMeaningfulVersion(
      features.onekey_se04_boot_version,
      previous?.se04BootVersion
    ),
    seVersion: features.se_ver ?? previous?.seVersion ?? null,
    verify: {
      firmwareBuildId: features.onekey_firmware_build_id ?? previous?.verify?.firmwareBuildId,
      firmwareHash: features.onekey_firmware_hash ?? previous?.verify?.firmwareHash,
      bootloaderBuildId: features.onekey_boot_build_id ?? previous?.verify?.bootloaderBuildId,
      bootloaderHash: features.onekey_boot_hash ?? previous?.verify?.bootloaderHash,
      boardBuildId: features.onekey_board_build_id ?? previous?.verify?.boardBuildId,
      boardHash: features.onekey_board_hash ?? previous?.verify?.boardHash,
      bleBuildId: features.onekey_ble_build_id ?? previous?.verify?.bleBuildId,
      bleHash: features.onekey_ble_hash ?? previous?.verify?.bleHash,
      se01BuildId: features.onekey_se01_build_id ?? previous?.verify?.se01BuildId,
      se01Hash: features.onekey_se01_hash ?? previous?.verify?.se01Hash,
      se02BuildId: features.onekey_se02_build_id ?? previous?.verify?.se02BuildId,
      se02Hash: features.onekey_se02_hash ?? previous?.verify?.se02Hash,
      se03BuildId: features.onekey_se03_build_id ?? previous?.verify?.se03BuildId,
      se03Hash: features.onekey_se03_hash ?? previous?.verify?.se03Hash,
      se04BuildId: features.onekey_se04_build_id ?? previous?.verify?.se04BuildId,
      se04Hash: features.onekey_se04_hash ?? previous?.verify?.se04Hash,
      se01BootBuildId: features.onekey_se01_boot_build_id ?? previous?.verify?.se01BootBuildId,
      se01BootHash: features.onekey_se01_boot_hash ?? previous?.verify?.se01BootHash,
      se02BootBuildId: features.onekey_se02_boot_build_id ?? previous?.verify?.se02BootBuildId,
      se02BootHash: features.onekey_se02_boot_hash ?? previous?.verify?.se02BootHash,
      se03BootBuildId: features.onekey_se03_boot_build_id ?? previous?.verify?.se03BootBuildId,
      se03BootHash: features.onekey_se03_boot_hash ?? previous?.verify?.se03BootHash,
      se04BootBuildId: features.onekey_se04_boot_build_id ?? previous?.verify?.se04BootBuildId,
      se04BootHash: features.onekey_se04_boot_hash ?? previous?.verify?.se04BootHash,
    },
    sessionId,
    session_id: sessionId ?? undefined,
    raw: {
      protocolV1Features,
    },
  };
};

/**
 * Structured Protocol V2 `Features` builder.
 *
 * This is the only cached Device state. Fields come from DeviceInfoGet or same-name
 * values in the previous cache. Fields without protocol-equivalent meaning remain
 * null or empty and never fall back to DeviceState or a transport path.
 */
export const buildProtocolV2FeaturesPayload = ({
  deviceInfo,
  deviceStatus,
  previous,
  runtimeMode,
}: {
  deviceInfo?: ProtocolV2DeviceInfo;
  deviceStatus?: DeviceStatus;
  previous?: Features;
  runtimeMode?: ProtocolV2RuntimeMode;
}): Features => {
  const info = deviceInfo;
  const fwApplication = info?.main_mcu?.application;
  const fwBootloader = info?.main_mcu?.bootloader;
  const fwBoard = info?.main_mcu?.romloader;
  const bleApplication = info?.coprocessor?.application;
  const status = deviceStatus;
  const incomingSerialNo = info?.hw?.serial_no;
  const samePhysicalDevice =
    !incomingSerialNo || !previous?.serialNo || incomingSerialNo === previous.serialNo;
  const cached = samePhysicalDevice ? previous : undefined;
  const incomingDeviceType = info?.hw?.Device_type;
  const resolvedIdentity = resolveProtocolV2DeviceIdentity(incomingDeviceType);
  const cachedIdentity =
    incomingDeviceType === undefined || incomingDeviceType === null ? cached : undefined;
  const deviceType = cachedIdentity ? cachedIdentity.deviceType : resolvedIdentity.deviceType;
  const model = cachedIdentity ? cachedIdentity.model : resolvedIdentity.model;

  const firmwareVersion = firstMeaningfulVersion(
    getImageVersion(fwApplication),
    cached?.firmwareVersion
  );
  const bootloaderVersion = firstMeaningfulVersion(
    getImageVersion(fwBootloader),
    cached?.bootloaderVersion
  );
  const boardVersion = firstMeaningfulVersion(getImageVersion(fwBoard), cached?.boardVersion);
  const bleVersion = firstMeaningfulVersion(getImageVersion(bleApplication), cached?.bleVersion);
  const deviceId = status?.device_id ?? cached?.deviceId ?? null;
  const serialNo = firstValue(incomingSerialNo, cached?.serialNo) ?? '';
  const label = cached?.label ?? null;
  const rawBleName = firstValue(info?.coprocessor?.bt_adv_name, cached?.bleName);
  const bleName = rawBleName ? canonicalizePro2BleAdvertisementName(rawBleName) : rawBleName;
  const initialized = firstValue(status?.init_states, cached?.initialized) ?? null;
  // passphrase_enabled from a locked Pro2 is not authoritative. Only DeviceStatus
  // after PIN unlock can determine the final passphrase setting.
  let passphraseProtection = cached?.passphraseProtection ?? null;
  if (status?.unlocked === true) {
    passphraseProtection = status.passphrase_enabled ?? null;
  }
  const language = cached?.language ?? null;
  const backupRequired = firstValue(status?.backup_required, cached?.backupRequired) ?? null;
  const bleEnabled = cached?.bleEnabled;
  const unlocked = firstValue(status?.unlocked, cached?.unlocked) ?? null;
  const attachToPinEnabled = status?.attach_to_pin_enabled ?? cached?.attachToPinEnabled ?? null;
  const unlockedAttachPin =
    status?.unlocked_by_attach_to_pin ?? cached?.unlockedAttachPin ?? undefined;
  const bootloaderMode = runtimeMode === 'bootloader' || runtimeMode === 'romloader';
  let mode: DeviceFeaturesMode = 'unknown';
  if (runtimeMode) {
    mode = runtimeMode;
  } else if (initialized === false) {
    mode = 'notInitialized';
  } else if (initialized === true) {
    mode = 'normal';
  } else if (cached?.mode === 'notInitialized' || cached?.mode === 'backupMode') {
    mode = cached.mode;
  } else if (cached?.mode) {
    mode = cached.mode;
  }

  return {
    protocol: 'V2',
    protocolVersion: deviceInfo?.protocol_version ?? cached?.protocolVersion ?? null,
    deviceType,
    firmwareType: cached?.firmwareType ?? EFirmwareType.Universal,
    model,
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
    firmwarePresent: cached?.firmwarePresent ?? null,
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
    autoLockDelayMs: cached?.autoLockDelayMs ?? null,
    autoShutdownDelayMs: cached?.autoShutdownDelayMs ?? null,
    displayRotation: null,
    experimentalFeatures: cached?.experimentalFeatures ?? null,
    wallpaperPath: cached?.wallpaperPath ?? null,
    brightness: cached?.brightness ?? null,
    animationEnabled: cached?.animationEnabled ?? null,
    tapToWake: cached?.tapToWake ?? null,
    hapticFeedback: cached?.hapticFeedback ?? null,
    deviceNameDisplayEnabled: cached?.deviceNameDisplayEnabled ?? null,
    airgapMode: cached?.airgapMode ?? null,
    fidoEnabled: cached?.fidoEnabled ?? null,
    usbLockEnabled: cached?.usbLockEnabled ?? null,
    randomKeypad: cached?.randomKeypad ?? null,
    firmwareVersion,
    bootloaderVersion,
    boardVersion,
    bleVersion,
    se01Version: firstMeaningfulVersion(
      getImageVersion(info?.se1?.application),
      cached?.se01Version
    ),
    se02Version: firstMeaningfulVersion(
      getImageVersion(info?.se2?.application),
      cached?.se02Version
    ),
    se03Version: firstMeaningfulVersion(
      getImageVersion(info?.se3?.application),
      cached?.se03Version
    ),
    se04Version: firstMeaningfulVersion(
      getImageVersion(info?.se4?.application),
      cached?.se04Version
    ),
    se01BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se1?.bootloader),
      cached?.se01BootVersion
    ),
    se02BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se2?.bootloader),
      cached?.se02BootVersion
    ),
    se03BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se3?.bootloader),
      cached?.se03BootVersion
    ),
    se04BootVersion: firstMeaningfulVersion(
      getImageVersion(info?.se4?.bootloader),
      cached?.se04BootVersion
    ),
    seVersion: cached?.seVersion ?? null,
    verify: {
      firmwareBuildId: getImageBuildId(fwApplication) ?? cached?.verify?.firmwareBuildId,
      firmwareHash: getImageHash(fwApplication) ?? cached?.verify?.firmwareHash,
      bootloaderBuildId: getImageBuildId(fwBootloader) ?? cached?.verify?.bootloaderBuildId,
      bootloaderHash: getImageHash(fwBootloader) ?? cached?.verify?.bootloaderHash,
      boardBuildId: getImageBuildId(fwBoard) ?? cached?.verify?.boardBuildId,
      boardHash: getImageHash(fwBoard) ?? cached?.verify?.boardHash,
      bleBuildId: getImageBuildId(bleApplication) ?? cached?.verify?.bleBuildId,
      bleHash: getImageHash(bleApplication) ?? cached?.verify?.bleHash,
      se01BuildId: getImageBuildId(info?.se1?.application) ?? cached?.verify?.se01BuildId,
      se01Hash: getImageHash(info?.se1?.application) ?? cached?.verify?.se01Hash,
      se02BuildId: getImageBuildId(info?.se2?.application) ?? cached?.verify?.se02BuildId,
      se02Hash: getImageHash(info?.se2?.application) ?? cached?.verify?.se02Hash,
      se03BuildId: getImageBuildId(info?.se3?.application) ?? cached?.verify?.se03BuildId,
      se03Hash: getImageHash(info?.se3?.application) ?? cached?.verify?.se03Hash,
      se04BuildId: getImageBuildId(info?.se4?.application) ?? cached?.verify?.se04BuildId,
      se04Hash: getImageHash(info?.se4?.application) ?? cached?.verify?.se04Hash,
      se01BootBuildId: getImageBuildId(info?.se1?.bootloader) ?? cached?.verify?.se01BootBuildId,
      se01BootHash: getImageHash(info?.se1?.bootloader) ?? cached?.verify?.se01BootHash,
      se02BootBuildId: getImageBuildId(info?.se2?.bootloader) ?? cached?.verify?.se02BootBuildId,
      se02BootHash: getImageHash(info?.se2?.bootloader) ?? cached?.verify?.se02BootHash,
      se03BootBuildId: getImageBuildId(info?.se3?.bootloader) ?? cached?.verify?.se03BootBuildId,
      se03BootHash: getImageHash(info?.se3?.bootloader) ?? cached?.verify?.se03BootHash,
      se04BootBuildId: getImageBuildId(info?.se4?.bootloader) ?? cached?.verify?.se04BootBuildId,
      se04BootHash: getImageHash(info?.se4?.bootloader) ?? cached?.verify?.se04BootHash,
    },
    sessionId: cached?.sessionId ?? null,
    device_id: deviceId ?? undefined,
    session_id: cached?.sessionId ?? undefined,
    ble_name: bleName ?? undefined,
    onekey_device_type: deviceType === EDeviceType.Unknown ? undefined : deviceType.toUpperCase(),
    passphrase_protection: passphraseProtection ?? undefined,
    bootloader_mode: bootloaderMode,
    passphraseState: cached?.passphraseState,
    unlockedAttachPin,
    raw: {
      protocolV2DeviceInfo: deviceInfo,
      protocolV2DeviceStatus: deviceStatus,
    },
  };
};
