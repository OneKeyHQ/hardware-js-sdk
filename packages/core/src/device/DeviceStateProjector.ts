import { cloneDeviceState } from './cloneDeviceState';

import type { DeviceFeaturesRaw, DeviceState, Features } from '../types';

type StoredDeviceState = DeviceState & {
  raw?: DeviceFeaturesRaw;
};

const getBootloaderMode = (state: StoredDeviceState) =>
  state.status.mode === 'bootloader' || state.status.mode === 'romloader';

const projectLegacyAdvancedFields = (state: StoredDeviceState) => {
  const verification = state.verification ?? {};
  const securityElements = state.securityElements ?? {};

  return {
    onekey_device_type: state.identity.deviceType,
    onekey_serial_no: state.identity.serialNo,
    onekey_se_type:
      securityElements.se01?.type ??
      securityElements.se02?.type ??
      securityElements.se03?.type ??
      securityElements.se04?.type,
    onekey_board_version: state.versions.board,
    onekey_board_hash: verification.boardHash,
    onekey_board_build_id: verification.boardBuildId,
    onekey_boot_version: state.versions.bootloader,
    onekey_boot_hash: verification.bootloaderHash,
    onekey_boot_build_id: verification.bootloaderBuildId,
    onekey_firmware_version: state.versions.firmware,
    onekey_firmware_hash: verification.firmwareHash,
    onekey_firmware_build_id: verification.firmwareBuildId,
    onekey_ble_version: state.versions.ble,
    onekey_ble_hash: verification.bleHash,
    onekey_ble_build_id: verification.bleBuildId,
    onekey_ble_name: state.identity.bleName,
    onekey_se01_version: state.versions.se01,
    onekey_se01_hash: verification.se01Hash,
    onekey_se01_build_id: verification.se01BuildId,
    onekey_se01_state: securityElements.se01?.state,
    onekey_se01_boot_version: state.versions.se01Boot,
    onekey_se01_boot_hash: verification.se01BootHash,
    onekey_se01_boot_build_id: verification.se01BootBuildId,
    onekey_se02_version: state.versions.se02,
    onekey_se02_hash: verification.se02Hash,
    onekey_se02_build_id: verification.se02BuildId,
    onekey_se02_state: securityElements.se02?.state,
    onekey_se02_boot_version: state.versions.se02Boot,
    onekey_se02_boot_hash: verification.se02BootHash,
    onekey_se02_boot_build_id: verification.se02BootBuildId,
    onekey_se03_version: state.versions.se03,
    onekey_se03_hash: verification.se03Hash,
    onekey_se03_build_id: verification.se03BuildId,
    onekey_se03_state: securityElements.se03?.state,
    onekey_se03_boot_version: state.versions.se03Boot,
    onekey_se03_boot_hash: verification.se03BootHash,
    onekey_se03_boot_build_id: verification.se03BootBuildId,
    onekey_se04_version: state.versions.se04,
    onekey_se04_hash: verification.se04Hash,
    onekey_se04_build_id: verification.se04BuildId,
    onekey_se04_state: securityElements.se04?.state,
    onekey_se04_boot_version: state.versions.se04Boot,
    onekey_se04_boot_hash: verification.se04BootHash,
    onekey_se04_boot_build_id: verification.se04BootBuildId,
  };
};

