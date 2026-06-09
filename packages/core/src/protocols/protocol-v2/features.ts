import { EDeviceType } from '@onekeyfe/hd-shared';

import { buildProfileFromProtocolV2 } from '../../deviceProfile';

import type { Features } from '../../types';
import type { DeviceCommands } from '../../device/DeviceCommands';
import type { DeviceProfile } from '../../types/api/getDeviceInfo';

export type ProtocolV2Bytes = Uint8Array | number[] | string;

export type ProtocolV2FirmwareImageInfo = {
  version?: string;
  build_id?: string;
  hash?: ProtocolV2Bytes;
};

export type ProtocolV2SEInfo = {
  boot?: ProtocolV2FirmwareImageInfo;
  app?: ProtocolV2FirmwareImageInfo;
  type?: number;
  state?: number;
};

export type ProtocolV2DeviceInfo = {
  protocol_version?: number;
  hw?: {
    Device_type?: number;
    device_type?: number;
    serial_no?: string;
    hardware_version?: string;
    hardware_version_raw_adc?: number;
  };
  fw?: {
    board?: ProtocolV2FirmwareImageInfo;
    boot?: ProtocolV2FirmwareImageInfo;
    app?: ProtocolV2FirmwareImageInfo;
  };
  bt?: {
    boot?: ProtocolV2FirmwareImageInfo;
    app?: ProtocolV2FirmwareImageInfo;
    adv_name?: string;
    mac?: ProtocolV2Bytes;
  };
  se1?: ProtocolV2SEInfo;
  se2?: ProtocolV2SEInfo;
  se3?: ProtocolV2SEInfo;
  se4?: ProtocolV2SEInfo;
  status?: {
    language?: string;
    bt_enable?: boolean;
    init_states?: boolean;
    backup_required?: boolean;
    passphrase_protection?: boolean;
    label?: string;
  };
};

export const PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    status: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

export const PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
    status: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

export const PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
    status: true,
  },
  types: {
    version: true,
    build_id: true,
    hash: true,
    specific: true,
  },
};

export const PROTOCOL_V2_DEVICE_INFO_REQUEST = PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST;
export const PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS = 10 * 1000;

function parseVersion(version?: string | null): [number, number, number] {
  if (!version) return [0, 0, 0];
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(part => Number(part) || 0);
  return [major, minor, patch];
}

function getSeState(se?: ProtocolV2SEInfo) {
  switch (se?.state) {
    case 0:
      return 'BOOT';
    case 51:
      return 'APP_FACTORY';
    case 85:
      return 'APP';
    default:
      return null;
  }
}

function createBaseFeatures(): Features {
  return {
    vendor: 'onekey.so',
    major_version: 0,
    minor_version: 0,
    patch_version: 0,
    bootloader_mode: false,
    device_id: '',
    pin_protection: null,
    passphrase_protection: null,
    language: null,
    label: null,
    initialized: false,
    revision: null,
    bootloader_hash: null,
    imported: null,
    unlocked: false,
    firmware_present: false,
    needs_backup: null,
    flags: null,
    model: 'pro2',
    fw_major: 0,
    fw_minor: 0,
    fw_patch: 0,
    fw_vendor: null,
    unfinished_backup: null,
    no_backup: null,
    recovery_mode: null,
    capabilities: [],
    backup_type: null,
    sd_card_present: null,
    sd_protection: null,
    wipe_code_protection: null,
    session_id: null,
    passphrase_always_on_device: null,
    safety_checks: null,
    auto_lock_delay_ms: null,
    display_rotation: null,
    experimental_features: null,
    protocol_version: null,
    onekey_device_type: EDeviceType.Pro2,
    onekey_serial_no: '',
    serial_no: '',
  };
}

