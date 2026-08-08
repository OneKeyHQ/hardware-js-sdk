import { EFirmwareType } from '@onekeyfe/hd-shared';

import { buildProtocolV1FeaturesPayload } from '../deviceProfile/buildDeviceFeatures';
import { resolveProtocolV2DeviceIdentity } from '../deviceProfile/protocolV2DeviceIdentity';
import {
  mapLanguageFromProtocolV2,
  mapLanguageToProtocolV2,
  normalizeSafetyCheckLevel,
} from '../utils/deviceSettings';
import { getProtocolV2SeState, getProtocolV2SeType } from '../protocols/protocol-v2/features';

import type {
  ApplySettings,
  DeviceFirmwareImageInfo,
  DeviceSettings,
  DeviceStatus,
  ProtocolV2DeviceInfo,
} from '@onekeyfe/hd-transport';
import type { PROTO } from '../constants';
import type {
  DeviceFeaturesVerify,
  DeviceStateMode,
  DeviceStatePatch,
  Features,
  OnekeyFeatures,
} from '../types';
import type { DeviceSettingsParams } from '../types/api/deviceSettings';

const definedEntries = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;

const sanitizeRawFeatures = (features: Features): Features['raw'] => {
  if (!features.raw) return undefined;

  const raw = { ...features.raw };
  if (raw.protocolV1Features) {
    const { session_id: _sessionId, ...protocolV1Features } = raw.protocolV1Features;
    const compatibilityFields = protocolV1Features as typeof protocolV1Features & {
      sessionId?: string;
      passphraseState?: string;
    };
    delete compatibilityFields.sessionId;
    delete compatibilityFields.passphraseState;
    raw.protocolV1Features = compatibilityFields as PROTO.Features;
  }
  return raw;
};

const imageVersion = (image?: DeviceFirmwareImageInfo | null) => image?.version ?? undefined;

const bytesToHex = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array || Array.isArray(value)) {
    return Array.from(value)
      .map(byte => Number(byte).toString(16).padStart(2, '0'))
      .join('');
  }
  return undefined;
};

const imageBuildId = (image?: DeviceFirmwareImageInfo | null) => image?.build_id ?? undefined;
const imageHash = (image?: DeviceFirmwareImageInfo | null) => bytesToHex(image?.hash);

const getFeaturesMode = (features: Features): DeviceStateMode | undefined => {
  if (features.mode !== undefined && features.mode !== null) return features.mode;
  if (features.bootloaderMode === true) return 'bootloader';
  if (features.initialized === false) return 'notInitialized';
  if (features.initialized === true) return 'normal';
  return undefined;
};

const getProtocolV2StatusMode = (initialized?: boolean | null): DeviceStateMode | undefined => {
  if (initialized === false) return 'notInitialized';
  if (initialized === true) return 'normal';
  return undefined;
};

