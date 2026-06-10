import { EDeviceType } from '@onekeyfe/hd-shared';

import { getProtocolV2SeState } from '../protocols/protocol-v2/features';

import type { Features } from '../types';
import type { DeviceProfile } from '../types/api/getDeviceInfo';
import type { ProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';

const parseProtocolV2Version = (version?: string | null): [number, number, number] => {
  if (!version) return [0, 0, 0];
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(part => Number(part) || 0);
  return [major, minor, patch];
};

/**
 * Protocol V2 的 legacy `Features` 兼容视图。
 *
 * SDK 内部标准模型是 DeviceProfile；该函数只为 getFeatures() 等旧 API
 * 临时合成 Features 形状的数据，不应被内部逻辑消费。
 *
 * 注意：以下字段在 V2 协议中没有等价信息，使用保守占位值——
 * bootloader_mode/firmware_present 恒 false、unlocked 恒 false、
 * capabilities 恒空、pin_protection/safety_checks 等恒 null。
 * 内部判断请使用 device.profile / getCurrent* accessor，而不是这些占位值。
 */
export const buildProtocolV2GetFeaturesPayload = (
  profile: DeviceProfile,
  deviceInfo?: ProtocolV2DeviceInfo
): Features => {
  const firmwareVersion = profile.versions.firmware;
  const [fwMajor, fwMinor, fwPatch] = parseProtocolV2Version(firmwareVersion);

  return {
    vendor: 'onekey.so',
    major_version: fwMajor,
    minor_version: fwMinor,
    patch_version: fwPatch,
    bootloader_mode: false,
    device_id: profile.deviceId,
    pin_protection: null,
    passphrase_protection: profile.status.passphraseProtection,
    language: profile.status.language,
    label: profile.label,
    initialized: profile.status.initialized ?? false,
    revision: null,
    bootloader_hash: null,
    imported: null,
    unlocked: false,
    firmware_present: false,
    needs_backup: profile.status.backupRequired,
    flags: null,
    model: 'pro2',
    fw_major: fwMajor,
    fw_minor: fwMinor,
    fw_patch: fwPatch,
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
    protocol_version: deviceInfo?.protocol_version ?? null,
    onekey_device_type: EDeviceType.Pro2,
    onekey_serial_no: profile.serialNo,
    serial_no: profile.serialNo,
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
    onekey_se01_state: getProtocolV2SeState(deviceInfo?.se1),
    onekey_se02_version: profile.versions.se02 ?? undefined,
    onekey_se02_hash: profile.verify?.se02Hash,
    onekey_se02_build_id: profile.verify?.se02BuildId,
    onekey_se02_boot_version: profile.versions.se02Boot ?? undefined,
    onekey_se02_boot_hash: profile.verify?.se02BootHash,
    onekey_se02_boot_build_id: profile.verify?.se02BootBuildId,
    onekey_se02_state: getProtocolV2SeState(deviceInfo?.se2),
    onekey_se03_version: profile.versions.se03 ?? undefined,
    onekey_se03_hash: profile.verify?.se03Hash,
    onekey_se03_build_id: profile.verify?.se03BuildId,
    onekey_se03_boot_version: profile.versions.se03Boot ?? undefined,
    onekey_se03_boot_hash: profile.verify?.se03BootHash,
    onekey_se03_boot_build_id: profile.verify?.se03BootBuildId,
    onekey_se03_state: getProtocolV2SeState(deviceInfo?.se3),
    onekey_se04_version: profile.versions.se04 ?? undefined,
    onekey_se04_hash: profile.verify?.se04Hash,
    onekey_se04_build_id: profile.verify?.se04BuildId,
    onekey_se04_boot_version: profile.versions.se04Boot ?? undefined,
    onekey_se04_boot_hash: profile.verify?.se04BootHash,
    onekey_se04_boot_build_id: profile.verify?.se04BootBuildId,
    onekey_se04_state: getProtocolV2SeState(deviceInfo?.se4),
  };
};
