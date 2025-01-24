import semver from 'semver';

import { createDeferred, ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  wait,
} from '../../../utils';
import { CoreMessage, createUiMessage, UI_REQUEST } from '../../../events';
import type { Device } from '../../../device/Device';
import { DataManager } from '../../../data-manager';
import { DevicePool } from '../../../device/DevicePool';
import { type KnownDevice, DeviceModelToTypes, Features, IVersionArray } from '../../../types';
import { INIT_DATA_CHUNK_SIZE } from './const';

function postTipMessage(
  device: Device,
  postMessage: (message: CoreMessage) => void,
  message: string
) {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
      device: device.toMessageObject() as KnownDevice,
      data: {
        message,
      },
    })
  );
}
async function checkDeviceToBootloader(device: any, connectId?: string) {
  const checkPromise = createDeferred();
  const env = DataManager.getSettings('env');
  const isBleReconnect = connectId && DataManager.isBleConnect(env);
  const intervalTimer = setInterval(
    async () => {
      if (isBleReconnect) {
        try {
          await device.deviceConnector?.acquire(device.originalDescriptor.id, null, true);
          await device.initialize();
          if (device.features?.bootloader_mode) {
            clearInterval(intervalTimer);
            checkPromise?.resolve(true);
          }
        } catch (e) {
          // ignore error
        }
      } else {
        const deviceDiff = await device.deviceConnector?.enumerate();
        const devicesDescriptor = deviceDiff?.descriptors ?? [];
        const { deviceList } = await DevicePool.getDevices(devicesDescriptor, connectId);
        if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
          device.updateFromCache(deviceList[0]);
          device.commands.disposed = false;
          clearInterval(intervalTimer);
          checkPromise?.resolve(true);
        }
      }
    },
    isBleReconnect ? 3000 : 2000
  );
  setTimeout(() => {
    if (checkPromise) {
      clearInterval(intervalTimer);
      checkPromise.reject(new Error());
    }
  }, 30000);
  return checkPromise.promise;
}

export async function enterBootloaderMode(
  device: Device,
  postMessage: (message: CoreMessage) => void,
  connectId?: string
) {
  const { features } = device;
  const { commands } = device;

  if (!features?.bootloader_mode && features) {
    const uuid = getDeviceUUID(features);
    const deviceType = getDeviceType(features);

    try {
      postTipMessage(device, postMessage, 'AutoRebootToBootloader');
      const bootRes = await commands.typedCall('DeviceBackToBoot', 'Success');
      // @ts-expect-error
      if (bootRes.type === 'CallMethodError') {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
      }

      postTipMessage(device, postMessage, 'GoToBootloaderSuccess');
      const isInBootloader = await checkDeviceToBootloader(device, connectId);
      if (!isInBootloader) {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
      }

      if (DeviceModelToTypes.model_classic.includes(deviceType)) {
        DevicePool.clearDeviceCache(uuid);
      }
      delete DevicePool.devicesCache[''];

      /**
       * Touch 1 with bootloader v2.5.0 issue: BLE chip need more time for looking up name, here change the delay time to 3000ms after rebooting.
       */
      const isTouch = DeviceModelToTypes.model_touch.includes(deviceType);
      await wait(isTouch ? 3000 : 1500);
    } catch (e) {
      if (e instanceof HardwareError) {
        throw e;
      }
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
    }
  }
}

export function shouldUpdateBootloaderForClassicAndMini({
  currentVersion,
  bootloaderVersion,
  willUpdateFirmware,
  targetBootloaderVersion,
  bootloaderRelatedFirmwareVersion,
}: {
  currentVersion: string;
  bootloaderVersion: string;
  willUpdateFirmware: string;
  targetBootloaderVersion?: IVersionArray;
  bootloaderRelatedFirmwareVersion: IVersionArray;
}) {
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

export function isEnteredManuallyBoot(features: Features, updateType: string) {
  const deviceType = getDeviceType(features);
  const isMini = deviceType === 'mini';
  const isBoot183ClassicUpBle =
    updateType === 'firmware' &&
    deviceType === 'classic' &&
    features.bootloader_version === '1.8.3';
  return isMini || isBoot183ClassicUpBle;
}

export function checkNeedUpdateBootForTouch(features: Features) {
  const deviceType = getDeviceType(features);
  if (!DeviceModelToTypes.model_touch.includes(deviceType)) return false;
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
  willUpdateFirmware?: string
) {
  const deviceType = getDeviceType(features);
  if (!DeviceModelToTypes.model_mini.includes(deviceType)) return false;
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

  return shouldUpdateBootloaderForClassicAndMini({
    currentVersion,
    bootloaderVersion,
    willUpdateFirmware,
    targetBootloaderVersion,
    bootloaderRelatedFirmwareVersion,
  });
}

export function checkBootloaderLength(data: ArrayBuffer) {
  if (!data) {
    throw new Error('bootloader data is null');
  }
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
