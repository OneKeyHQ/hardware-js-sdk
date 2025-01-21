import semver from 'semver';

import { createDeferred, ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { getDeviceType, getDeviceUUID, wait } from '../../utils';
import { CoreMessage, createUiMessage, UI_REQUEST } from '../../events';
import type { Device } from '../../device/Device';
import { DataManager } from '../../data-manager';
import { DevicePool } from '../../device/DevicePool';
import { type KnownDevice, DeviceModelToTypes, Features, IVersionArray } from '../../types';
import type { TypedCall } from '../../device/DeviceCommands';

// Constants
export const NEW_BOOT_UPRATE_FIRMWARE_VERSION = '2.4.5';

// Reboot constants
export const REBOOT_TYPE = {
  REBOOT_NORMAL: 0,
  REBOOT_BOARDLOADER: 1,
  REBOOT_BOOTLOADER: 2,
};

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

export const rebootDevice = async (typedCall: TypedCall, rebootType: number) => {
  // rebootDevice 会包默认会报错：失联。
  try {
    await typedCall('Reboot', 'Success', {
      reboot_type: rebootType,
    });
  } catch (e) {
    console.log('rebootDevice', e);
  }
};

export const createFolder = async (typedCall: TypedCall, path: string) => {
  await typedCall('EmmcDirMake', 'Success', {
    path,
  });
};

export const getFolderDir = async (typedCall: TypedCall, path: string) =>
  typedCall('EmmcDirList', 'EmmcDir', {
    path,
  });