export const mapFeaturesToState = (features: Features): DeviceStatePatch => ({
  protocol: features.protocol,
  protocolVersion: features.protocolVersion,
  identity: {
    deviceType: features.deviceType,
    firmwareType: features.firmwareType,
    model: features.model,
    vendor: features.vendor,
    deviceId: features.deviceId,
    serialNo: features.serialNo,
    label: features.label,
    bleName: features.bleName,
  },
  status: {
    mode: getFeaturesMode(features),
    initialized: features.initialized,
    unlocked: features.unlocked,
    firmwarePresent: features.firmwarePresent,
    backupRequired: features.backupRequired,
    noBackup: features.noBackup,
    unfinishedBackup: features.unfinishedBackup,
    recoveryMode: features.recoveryMode,
    passphraseProtection: features.passphraseProtection,
    pinProtection: features.pinProtection,
    attachToPinEnabled: features.attachToPinEnabled ?? null,
    unlockedAttachPin: features.unlockedAttachPin ?? null,
  },
  settings: {
    language: features.language,
    bleEnabled: features.bleEnabled,
    sdCardPresent: features.sdCardPresent,
    sdProtection: features.sdProtection,
    wipeCodeProtection: features.wipeCodeProtection,
    passphraseAlwaysOnDevice: features.passphraseAlwaysOnDevice,
    safetyChecks: features.safetyChecks,
    autoLockDelayMs: features.autoLockDelayMs,
    autoShutdownDelayMs: features.autoShutdownDelayMs,
    displayRotation: features.displayRotation,
    experimentalFeatures: features.experimentalFeatures,
    wallpaperPath: features.wallpaperPath,
    brightness: features.brightness,
    animationEnabled: features.animationEnabled,
    tapToWake: features.tapToWake,
    hapticFeedback: features.hapticFeedback,
    deviceNameDisplayEnabled: features.deviceNameDisplayEnabled,
    airgapMode: features.airgapMode,
    fidoEnabled: features.fidoEnabled,
    usbLockEnabled: features.usbLockEnabled,
    randomKeypad: features.randomKeypad,
  },
  versions: {
    firmware: features.firmwareVersion,
    bootloader: features.bootloaderVersion,
    board: features.boardVersion,
    ble: features.bleVersion,
    // Legacy devices expose one SE version; project it to se01 and keep se as an alias.
    se: features.seVersion,
    se01: features.se01Version ?? features.seVersion,
    se02: features.se02Version,
    se03: features.se03Version,
    se04: features.se04Version,
    se01Boot: features.se01BootVersion,
    se02Boot: features.se02BootVersion,
    se03Boot: features.se03BootVersion,
    se04Boot: features.se04BootVersion,
  },
  capabilities: features.capabilities,
  verification: definedEntries(features.verify ?? {}),
  raw: sanitizeRawFeatures(features),
});

export const mapProtocolV1FeaturesToState = (
  protocolV1Features: PROTO.Features
): DeviceStatePatch => mapFeaturesToState(buildProtocolV1FeaturesPayload(protocolV1Features));

const meaningfulVersion = (version?: string | null) => {
  if (!version || version === '0.0.0') return undefined;
  const parts = version.split('.');
  while (parts.length < 3) parts.push('0');
  return parts.map(part => (Number.isNaN(Number.parseInt(part, 10)) ? '0' : part)).join('.');
};

const meaningfulText = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

export const mapProtocolV1OnekeyFeaturesToState = (features: OnekeyFeatures): DeviceStatePatch => {
  const verification = definedEntries<DeviceFeaturesVerify>({
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
  });

  return {
    versions: definedEntries({
      firmware: meaningfulVersion(features.onekey_firmware_version),
      bootloader: meaningfulVersion(features.onekey_boot_version),
      board: meaningfulVersion(features.onekey_board_version),
      ble: meaningfulVersion(features.onekey_ble_version),
      se01: meaningfulVersion(features.onekey_se01_version),
      se02: meaningfulVersion(features.onekey_se02_version),
      se03: meaningfulVersion(features.onekey_se03_version),
      se04: meaningfulVersion(features.onekey_se04_version),
      se01Boot: meaningfulVersion(features.onekey_se01_boot_version),
      se02Boot: meaningfulVersion(features.onekey_se02_boot_version),
      se03Boot: meaningfulVersion(features.onekey_se03_boot_version),
      se04Boot: meaningfulVersion(features.onekey_se04_boot_version),
    }),
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
    securityElements: {
      se01: {
        type: meaningfulText(features.onekey_se_type),
        state: meaningfulText(features.onekey_se01_state),
      },
      se02: {
        type: null,
        state: meaningfulText(features.onekey_se02_state),
      },
      se03: {
        type: null,
        state: meaningfulText(features.onekey_se03_state),
      },
      se04: {
        type: null,
        state: meaningfulText(features.onekey_se04_state),
      },
    },
    raw: { protocolV1OneKeyFeatures: features },
  };
};

