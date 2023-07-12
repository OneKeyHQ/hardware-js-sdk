import ByteBuffer from 'bytebuffer';
import semver from 'semver';
import { Features } from '../../types';
import { getDeviceType } from '../../utils';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../../utils/deviceFeaturesUtils';
import { DataManager } from '../../data-manager';

export function checkNeedUpdateBootForTouch(features: Features) {
  const deviceType = getDeviceType(features);
  if (deviceType !== 'touch') return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features);
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

export function checkNeedUpdateBootForClassicAndMini(
  features: Features,
  willUpdateFirmware: string
) {
  const deviceType = getDeviceType(features);
  if (deviceType !== 'classic' && deviceType !== 'mini') return false;
  if (!willUpdateFirmware) return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features);
  if (targetBootloaderVersion && semver.gte(bootloaderVersion, targetBootloaderVersion.join('.'))) {
    return false;
  }

  const bootloaderRelatedFirmwareVersion =
    DataManager.getBootloaderRelatedFirmwareVersion(features);
  if (!bootloaderRelatedFirmwareVersion) return false;

  // If the current bootloader version is greater than or equal to the version that needs to be upgraded, then no upgrade is required
  if (targetBootloaderVersion && semver.gte(bootloaderVersion, targetBootloaderVersion.join('.'))) {
    return false;
  }

  if (semver.gte(willUpdateFirmware, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  // The current version is greater than the relatedVersion and the bootloader version is lower than the target bootloader version
  if (semver.gte(currentVersion, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  return false;
}

const INIT_DATA_CHUNK_SIZE = 16 * 1024;
export function checkBootloaderLength(data: ArrayBuffer) {
  const chunk = new Uint8Array(data.slice(0, Math.min(INIT_DATA_CHUNK_SIZE, data.byteLength)));
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
  const bootloaderLength = hdrlen + codelen;
  return bootloaderLength === data.byteLength;
}