export function buildProtocolV2FeaturesFromProfile(
  profile: DeviceProfile,
  deviceInfo?: ProtocolV2DeviceInfo
): Features {
  const features = createBaseFeatures();
  const firmwareVersion = profile.versions.firmware;
  const [fwMajor, fwMinor, fwPatch] = parseVersion(firmwareVersion);

  return {
    ...features,
    major_version: fwMajor,
    minor_version: fwMinor,
    patch_version: fwPatch,
    fw_major: fwMajor,
    fw_minor: fwMinor,
    fw_patch: fwPatch,
    device_id: profile.deviceId || features.device_id,
    serial_no: profile.serialNo || features.serial_no,
    onekey_serial_no: profile.serialNo || features.onekey_serial_no,
    protocol_version: deviceInfo?.protocol_version ?? features.protocol_version,
    label: profile.label,
    language: profile.status.language,
    initialized: profile.status.initialized ?? features.initialized,
    passphrase_protection: profile.status.passphraseProtection,
    needs_backup: profile.status.backupRequired,
    ble_enable: profile.status.bleEnabled ?? undefined,
    onekey_ble_name: profile.bleName ?? undefined,
    ble_name: profile.bleName ?? undefined,
    onekey_firmware_version: firmwareVersion ?? undefined,
    onekey_firmware_build_id: profile.verify?.firmwareBuildId,
    onekey_firmware_hash: profile.verify?.firmwareHash,
    onekey_boot_version: profile.versions.bootloader ?? undefined,
    bootloader_version: profile.versions.bootloader ?? undefined,
    onekey_boot_build_id: profile.verify?.bootloaderBuildId,
    onekey_boot_hash: profile.verify?.bootloaderHash,
    onekey_board_version: profile.versions.board ?? undefined,
    onekey_board_build_id: profile.verify?.boardBuildId,
    onekey_board_hash: profile.verify?.boardHash,
    onekey_ble_version: profile.versions.ble ?? undefined,
    ble_ver: profile.versions.ble ?? undefined,
    onekey_ble_build_id: profile.verify?.bleBuildId,
    onekey_ble_hash: profile.verify?.bleHash,
    onekey_se01_version: profile.versions.se01 ?? undefined,
    onekey_se01_hash: profile.verify?.se01Hash,
    onekey_se01_build_id: profile.verify?.se01BuildId,
    onekey_se01_boot_version: profile.versions.se01Boot ?? undefined,
    onekey_se01_boot_hash: profile.verify?.se01BootHash,
    onekey_se01_boot_build_id: profile.verify?.se01BootBuildId,
    onekey_se01_state: getSeState(deviceInfo?.se1),
    onekey_se02_version: profile.versions.se02 ?? undefined,
    onekey_se02_hash: profile.verify?.se02Hash,
    onekey_se02_build_id: profile.verify?.se02BuildId,
    onekey_se02_boot_version: profile.versions.se02Boot ?? undefined,
    onekey_se02_boot_hash: profile.verify?.se02BootHash,
    onekey_se02_boot_build_id: profile.verify?.se02BootBuildId,
    onekey_se02_state: getSeState(deviceInfo?.se2),
    onekey_se03_version: profile.versions.se03 ?? undefined,
    onekey_se03_hash: profile.verify?.se03Hash,
    onekey_se03_build_id: profile.verify?.se03BuildId,
    onekey_se03_boot_version: profile.versions.se03Boot ?? undefined,
    onekey_se03_boot_hash: profile.verify?.se03BootHash,
    onekey_se03_boot_build_id: profile.verify?.se03BootBuildId,
    onekey_se03_state: getSeState(deviceInfo?.se3),
    onekey_se04_version: profile.versions.se04 ?? undefined,
    onekey_se04_hash: profile.verify?.se04Hash,
    onekey_se04_build_id: profile.verify?.se04BuildId,
    onekey_se04_boot_version: profile.versions.se04Boot ?? undefined,
    onekey_se04_boot_hash: profile.verify?.se04BootHash,
    onekey_se04_boot_build_id: profile.verify?.se04BootBuildId,
    onekey_se04_state: getSeState(deviceInfo?.se4),
  };
}

export async function requestProtocolV2LegacyFeatures({
  commands,
  timeoutMs,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
}) {
  const message = await requestProtocolV2DeviceInfo({ commands, timeoutMs });
  const profile = buildProfileFromProtocolV2({
    deviceInfo: message,
    sources: ['deviceInfo'],
    scope: 'verify',
  });
  return buildProtocolV2FeaturesFromProfile(profile, message);
}

export async function requestProtocolV2DeviceInfo({
  commands,
  timeoutMs = PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  request = PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
  request?: object;
}): Promise<ProtocolV2DeviceInfo> {
  const { message } = await commands.typedCall('DevGetDeviceInfo', 'DeviceInfo', request, {
    timeoutMs,
  });
  return message as unknown as ProtocolV2DeviceInfo;
}
