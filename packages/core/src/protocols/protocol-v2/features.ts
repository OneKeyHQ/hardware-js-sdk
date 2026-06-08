import { EDeviceType } from '@onekeyfe/hd-shared';

import type { Features } from '../../types';
import type { DeviceCommands } from '../../device/DeviceCommands';

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

function bytesToHex(value: unknown): string | undefined {
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
}

function getImageVersion(image?: ProtocolV2FirmwareImageInfo) {
  return image?.version || undefined;
}

function getImageBuildId(image?: ProtocolV2FirmwareImageInfo) {
  return image?.build_id || undefined;
}

function getImageHash(image?: ProtocolV2FirmwareImageInfo) {
  return bytesToHex(image?.hash);
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

export function normalizeProtocolV2Features(
  _descriptor: unknown,
  deviceInfo?: ProtocolV2DeviceInfo
): Features {
  const features = createBaseFeatures();
  if (!deviceInfo) return features;

  const serialNo = deviceInfo.hw?.serial_no;
  const firmwareVersion = getImageVersion(deviceInfo.fw?.app);
  const [fwMajor, fwMinor, fwPatch] = parseVersion(firmwareVersion);

  return {
    ...features,
    major_version: fwMajor,
    minor_version: fwMinor,
    patch_version: fwPatch,
    fw_major: fwMajor,
    fw_minor: fwMinor,
    fw_patch: fwPatch,
    device_id: serialNo ?? features.device_id,
    serial_no: serialNo ?? features.serial_no,
    onekey_serial_no: serialNo ?? features.onekey_serial_no,
    protocol_version: deviceInfo.protocol_version ?? features.protocol_version,
    label: deviceInfo.status?.label ?? features.label,
    language: deviceInfo.status?.language ?? features.language,
    initialized: deviceInfo.status?.init_states ?? features.initialized,
    passphrase_protection:
      deviceInfo.status?.passphrase_protection ?? features.passphrase_protection,
    needs_backup: deviceInfo.status?.backup_required ?? features.needs_backup,
    ble_enable: deviceInfo.status?.bt_enable,
    onekey_ble_name: deviceInfo.bt?.adv_name,
    ble_name: deviceInfo.bt?.adv_name,
    onekey_firmware_version: firmwareVersion,
    onekey_firmware_build_id: getImageBuildId(deviceInfo.fw?.app),
    onekey_firmware_hash: getImageHash(deviceInfo.fw?.app),
    onekey_boot_version: getImageVersion(deviceInfo.fw?.boot),
    bootloader_version: getImageVersion(deviceInfo.fw?.boot),
    onekey_boot_build_id: getImageBuildId(deviceInfo.fw?.boot),
    onekey_boot_hash: getImageHash(deviceInfo.fw?.boot),
    onekey_board_version: getImageVersion(deviceInfo.fw?.board),
    onekey_board_build_id: getImageBuildId(deviceInfo.fw?.board),
    onekey_board_hash: getImageHash(deviceInfo.fw?.board),
    onekey_ble_version: getImageVersion(deviceInfo.bt?.app),
    ble_ver: getImageVersion(deviceInfo.bt?.app),
    onekey_ble_build_id: getImageBuildId(deviceInfo.bt?.app),
    onekey_ble_hash: getImageHash(deviceInfo.bt?.app),
    onekey_se01_version: getImageVersion(deviceInfo.se1?.app),
    onekey_se01_hash: getImageHash(deviceInfo.se1?.app),
    onekey_se01_build_id: getImageBuildId(deviceInfo.se1?.app),
    onekey_se01_boot_version: getImageVersion(deviceInfo.se1?.boot),
    onekey_se01_boot_hash: getImageHash(deviceInfo.se1?.boot),
    onekey_se01_boot_build_id: getImageBuildId(deviceInfo.se1?.boot),
    onekey_se01_state: getSeState(deviceInfo.se1),
    onekey_se02_version: getImageVersion(deviceInfo.se2?.app),
    onekey_se02_hash: getImageHash(deviceInfo.se2?.app),
    onekey_se02_build_id: getImageBuildId(deviceInfo.se2?.app),
    onekey_se02_boot_version: getImageVersion(deviceInfo.se2?.boot),
    onekey_se02_boot_hash: getImageHash(deviceInfo.se2?.boot),
    onekey_se02_boot_build_id: getImageBuildId(deviceInfo.se2?.boot),
    onekey_se02_state: getSeState(deviceInfo.se2),
    onekey_se03_version: getImageVersion(deviceInfo.se3?.app),
    onekey_se03_hash: getImageHash(deviceInfo.se3?.app),
    onekey_se03_build_id: getImageBuildId(deviceInfo.se3?.app),
    onekey_se03_boot_version: getImageVersion(deviceInfo.se3?.boot),
    onekey_se03_boot_hash: getImageHash(deviceInfo.se3?.boot),
    onekey_se03_boot_build_id: getImageBuildId(deviceInfo.se3?.boot),
    onekey_se03_state: getSeState(deviceInfo.se3),
    onekey_se04_version: getImageVersion(deviceInfo.se4?.app),
    onekey_se04_hash: getImageHash(deviceInfo.se4?.app),
    onekey_se04_build_id: getImageBuildId(deviceInfo.se4?.app),
    onekey_se04_boot_version: getImageVersion(deviceInfo.se4?.boot),
    onekey_se04_boot_hash: getImageHash(deviceInfo.se4?.boot),
    onekey_se04_boot_build_id: getImageBuildId(deviceInfo.se4?.boot),
    onekey_se04_state: getSeState(deviceInfo.se4),
  };
}

export async function getProtocolV2Features({
  commands,
  descriptor,
  timeoutMs,
}: {
  commands: DeviceCommands;
  descriptor: unknown;
  timeoutMs?: number;
}) {
  const message = await getProtocolV2DeviceInfo({ commands, timeoutMs });
  return normalizeProtocolV2Features(descriptor, message);
}

export async function getProtocolV2DeviceInfo({
  commands,
  timeoutMs = PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  request = PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
  request?: object;
}): Promise<ProtocolV2DeviceInfo> {
  const { message } = await commands.typedCall('DeviceGetDeviceInfo', 'DeviceInfo', request, {
    timeoutMs,
  });
  return message as unknown as ProtocolV2DeviceInfo;
}
