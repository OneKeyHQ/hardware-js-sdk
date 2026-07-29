import { cloneDeviceState } from './cloneDeviceState';

import type { DeviceFeaturesRaw, DeviceState, Features } from '../types';

type StoredDeviceState = DeviceState & {
  raw?: DeviceFeaturesRaw;
};

const getBootloaderMode = (state: StoredDeviceState) =>
  state.status.mode === 'bootloader' || state.status.mode === 'romloader';

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

  return {
    ...publicRawFeatures,
    ...rawOneKeyFeatures,
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
