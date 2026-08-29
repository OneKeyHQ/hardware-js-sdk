import ByteBuffer from 'bytebuffer';
import semver from 'semver';
import { EDeviceType, type EFirmwareType } from '@onekeyfe/hd-shared';

import { DeviceModelToTypes } from '../../types';
import { getDeviceBootloaderVersion, getDeviceFirmwareVersion, getDeviceType } from '../../utils';
import { DataManager } from '../../data-manager';
import { shouldUpdateBootloaderForClassicAndMini } from './bootloaderHelper';

import type { Features } from '../../types';
import type { FirmwareByteSource } from './FirmwareArtifactSource';

/** Pro MCU 4.14.0+ exceeds the pre-2.8.0 bootloader size limit. */
export const PRO_MCU_MIN_BOOTLOADER_VERSION = '2.8.0';

export function checkNeedUpdateBootForTouch(features: Features, firmwareType: EFirmwareType) {
  const deviceType = getDeviceType(features);
  if (!DeviceModelToTypes.model_touch.includes(deviceType)) return false;

  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  if (
    deviceType === EDeviceType.Pro &&
    semver.valid(bootloaderVersion) &&
    semver.lt(bootloaderVersion, PRO_MCU_MIN_BOOTLOADER_VERSION)
  ) {
    return true;
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features, firmwareType);
  if (!targetBootloaderVersion) return false;

  return (
    // support ResourceUpdate version 3.2.0
    semver.gte(currentVersion, '3.2.0') &&
    // support update bootloader version 4.1.0
    semver.gte(currentVersion, '4.1.0') &&
    // target bootloader version
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
