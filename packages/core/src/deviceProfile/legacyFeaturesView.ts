import { EDeviceType } from '@onekeyfe/hd-shared';

import { getProtocolV2SeState, getProtocolV2SeType } from '../protocols/protocol-v2/features';

import type { Features } from '../types';
import type { DevFirmwareImageInfo, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

const parseProtocolV2Version = (version?: string | null): [number, number, number] => {
  if (!version) return [0, 0, 0];
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(part => Number(part) || 0);
  return [major, minor, patch];
};

const getImageVersion = (image?: DevFirmwareImageInfo | null) => image?.version ?? null;

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

const getImageBuildId = (image?: DevFirmwareImageInfo | null) => image?.build_id ?? undefined;

const getImageHash = (image?: DevFirmwareImageInfo | null) => bytesToHex(image?.hash);

const firstValue = <T>(...values: Array<T | null | undefined>) =>
  values.find(value => value !== undefined && value !== null);

const firstVersion = (...versions: Array<string | null | undefined>) =>
  versions.find(version => Boolean(version && version !== '0.0.0')) ?? undefined;

/**
 * Protocol V2 的 `Features` 视图。
 *
 * 这是 Device 内部唯一缓存状态。字段只来自 DevGetDeviceInfo 或前一次
 * features 缓存的同名字段级合并；不存在协议等价语义的字段保持 null/空值，
 * 不再通过 DeviceProfile 或 transport path 做身份兜底。
 */
export const buildProtocolV2FeaturesPayload = (
  deviceInfo?: ProtocolV2DeviceInfo,
  previous?: Features
): Features => {
  const firmwareVersion = firstVersion(
    getImageVersion(deviceInfo?.fw?.app),
    previous?.onekey_firmware_version
  );
  const bootloaderVersion = firstVersion(
    getImageVersion(deviceInfo?.fw?.boot),
    previous?.onekey_boot_version,
    previous?.bootloader_version
  );
  const boardVersion = firstVersion(
    getImageVersion(deviceInfo?.fw?.board),
    previous?.onekey_board_version
  );
  const bleVersion = firstVersion(
    getImageVersion(deviceInfo?.bt?.app),
    previous?.onekey_ble_version,
    previous?.ble_ver
  );
  const serialNo =
    firstValue(deviceInfo?.hw?.serial_no, previous?.serial_no, previous?.onekey_serial_no) ?? '';
  const label = firstValue(deviceInfo?.status?.label, previous?.label) ?? null;
  const bleName = firstValue(deviceInfo?.bt?.adv_name, previous?.onekey_ble_name, previous?.ble_name);
  const initialized = firstValue(deviceInfo?.status?.init_states, previous?.initialized) ?? null;
  const passphraseProtection =
    firstValue(deviceInfo?.status?.passphrase_protection, previous?.passphrase_protection) ?? null;
  const language = firstValue(deviceInfo?.status?.language, previous?.language) ?? null;
  const backupRequired = firstValue(deviceInfo?.status?.backup_required, previous?.needs_backup) ?? null;
  const bleEnabled = firstValue(deviceInfo?.status?.bt_enable, previous?.ble_enable);
  const [fwMajor, fwMinor, fwPatch] = parseProtocolV2Version(firmwareVersion);

  return {
    vendor: 'onekey.so',
    major_version: fwMajor,
    minor_version: fwMinor,
    patch_version: fwPatch,
    bootloader_mode: previous?.bootloader_mode ?? false,
    device_id: null,
    pin_protection: null,
    passphrase_protection: passphraseProtection,
    language,
    label,
    initialized,
    revision: null,
    bootloader_hash: null,
    imported: null,
    unlocked: previous?.unlocked ?? null,
    firmware_present: false,
    needs_backup: backupRequired,
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
    protocol_version: deviceInfo?.protocol_version ?? previous?.protocol_version ?? null,
    onekey_device_type: EDeviceType.Pro2,
    onekey_serial_no: serialNo || undefined,
    serial_no: serialNo || undefined,
    ble_enable: bleEnabled ?? undefined,
    onekey_ble_name: bleName ?? undefined,
    ble_name: bleName ?? undefined,
    onekey_firmware_version: firmwareVersion ?? undefined,
    onekey_firmware_build_id:
      getImageBuildId(deviceInfo?.fw?.app) ?? previous?.onekey_firmware_build_id,
    onekey_firmware_hash: getImageHash(deviceInfo?.fw?.app) ?? previous?.onekey_firmware_hash,
    onekey_boot_version: bootloaderVersion,
    bootloader_version: bootloaderVersion,
    onekey_boot_build_id: getImageBuildId(deviceInfo?.fw?.boot) ?? previous?.onekey_boot_build_id,
    onekey_boot_hash: getImageHash(deviceInfo?.fw?.boot) ?? previous?.onekey_boot_hash,
    onekey_board_version: boardVersion,
    onekey_board_build_id:
      getImageBuildId(deviceInfo?.fw?.board) ?? previous?.onekey_board_build_id,
    onekey_board_hash: getImageHash(deviceInfo?.fw?.board) ?? previous?.onekey_board_hash,
    onekey_ble_version: bleVersion,
    ble_ver: bleVersion,
    onekey_ble_build_id: getImageBuildId(deviceInfo?.bt?.app) ?? previous?.onekey_ble_build_id,
    onekey_ble_hash: getImageHash(deviceInfo?.bt?.app) ?? previous?.onekey_ble_hash,
    // Pro2 的 SE 类型在 DevGetDeviceInfo 的 se1.type 上报（如 THD89）
    onekey_se_type: getProtocolV2SeType(deviceInfo?.se1) ?? previous?.onekey_se_type,
    onekey_se01_version: firstVersion(
      getImageVersion(deviceInfo?.se1?.app),
      previous?.onekey_se01_version
    ),
    onekey_se01_hash: getImageHash(deviceInfo?.se1?.app) ?? previous?.onekey_se01_hash,
    onekey_se01_build_id: getImageBuildId(deviceInfo?.se1?.app) ?? previous?.onekey_se01_build_id,
    onekey_se01_boot_version: firstVersion(
      getImageVersion(deviceInfo?.se1?.boot),
      previous?.onekey_se01_boot_version
    ),
    onekey_se01_boot_hash: getImageHash(deviceInfo?.se1?.boot) ?? previous?.onekey_se01_boot_hash,
    onekey_se01_boot_build_id:
      getImageBuildId(deviceInfo?.se1?.boot) ?? previous?.onekey_se01_boot_build_id,
    onekey_se01_state: getProtocolV2SeState(deviceInfo?.se1) ?? previous?.onekey_se01_state,
    onekey_se02_version: firstVersion(
      getImageVersion(deviceInfo?.se2?.app),
      previous?.onekey_se02_version
    ),
    onekey_se02_hash: getImageHash(deviceInfo?.se2?.app) ?? previous?.onekey_se02_hash,
    onekey_se02_build_id: getImageBuildId(deviceInfo?.se2?.app) ?? previous?.onekey_se02_build_id,
    onekey_se02_boot_version: firstVersion(
      getImageVersion(deviceInfo?.se2?.boot),
      previous?.onekey_se02_boot_version
    ),
    onekey_se02_boot_hash: getImageHash(deviceInfo?.se2?.boot) ?? previous?.onekey_se02_boot_hash,
    onekey_se02_boot_build_id:
      getImageBuildId(deviceInfo?.se2?.boot) ?? previous?.onekey_se02_boot_build_id,
    onekey_se02_state: getProtocolV2SeState(deviceInfo?.se2) ?? previous?.onekey_se02_state,
    onekey_se03_version: firstVersion(
      getImageVersion(deviceInfo?.se3?.app),
      previous?.onekey_se03_version
    ),
    onekey_se03_hash: getImageHash(deviceInfo?.se3?.app) ?? previous?.onekey_se03_hash,
    onekey_se03_build_id: getImageBuildId(deviceInfo?.se3?.app) ?? previous?.onekey_se03_build_id,
    onekey_se03_boot_version: firstVersion(
      getImageVersion(deviceInfo?.se3?.boot),
      previous?.onekey_se03_boot_version
    ),
    onekey_se03_boot_hash: getImageHash(deviceInfo?.se3?.boot) ?? previous?.onekey_se03_boot_hash,
    onekey_se03_boot_build_id:
      getImageBuildId(deviceInfo?.se3?.boot) ?? previous?.onekey_se03_boot_build_id,
    onekey_se03_state: getProtocolV2SeState(deviceInfo?.se3) ?? previous?.onekey_se03_state,
    onekey_se04_version: firstVersion(
      getImageVersion(deviceInfo?.se4?.app),
      previous?.onekey_se04_version
    ),
    onekey_se04_hash: getImageHash(deviceInfo?.se4?.app) ?? previous?.onekey_se04_hash,
    onekey_se04_build_id: getImageBuildId(deviceInfo?.se4?.app) ?? previous?.onekey_se04_build_id,
    onekey_se04_boot_version: firstVersion(
      getImageVersion(deviceInfo?.se4?.boot),
      previous?.onekey_se04_boot_version
    ),
    onekey_se04_boot_hash: getImageHash(deviceInfo?.se4?.boot) ?? previous?.onekey_se04_boot_hash,
    onekey_se04_boot_build_id:
      getImageBuildId(deviceInfo?.se4?.boot) ?? previous?.onekey_se04_boot_build_id,
    onekey_se04_state: getProtocolV2SeState(deviceInfo?.se4) ?? previous?.onekey_se04_state,
  };
};
