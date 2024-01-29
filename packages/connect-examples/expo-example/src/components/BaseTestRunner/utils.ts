import type { Features } from '@onekeyfe/hd-core';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
} from '@onekeyfe/hd-core';

export function getDeviceInfo(features: Features) {
  const deviceType = getDeviceType?.(features);
  const deviceUUID = getDeviceUUID?.(features);

  const firmwareVersion = getDeviceFirmwareVersion?.(features).join('.');
  const firmwareBuildId = features?.onekey_firmware_build_id || features?.build_id;

  const bootVersion = getDeviceBootloaderVersion?.(features).join('.');
  const bootHash = features?.onekey_boot_hash || features?.bootloader_hash;

  const seVersion = features?.onekey_se_version || features?.se_ver;
  const seHash = features?.onekey_se_hash;

  const boardVersion = features?.onekey_board_version;
  const boardHash = features?.onekey_board_hash;

  return {
    deviceType,
    deviceUUID,
    firmwareVersion,
    firmwareBuildId,
    bootVersion,
    bootHash,
    seVersion,
    seHash,
    boardVersion,
    boardHash,
  };
}