export const mapProtocolV2DeviceInfoToState = (
  info: ProtocolV2DeviceInfo,
  mode: DeviceStateMode = 'unknown'
): DeviceStatePatch => {
  const loader = mode === 'bootloader' || mode === 'romloader';
  const identity = resolveProtocolV2DeviceIdentity(info.hw?.Device_type);

  return {
    protocol: 'V2',
    protocolVersion: info.protocol_version,
    identity: definedEntries({
      deviceType: identity.deviceType,
      firmwareType: EFirmwareType.Universal,
      model: identity.model,
      vendor: 'onekey.so',
      serialNo: info.hw?.serial_no,
      bleName: info.coprocessor?.bt_adv_name,
      deviceId: loader ? null : undefined,
    }),
    status: loader
      ? {
          mode,
          initialized: null,
          unlocked: null,
          firmwarePresent: null,
          backupRequired: null,
          noBackup: null,
          unfinishedBackup: null,
          recoveryMode: null,
          passphraseProtection: null,
          pinProtection: null,
          attachToPinEnabled: null,
          unlockedAttachPin: null,
        }
      : { mode },
    versions: definedEntries({
      firmware: imageVersion(info.fw?.application),
      applicationP1: imageVersion(info.fw?.application),
      applicationP2: imageVersion(info.fw?.application_data),
      bootloader: imageVersion(info.fw?.bootloader),
      board: imageVersion(info.fw?.romloader),
      ble: imageVersion(info.coprocessor?.application),
      se01: imageVersion(info.se1?.application),
      se02: imageVersion(info.se2?.application),
      se03: imageVersion(info.se3?.application),
      se04: imageVersion(info.se4?.application),
      se01Boot: imageVersion(info.se1?.bootloader),
      se02Boot: imageVersion(info.se2?.bootloader),
      se03Boot: imageVersion(info.se3?.bootloader),
      se04Boot: imageVersion(info.se4?.bootloader),
    }),
    verification: definedEntries({
      firmwareBuildId: imageBuildId(info.fw?.application),
      firmwareHash: imageHash(info.fw?.application),
      applicationP1BuildId: imageBuildId(info.fw?.application),
      applicationP1Hash: imageHash(info.fw?.application),
      applicationP2BuildId: imageBuildId(info.fw?.application_data),
      applicationP2Hash: imageHash(info.fw?.application_data),
      bootloaderBuildId: imageBuildId(info.fw?.bootloader),
      bootloaderHash: imageHash(info.fw?.bootloader),
      boardBuildId: imageBuildId(info.fw?.romloader),
      boardHash: imageHash(info.fw?.romloader),
      bleBuildId: imageBuildId(info.coprocessor?.application),
      bleHash: imageHash(info.coprocessor?.application),
      se01BuildId: imageBuildId(info.se1?.application),
      se01Hash: imageHash(info.se1?.application),
      se02BuildId: imageBuildId(info.se2?.application),
      se02Hash: imageHash(info.se2?.application),
      se03BuildId: imageBuildId(info.se3?.application),
      se03Hash: imageHash(info.se3?.application),
      se04BuildId: imageBuildId(info.se4?.application),
      se04Hash: imageHash(info.se4?.application),
      se01BootBuildId: imageBuildId(info.se1?.bootloader),
      se01BootHash: imageHash(info.se1?.bootloader),
      se02BootBuildId: imageBuildId(info.se2?.bootloader),
      se02BootHash: imageHash(info.se2?.bootloader),
      se03BootBuildId: imageBuildId(info.se3?.bootloader),
      se03BootHash: imageHash(info.se3?.bootloader),
      se04BootBuildId: imageBuildId(info.se4?.bootloader),
      se04BootHash: imageHash(info.se4?.bootloader),
    }),
    securityElements: {
      se01: {
        type: getProtocolV2SeType(info.se1),
        state: getProtocolV2SeState(info.se1),
      },
      se02: {
        type: getProtocolV2SeType(info.se2),
        state: getProtocolV2SeState(info.se2),
      },
      se03: {
        type: getProtocolV2SeType(info.se3),
        state: getProtocolV2SeState(info.se3),
      },
      se04: {
        type: getProtocolV2SeType(info.se4),
        state: getProtocolV2SeState(info.se4),
      },
    },
    raw: {
      protocolV2DeviceInfo: info,
      ...(loader ? { protocolV2DeviceStatus: null } : {}),
    },
  };
};

