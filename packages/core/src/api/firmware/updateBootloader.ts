import ByteBuffer from 'bytebuffer';
import semver from 'semver';
import { EDeviceType, type EFirmwareType } from '@onekeyfe/hd-shared';

import { DeviceModelToTypes } from '../../types';
import { getDeviceBootloaderVersion, getDeviceFirmwareVersion, getDeviceType } from '../../utils';
import { resolveDeviceBootloaderMode } from '../../utils/deviceFeaturesCompat';
import { DataManager } from '../../data-manager';
import { shouldUpdateBootloaderForClassicAndMini } from './bootloaderHelper';

import type { Features } from '../../types';
import type { FirmwareByteSource } from './FirmwareArtifactSource';

/** Touch 3.2.0 added ResourceUpdate (homescreen / UI resources). */
const RESOURCE_UPDATE_MIN_FIRMWARE_VERSION = '3.2.0';

/**
 * Touch/Pro 4.1.0 added ResourceUpdate("bootloader.bin") from firmware mode.
 * deviceUpdateBootloader uses that path when the device is not in bootloader.
 */
const FIRMWARE_MODE_BOOTLOADER_UPDATE_MIN_VERSION = '4.1.0';

/**
 * Pro MCU 4.14.0+ is larger than the pre-2.8.0 bootloader size limit and fails
 * load_image_header with "Update file header invalid".
 */
export const PRO_MCU_MIN_BOOTLOADER_VERSION = '2.8.0';

const canInstallBootloaderFromFirmware = (features: Features) => {
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  return (
    !!semver.valid(currentVersion) &&
    semver.gte(currentVersion, RESOURCE_UPDATE_MIN_FIRMWARE_VERSION) &&
    semver.gte(currentVersion, FIRMWARE_MODE_BOOTLOADER_UPDATE_MIN_VERSION)
  );
};

const canInstallBootloaderNow = (features: Features) =>
  resolveDeviceBootloaderMode(features) || canInstallBootloaderFromFirmware(features);

const proMcuRequiresNewerBootloader = (features: Features) => {
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  return (
    getDeviceType(features) === EDeviceType.Pro &&
    !!semver.valid(bootloaderVersion) &&
    semver.lt(bootloaderVersion, PRO_MCU_MIN_BOOTLOADER_VERSION)
  );
};

/**
 * Whether App/web should run deviceUpdateBootloader before a Touch/Pro MCU update.
 *
 * This is two separate questions:
 * 1. Capability — can deviceUpdateBootloader succeed right now?
 *    Firmware mode needs firmware >= 4.1.0 (ResourceUpdate bootloader.bin).
 *    Bootloader mode writes 0:boot/bootloader.bin and reboots into boardloader.
 * 2. Need — should we update boot at all?
 *    Config target (optional bump, e.g. 2.8.0 → 2.8.4), or Pro MCU compatibility
 *    (boot < 2.8.0 cannot parse current firmware-v8 packages).
 *
 * Firmware < 4.1.0 still in firmware mode cannot install boot here. Returning
 * true would make App call ResourceUpdate and fail. Those devices must enter
 * bootloader first (or use firmware-updater-web).
 */
export function checkNeedUpdateBootForTouch(features: Features, firmwareType: EFirmwareType) {
  const deviceType = getDeviceType(features);
  if (!DeviceModelToTypes.model_touch.includes(deviceType)) return false;

  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  if (proMcuRequiresNewerBootloader(features) && canInstallBootloaderNow(features)) {
    return true;
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features, firmwareType);
  if (!targetBootloaderVersion) return false;

  return (
    canInstallBootloaderFromFirmware(features) &&
    semver.lte(bootloaderVersion, targetBootloaderVersion.join('.'))
  );
}

export function checkNeedUpdateBootForClassicAndMini({
  features,
  willUpdateFirmware,
  firmwareType,
}: {
  features: Features;
  willUpdateFirmware?: string;
  firmwareType: EFirmwareType;
}) {
  const deviceType = getDeviceType(features);
  if (!DeviceModelToTypes.model_mini.includes(deviceType)) return false;
  if (!willUpdateFirmware) return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features, firmwareType);
  if (targetBootloaderVersion && semver.gte(bootloaderVersion, targetBootloaderVersion.join('.'))) {
    return false;
  }

  const bootloaderRelatedFirmwareVersion = DataManager.getBootloaderRelatedFirmwareVersion(
    features,
    firmwareType
  );
  if (!bootloaderRelatedFirmwareVersion) return false;

  return shouldUpdateBootloaderForClassicAndMini({
    currentVersion,
    bootloaderVersion,
    willUpdateFirmware,
    targetBootloaderVersion,
    bootloaderRelatedFirmwareVersion,
  });
}

const INIT_DATA_CHUNK_SIZE = 16 * 1024;
const readBootloaderLength = (chunk: Uint8Array) => {
  const buffer = ByteBuffer.wrap(chunk, undefined, undefined, true);
  buffer.LE();
  // byte 'O', 'K', 'T', 'B'
  buffer.readByte();
  buffer.readByte();
  buffer.readByte();
  buffer.readByte();
  // g_header_end - g_header
  const hdrlen = buffer.readUint32();
  // word 0
  buffer.readUint32();
  // codelen
  const codelen = buffer.readUint32();
  return hdrlen + codelen;
};

export function checkBootloaderLength(data: ArrayBuffer) {
  if (data.byteLength < 16) {
    return false;
  }
  const chunk = new Uint8Array(data.slice(0, Math.min(INIT_DATA_CHUNK_SIZE, data.byteLength)));
  return readBootloaderLength(chunk) === data.byteLength;
}

export const checkBootloaderSourceLength = async (source: FirmwareByteSource) => {
  if (source.size < 16) {
    return false;
  }
  const chunk = new Uint8Array(await source.readAt(0, Math.min(INIT_DATA_CHUNK_SIZE, source.size)));
  return readBootloaderLength(chunk) === source.size;
};
