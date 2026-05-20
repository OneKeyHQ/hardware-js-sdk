import { EDeviceType } from '@onekeyfe/hd-shared';

import type { Features } from '../../types';
import type { DeviceCommands } from '../../device/DeviceCommands';
import type { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';

type ProtocolV2Bytes = Uint8Array | number[] | string;

type ProtocolV2FirmwareImageInfo = {
  version?: string;
  build_id?: string;
  hash?: ProtocolV2Bytes;
};

type ProtocolV2SEInfo = {
  boot?: ProtocolV2FirmwareImageInfo;
  app?: ProtocolV2FirmwareImageInfo;
  type?: number;
  state?: number;
};

type ProtocolV2DeviceInfo = {
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

// const PROTOCOL_V2_DEVICE_INFO_REQUEST = {
//   targets: {
//     hw: true,
//     fw: true,
//     bt: true,
//     se1: true,
//     se2: true,
//     se3: true,
//     se4: true,
//     status: true,
//   },
//   types: {
//     version: true,
//     build_id: true,
//     hash: true,
//     specific: true,
//   },
// };

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

function getDescriptorId(descriptor: DeviceDescriptor) {
  return descriptor.path || descriptor.id || '';
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

function createBaseFeatures(descriptor: DeviceDescriptor): Features {
  const descriptorId = getDescriptorId(descriptor);
  return {
    vendor: 'onekey.so',
    major_version: 0,
    minor_version: 0,
    patch_version: 0,
    bootloader_mode: false,
    device_id: descriptorId,
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
    onekey_device_type: EDeviceType.Pro2,
    onekey_serial_no: descriptorId,
    serial_no: descriptorId,
  };
}

export function normalizeProtocolV2Features(
  descriptor: DeviceDescriptor,
  deviceInfo?: ProtocolV2DeviceInfo
): Features {
  const features = createBaseFeatures(descriptor);
  if (!deviceInfo) return features;

  const serialNo =
    deviceInfo.hw?.serial_no || features.onekey_serial_no || getDescriptorId(descriptor);
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
    device_id: serialNo,
    serial_no: serialNo,
    onekey_serial_no: serialNo,
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
    onekey_board_hash: getImageHash(deviceInfo.fw?.board),
    onekey_ble_version: getImageVersion(deviceInfo.bt?.app),
    ble_ver: getImageVersion(deviceInfo.bt?.app),
    onekey_ble_build_id: getImageBuildId(deviceInfo.bt?.app),
    onekey_ble_hash: getImageHash(deviceInfo.bt?.app),
    onekey_se01_version: getImageVersion(deviceInfo.se1?.app),
    onekey_se01_hash: getImageHash(deviceInfo.se1?.app),
    onekey_se01_build_id: getImageBuildId(deviceInfo.se1?.app),
    onekey_se01_state: getSeState(deviceInfo.se1),
    onekey_se02_version: getImageVersion(deviceInfo.se2?.app),
    onekey_se02_state: getSeState(deviceInfo.se2),
    onekey_se03_version: getImageVersion(deviceInfo.se3?.app),
    onekey_se03_state: getSeState(deviceInfo.se3),
    onekey_se04_version: getImageVersion(deviceInfo.se4?.app),
    onekey_se04_state: getSeState(deviceInfo.se4),
  };
}

export async function getProtocolV2Features({
  commands,
  descriptor,
  // onDeviceInfoError,
  timeoutMs,
}: {
  commands: DeviceCommands;
  descriptor: DeviceDescriptor;
  onDeviceInfoError?: (error: unknown) => void;
  timeoutMs?: number;
}) {
  const callOptions = timeoutMs ? { timeoutMs } : undefined;
  if (callOptions) {
    await commands.typedCall('Ping', 'Success', { message: 'init' }, callOptions);
  } else {
    await commands.typedCall('Ping', 'Success', { message: 'init' });
  }

  // DeviceGetDeviceInfo 暂时关闭，避免初始化阶段依赖固件侧 DeviceInfo 支持。
  // try {
  //   const { message } = callOptions
  //     ? await commands.typedCall(
  //         'DeviceGetDeviceInfo',
  //         'DeviceInfo',
  //         PROTOCOL_V2_DEVICE_INFO_REQUEST,
  //         callOptions
  //       )
  //     : await commands.typedCall(
  //         'DeviceGetDeviceInfo',
  //         'DeviceInfo',
  //         PROTOCOL_V2_DEVICE_INFO_REQUEST
  //       );
  //   return normalizeProtocolV2Features(descriptor, message as unknown as ProtocolV2DeviceInfo);
  // } catch (error) {
  //   onDeviceInfoError?.(error);
  //   return normalizeProtocolV2Features(descriptor);
  // }

  return normalizeProtocolV2Features(descriptor);
}
