import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { buildProtocolV1FeaturesPayload } from '../deviceProfile/buildDeviceFeatures';
import {
  isProtocolV2BootloaderDeviceInfo,
  isProtocolV2RomloaderDeviceInfo,
} from '../protocols/protocol-v2/features';

import type { PROTO } from '../constants';
import type { DeviceStatePatch, Features } from '../types';
import type {
  ApplySettings,
  DeviceFirmwareImageInfo,
  DeviceSettings,
  DeviceStatus,
  ProtocolV2DeviceInfo,
} from '@onekeyfe/hd-transport';

const definedEntries = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;

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

export const mapFeaturesToState = (features: Features): DeviceStatePatch => ({
  protocol: features.protocol,
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
    mode:
      features.mode ??
      (features.bootloaderMode === true
        ? 'bootloader'
        : features.initialized === false
        ? 'notInitialized'
        : features.initialized === true
        ? 'normal'
        : undefined),
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
    se01: features.se01Version,
    se02: features.se02Version,
    se03: features.se03Version,
    se04: features.se04Version,
    se01Boot: features.se01BootVersion,
    se02Boot: features.se02BootVersion,
    se03Boot: features.se03BootVersion,
    se04Boot: features.se04BootVersion,
  },
  capabilities: features.capabilities,
  verification: features.verify,
  session: {
    sessionId: features.sessionId,
    passphraseState: features.passphraseState,
  },
  raw: features.raw,
});

export const mapProtocolV1FeaturesToState = (
  protocolV1Features: PROTO.Features
): DeviceStatePatch => mapFeaturesToState(buildProtocolV1FeaturesPayload(protocolV1Features));

export const mapProtocolV2DeviceInfoToState = (
  info: ProtocolV2DeviceInfo
): DeviceStatePatch => {
  const romloader = isProtocolV2RomloaderDeviceInfo(info);
  const bootloader = isProtocolV2BootloaderDeviceInfo(info);
  const status = romloader
    ? { mode: 'romloader' as const }
    : bootloader
    ? { mode: 'bootloader' as const }
    : undefined;

  return {
    protocol: 'V2',
    identity: definedEntries({
      deviceType: EDeviceType.Pro2,
      firmwareType: EFirmwareType.Universal,
      model: 'pro2',
      vendor: 'onekey.so',
      serialNo: info.hw?.serial_no,
      bleName: info.coprocessor?.bt_adv_name,
    }),
    ...(status ? { status } : {}),
    versions: definedEntries({
      firmware: imageVersion(info.fw?.application),
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
      bootloaderBuildId: imageBuildId(info.fw?.bootloader),
      bootloaderHash: imageHash(info.fw?.bootloader),
      boardBuildId: imageBuildId(info.fw?.romloader),
      boardHash: imageHash(info.fw?.romloader),
      bleBuildId: imageBuildId(info.coprocessor?.application),
      bleHash: imageHash(info.coprocessor?.application),
    }),
    raw: { protocolV2DeviceInfo: info },
  };
};

export const mapProtocolV2DeviceStatusToState = (status: DeviceStatus): DeviceStatePatch => ({
  identity: definedEntries({ deviceId: status.device_id }),
  status: definedEntries({
    mode:
      status.init_states === false
        ? ('notInitialized' as const)
        : status.init_states === true
        ? ('normal' as const)
        : undefined,
    initialized: status.init_states,
    unlocked: status.unlocked,
    passphraseProtection:
      status.unlocked === true ? status.passphrase_enabled ?? null : null,
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
    safetyChecks: settings.safety_checks,
    experimentalFeatures: settings.experimental_features,
    hapticFeedback: settings.haptic_feedback,
  });
  return {
    ...(Object.keys(identity).length ? { identity } : {}),
    ...(Object.keys(status).length ? { status } : {}),
    ...(Object.keys(stateSettings).length ? { settings: stateSettings } : {}),
  };
};

export const mapDeviceSettingsToState = (settings: DeviceSettings): DeviceStatePatch => {
  const settingsWithExperimental = settings as DeviceSettings & {
    experimental_features?: boolean;
  };
  const identity = definedEntries({ label: settings.label });
  const status = definedEntries({ passphraseProtection: settings.passphrase_enable });
  const stateSettings = definedEntries({
    bleEnabled: settings.bt_enable,
    language: settings.language,
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
    experimentalFeatures: settingsWithExperimental.experimental_features,
    usbLockEnabled: settings.usb_lock_enable,
    randomKeypad: settings.random_keypad,
  });
  return {
    ...(Object.keys(identity).length ? { identity } : {}),
    ...(Object.keys(status).length ? { status } : {}),
    ...(Object.keys(stateSettings).length ? { settings: stateSettings } : {}),
  };
};
