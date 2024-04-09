import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
} from '@onekeyfe/hd-core';
import type { Features, OnekeyFeatures } from '@onekeyfe/hd-transport';

export function getDeviceBasicInfo(
  features: Features | undefined,
  onekeyFeatures: OnekeyFeatures | undefined
) {
  const deviceType = getDeviceType(features)?.toUpperCase() || 'UNKNOWN';
  const serialNumber = features && getDeviceUUID(features);

  const bleBuildId = onekeyFeatures?.onekey_ble_build_id || features?.onekey_ble_build_id;
  const bleVersion = `${features?.ble_ver}-${bleBuildId}`;

  const bootloaderBuildId = onekeyFeatures?.onekey_boot_build_id || features?.onekey_boot_build_id;
  const bootloaderVersion =
    features && `${getDeviceBootloaderVersion(features)?.join('.')}-${bootloaderBuildId}`;

  const boardloaderVersion =
    features && `${features?.onekey_board_version}-${onekeyFeatures?.onekey_board_build_id}`;

  const firmwareBuildId =
    onekeyFeatures?.onekey_firmware_build_id || features?.onekey_firmware_build_id;
  const firmwareVersion =
    features && `${getDeviceFirmwareVersion(features)?.join('.')}-${firmwareBuildId}`;

  return {
    deviceType,
    serialNumber,
    bleVersion,
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
  };
}

export function getDeviceInfo(
  features: Features | undefined,
  onekeyFeatures: OnekeyFeatures | undefined
) {
  const {
    deviceType,
    serialNumber,
    bleVersion,
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
  } = getDeviceBasicInfo(features, onekeyFeatures);

  const firmwareHash = onekeyFeatures?.onekey_firmware_hash || features?.onekey_firmware_hash;

  const bootloaderHash =
    onekeyFeatures?.onekey_boot_hash || features?.onekey_boot_hash || features?.bootloader_hash;

  const se01BuildId = onekeyFeatures?.onekey_se01_build_id || features?.onekey_se01_build_id;
  const se01Version = `${features?.onekey_se01_version || features?.se_ver}-${se01BuildId}`;
  const se01Hash = onekeyFeatures?.onekey_se01_hash;

  const se02BuildId = onekeyFeatures?.onekey_se02_build_id;
  const se02Version = `${features?.onekey_se02_version}-${se02BuildId}`;
  const se02Hash = onekeyFeatures?.onekey_se02_hash;

  const se03BuildId = onekeyFeatures?.onekey_se03_build_id;
  const se03Version = `${features?.onekey_se03_version}-${se03BuildId}`;
  const se03Hash = onekeyFeatures?.onekey_se03_hash;

  const se04BuildId = onekeyFeatures?.onekey_se04_build_id;
  const se04Version = `${features?.onekey_se04_version}-${se04BuildId}`;
  const se04Hash = onekeyFeatures?.onekey_se04_hash;

  const boardloaderHash = onekeyFeatures?.onekey_board_hash || features?.onekey_board_hash;

  const bleHash = onekeyFeatures?.onekey_ble_hash || features?.onekey_ble_hash;

  return {
    deviceType,
    serialNumber,
    boardloaderVersion,
    boardloaderHash,
    bootloaderVersion,
    bootloaderHash,
    se01Version,
    se01Hash,
    se02Version,
    se02Hash,
    se03Version,
    se03Hash,
    se04Version,
    se04Hash,
    firmwareVersion,
    firmwareHash,
    bleVersion,
    bleHash,
  };
}
