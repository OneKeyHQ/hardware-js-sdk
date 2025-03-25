import semver from 'semver';

import {
  createDeferred,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  EDeviceType,
} from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  wait,
  getLogger,
  LoggerNames,
} from '../../../utils';
import { CoreMessage, DEVICE } from '../../../events';
import type { Device } from '../../../device/Device';
import { DataManager } from '../../../data-manager';
import { DevicePool } from '../../../device/DevicePool';
import { DeviceModelToTypes, Features, IVersionArray } from '../../../types';
import { INIT_DATA_CHUNK_SIZE } from './const';
import { postProgressTip } from './uiHelper';

const Log = getLogger(LoggerNames.Method);

async function _promptDeviceInBootloaderForWebDevice({ device }: { device: Device }) {
  return new Promise((resolve, reject) => {
    if (device.listenerCount(DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE) > 0) {
      device.emit(DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE, device, (err, deviceId) => {
        if (err) {
          reject(err);
        } else {
          resolve(deviceId);
        }
      });
    }
  });
}

async function checkDeviceToBootloader(device: any, connectId?: string) {
  let isFirstCheck = true;
  let checkCount = 0;
  // eslint-disable-next-line prefer-const
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  async function _checkDeviceInBootloaderMode(
    device: Device,
    connectId: string | undefined,
    intervalTimer?: ReturnType<typeof setInterval>,
    timeoutTimer?: ReturnType<typeof setTimeout>
  ) {
    const deviceDiff = await device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];
    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, connectId);

    if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
      // should update current device from cache
      // because device was reboot and had some new requests
      device.updateFromCache(deviceList[0]);
      device.commands.disposed = false;

      if (intervalTimer) clearInterval(intervalTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      checkPromise?.resolve(true);
      return true;
    }
    return false;
  }
  const isTouchOrProDevice =
    getDeviceType(device?.features) === EDeviceType.Touch ||
    getDeviceType(device?.features) === EDeviceType.Pro;
  const checkPromise = createDeferred();
  const env = DataManager.getSettings('env');
  const isBleReconnect = connectId && DataManager.isBleConnect(env);
  const intervalTimer = setInterval(
    async () => {
      checkCount += 1;
      Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isFirstCheck: ', isFirstCheck);
      if (isTouchOrProDevice && isFirstCheck) {
        isFirstCheck = false;
        Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] wait 2000ms');
        await wait(2000);
      }

      console.log('checkCount: ', checkCount);
      console.log(
        'DataManager.isWebUsbConnect(DataManager.getSettings("env")): ',
        DataManager.isWebUsbConnect(DataManager.getSettings('env'))
      );
      if (checkCount > 4 && DataManager.isWebUsbConnect(DataManager.getSettings('env'))) {
        clearInterval(intervalTimer);
        clearTimeout(timeoutTimer);

        try {
          const confirmed = await _promptDeviceInBootloaderForWebDevice({
            device,
          });
          if (confirmed) {
            await _checkDeviceInBootloaderMode(device, connectId, intervalTimer, timeoutTimer);
          }
        } catch (e) {
          Log.log(
            'FirmwareUpdateV2 [checkDeviceToBootloader] promptDeviceInBootloaderForWebDevice failed: ',
            e
          );
          checkPromise?.reject(e);
        }
        return;
      }
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
  // check goto bootloader mode timeout and throw error
  timeoutTimer = setTimeout(() => {
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
      postProgressTip(device, 'AutoRebootToBootloader', postMessage);
      const bootRes = await commands.typedCall('DeviceBackToBoot', 'Success');
      // @ts-expect-error
      if (bootRes.type === 'CallMethodError') {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
      }

      postProgressTip(device, 'GoToBootloaderSuccess', postMessage);
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
      return true;
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