export const projectFeatures = (state: StoredDeviceState): Features => {
  const snapshot = cloneDeviceState(state);
  const rawFeatures = snapshot.raw?.protocolV1Features ?? {};
  const publicRawFeatures = { ...rawFeatures } as Record<string, unknown>;
  delete publicRawFeatures.session_id;
  delete publicRawFeatures.sessionId;
  delete publicRawFeatures.passphraseState;
  const rawOneKeyFeatures = snapshot.raw?.protocolV1OneKeyFeatures ?? {};
  const bootloaderMode =
    snapshot.protocol === 'V1'
      ? (rawFeatures as { bootloader_mode?: boolean | null }).bootloader_mode ?? null
      : getBootloaderMode(snapshot);
  const legacyAdvancedFields = projectLegacyAdvancedFields(snapshot);

  return {
    ...publicRawFeatures,
    ...rawOneKeyFeatures,
    ...legacyAdvancedFields,
    protocol: snapshot.protocol,
    protocolVersion: snapshot.protocolVersion ?? (snapshot.protocol === 'V1' ? 1 : null),
    deviceType: snapshot.identity.deviceType,
    firmwareType: snapshot.identity.firmwareType,
    model: snapshot.identity.model,
    vendor: snapshot.identity.vendor,
    deviceId: snapshot.identity.deviceId,
    serialNo: snapshot.identity.serialNo,
    label: snapshot.identity.label,
    bleName: snapshot.identity.bleName,
    capabilities: snapshot.capabilities,
    mode: snapshot.status.mode,
    initialized: snapshot.status.initialized,
    bootloaderMode,
    unlocked: snapshot.status.unlocked,
    firmwarePresent: snapshot.status.firmwarePresent,
    passphraseProtection: snapshot.status.passphraseProtection,
    pinProtection: snapshot.status.pinProtection,
    backupRequired: snapshot.status.backupRequired,
    noBackup: snapshot.status.noBackup,
    unfinishedBackup: snapshot.status.unfinishedBackup,
    recoveryMode: snapshot.status.recoveryMode,
    attachToPinEnabled: snapshot.status.attachToPinEnabled,
    unlockedAttachPin: snapshot.status.unlockedAttachPin ?? undefined,
    language: snapshot.settings.language,
    bleEnabled: snapshot.settings.bleEnabled,
    sdCardPresent: snapshot.settings.sdCardPresent,
    sdProtection: snapshot.settings.sdProtection,
    wipeCodeProtection: snapshot.settings.wipeCodeProtection,
    passphraseAlwaysOnDevice: snapshot.settings.passphraseAlwaysOnDevice,
    safetyChecks: snapshot.settings.safetyChecks,
    autoLockDelayMs: snapshot.settings.autoLockDelayMs,
    autoShutdownDelayMs: snapshot.settings.autoShutdownDelayMs,
    displayRotation: snapshot.settings.displayRotation,
    experimentalFeatures: snapshot.settings.experimentalFeatures,
    wallpaperPath: snapshot.settings.wallpaperPath,
    brightness: snapshot.settings.brightness,
    animationEnabled: snapshot.settings.animationEnabled,
    tapToWake: snapshot.settings.tapToWake,
    hapticFeedback: snapshot.settings.hapticFeedback,
    deviceNameDisplayEnabled: snapshot.settings.deviceNameDisplayEnabled,
    airgapMode: snapshot.settings.airgapMode,
    fidoEnabled: snapshot.settings.fidoEnabled,
    usbLockEnabled: snapshot.settings.usbLockEnabled,
    randomKeypad: snapshot.settings.randomKeypad,
    firmwareVersion: snapshot.versions.firmware,
    bootloaderVersion: snapshot.versions.bootloader,
    boardVersion: snapshot.versions.board,
    bleVersion: snapshot.versions.ble,
    se01Version: snapshot.versions.se01,
    se02Version: snapshot.versions.se02,
    se03Version: snapshot.versions.se03,
    se04Version: snapshot.versions.se04,
    se01BootVersion: snapshot.versions.se01Boot,
    se02BootVersion: snapshot.versions.se02Boot,
    se03BootVersion: snapshot.versions.se03Boot,
    se04BootVersion: snapshot.versions.se04Boot,
    seVersion: snapshot.versions.se ?? null,
    verify: snapshot.verification,
    device_id: snapshot.identity.deviceId ?? undefined,
    ble_name: snapshot.identity.bleName ?? undefined,
    passphrase_protection: snapshot.status.passphraseProtection ?? undefined,
    bootloader_mode: bootloaderMode,
    sessionId: null,
    session_id: null,
  } as unknown as Features;
};