export const mapProtocolV2DeviceStatusToState = (status: DeviceStatus): DeviceStatePatch => ({
  identity: definedEntries({ deviceId: status.device_id }),
  status: definedEntries({
    mode: getProtocolV2StatusMode(status.init_states),
    initialized: status.init_states,
    unlocked: status.unlocked,
    passphraseProtection: status.unlocked === true ? status.passphrase_enabled ?? null : undefined,
    backupRequired: status.backup_required,
    attachToPinEnabled: status.attach_to_pin_enabled,
    unlockedAttachPin: status.unlocked_by_attach_to_pin,
  }),
  raw: { protocolV2DeviceStatus: status },
});

export const mapApplySettingsToState = (settings: ApplySettings): DeviceStatePatch => {
  const identity = definedEntries({ label: settings.label });
  const status = definedEntries({ passphraseProtection: settings.use_passphrase });
  const stateSettings = definedEntries({
    language: settings.language,
    autoLockDelayMs: settings.auto_lock_delay_ms,
    autoShutdownDelayMs: settings.auto_shutdown_delay_ms,
    displayRotation: settings.display_rotation,
    passphraseAlwaysOnDevice: settings.passphrase_always_on_device,
    safetyChecks: normalizeSafetyCheckLevel(settings.safety_checks),
    experimentalFeatures: settings.experimental_features,
    hapticFeedback: settings.haptic_feedback,
    bleEnabled: settings.use_ble,
  });
  return {
    ...(Object.keys(identity).length ? { identity } : {}),
    ...(Object.keys(status).length ? { status } : {}),
    ...(Object.keys(stateSettings).length ? { settings: stateSettings } : {}),
  };
};

export const mapDeviceSettingsToState = (settings: DeviceSettings): DeviceStatePatch => {
  const identity = definedEntries({ label: settings.label });
  const status = definedEntries({ passphraseProtection: settings.passphrase_enable });
  const stateSettings = definedEntries({
    bleEnabled: settings.bt_enable,
    language: mapLanguageFromProtocolV2(settings.language),
    wallpaperPath: settings.wallpaper_path,
    brightness: settings.brightness,
    autoLockDelayMs: settings.autolock_delay_ms,
    autoShutdownDelayMs: settings.autoshutdown_delay_ms,
    animationEnabled: settings.animation_enable,
    tapToWake: settings.tap_to_wake,
    hapticFeedback: settings.haptic_feedback,
    deviceNameDisplayEnabled: settings.device_name_display_enabled,
    airgapMode: settings.airgap_mode,
    fidoEnabled: settings.fido_enabled,
    usbLockEnabled: settings.usb_lock_enable,
    randomKeypad: settings.random_keypad,
  });
  return {
    ...(Object.keys(identity).length ? { identity } : {}),
    ...(Object.keys(status).length ? { status } : {}),
    ...(Object.keys(stateSettings).length ? { settings: stateSettings } : {}),
  };
};

export const mapCommonSettingsToProtocolV2 = (settings: DeviceSettingsParams): DeviceSettings =>
  definedEntries({
    label: settings.label,
    bt_enable: settings.bluetoothEnabled,
    language: mapLanguageToProtocolV2(settings.language),
    brightness: settings.brightness,
    autolock_delay_ms: settings.autoLockDelayMs,
    autoshutdown_delay_ms: settings.autoShutdownDelayMs,
    animation_enable: settings.animationEnabled,
    tap_to_wake: settings.tapToWake,
    haptic_feedback: settings.hapticFeedback,
    device_name_display_enabled: settings.deviceNameDisplayEnabled,
    fido_enabled: settings.fidoEnabled,
    usb_lock_enable: settings.usbLockEnabled,
    random_keypad: settings.randomKeypad,
  });
