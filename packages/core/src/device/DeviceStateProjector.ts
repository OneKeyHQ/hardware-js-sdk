import type {
  DeviceInfoSource,
  DeviceProfile,
  DeviceProfileRaw,
  GetDeviceInfoParams,
} from '../types/api/getDeviceInfo';
import type { DeviceState, Features } from '../types';

const getBootloaderMode = (state: DeviceState) =>
  state.status.mode === 'bootloader' || state.status.mode === 'romloader';

export const projectFeatures = (state: DeviceState): Features => {
  const rawFeatures = state.raw?.protocolV1Features ?? {};
  const rawOneKeyFeatures = state.raw?.protocolV1OneKeyFeatures ?? {};
  const sessionId = state.session?.sessionId ?? null;

  return {
    ...rawFeatures,
    ...rawOneKeyFeatures,
    protocol: state.protocol,
    protocolVersion:
      state.raw?.protocolV2DeviceInfo?.protocol_version ??
      (rawFeatures as { protocol_version?: number | null }).protocol_version ??
      null,
    deviceType: state.identity.deviceType,
    firmwareType: state.identity.firmwareType,
    model: state.identity.model,
    vendor: state.identity.vendor,
    deviceId: state.identity.deviceId,
    serialNo: state.identity.serialNo,
    label: state.identity.label,
    bleName: state.identity.bleName,
    capabilities: state.capabilities,
    mode: state.status.mode,
    initialized: state.status.initialized,
    bootloaderMode: getBootloaderMode(state),
    unlocked: state.status.unlocked,
    firmwarePresent: state.status.firmwarePresent,
    passphraseProtection: state.status.passphraseProtection,
    pinProtection: state.status.pinProtection,
    backupRequired: state.status.backupRequired,
    noBackup: state.status.noBackup,
    unfinishedBackup: state.status.unfinishedBackup,
    recoveryMode: state.status.recoveryMode,
    attachToPinEnabled: state.status.attachToPinEnabled,
    unlockedAttachPin: state.status.unlockedAttachPin ?? undefined,
    language: state.settings.language,
    bleEnabled: state.settings.bleEnabled,
    sdCardPresent: state.settings.sdCardPresent,
    sdProtection: state.settings.sdProtection,
    wipeCodeProtection: state.settings.wipeCodeProtection,
    passphraseAlwaysOnDevice: state.settings.passphraseAlwaysOnDevice,
    safetyChecks: state.settings.safetyChecks,
    autoLockDelayMs: state.settings.autoLockDelayMs,
    autoShutdownDelayMs: state.settings.autoShutdownDelayMs,
    displayRotation: state.settings.displayRotation,
    experimentalFeatures: state.settings.experimentalFeatures,
    wallpaperPath: state.settings.wallpaperPath,
    brightness: state.settings.brightness,
    animationEnabled: state.settings.animationEnabled,
    tapToWake: state.settings.tapToWake,
    hapticFeedback: state.settings.hapticFeedback,
    deviceNameDisplayEnabled: state.settings.deviceNameDisplayEnabled,
    airgapMode: state.settings.airgapMode,
    fidoEnabled: state.settings.fidoEnabled,
    usbLockEnabled: state.settings.usbLockEnabled,
    randomKeypad: state.settings.randomKeypad,
    firmwareVersion: state.versions.firmware,
    bootloaderVersion: state.versions.bootloader,
    boardVersion: state.versions.board,
    bleVersion: state.versions.ble,
    se01Version: state.versions.se01,
    se02Version: state.versions.se02,
    se03Version: state.versions.se03,
    se04Version: state.versions.se04,
    se01BootVersion: state.versions.se01Boot,
    se02BootVersion: state.versions.se02Boot,
    se03BootVersion: state.versions.se03Boot,
    se04BootVersion: state.versions.se04Boot,
    seVersion: null,
    verify: state.verification,
    sessionId,
    passphraseState: state.session?.passphraseState,
    raw: state.raw,
    device_id: state.identity.deviceId ?? undefined,
    session_id: sessionId ?? undefined,
    ble_name: state.identity.bleName ?? undefined,
    passphrase_protection: state.status.passphraseProtection ?? undefined,
    bootloader_mode: getBootloaderMode(state),
  } as unknown as Features;
};

const getSources = (state: DeviceState): DeviceInfoSource[] => {
  const sources: DeviceInfoSource[] = [];
  if (state.raw?.protocolV1Features) sources.push('features');
  if (state.raw?.protocolV1OneKeyFeatures) sources.push('protocolV1OneKeyFeatures');
  if (state.raw?.protocolV2DeviceInfo) sources.push('deviceInfo');
  if (sources.length === 0) {
    sources.push(state.protocol === 'V2' ? 'deviceInfo' : 'features');
  }
  return sources;
};

const getRaw = (state: DeviceState): DeviceProfileRaw => ({
  features: projectFeatures(state),
  protocolV1Features: state.raw?.protocolV1Features,
  protocolV1OneKeyFeatures: state.raw?.protocolV1OneKeyFeatures,
  protocolV2DeviceInfo: state.raw?.protocolV2DeviceInfo,
  protocolV2DeviceStatus: state.raw?.protocolV2DeviceStatus,
});

export const projectDeviceProfile = (
  state: DeviceState,
  params: GetDeviceInfoParams = {}
): DeviceProfile => {
  const includeVerify = params.scope === 'verify' || params.scope === 'full';
  return {
    protocol: state.protocol,
    sources: getSources(state),
    deviceType: state.identity.deviceType,
    firmwareType: state.identity.firmwareType,
    deviceId: state.identity.deviceId ?? '',
    serialNo: state.identity.serialNo,
    label: state.identity.label,
    bleName: state.identity.bleName,
    status: {
      mode: state.status.mode,
      initialized: state.status.initialized,
      bootloaderMode: getBootloaderMode(state),
      unlocked: state.status.unlocked,
      passphraseProtection: state.status.passphraseProtection,
      attachToPinEnabled: state.status.attachToPinEnabled,
      unlockedAttachPin: state.status.unlockedAttachPin,
      backupRequired: state.status.backupRequired,
      noBackup: state.status.noBackup,
      language: state.settings.language,
      bleEnabled: state.settings.bleEnabled,
    },
    versions: { ...state.versions },
    ...(includeVerify ? { verify: state.verification ?? {} } : {}),
    ...(params.includeRaw ? { raw: getRaw(state) } : {}),
  };
};
