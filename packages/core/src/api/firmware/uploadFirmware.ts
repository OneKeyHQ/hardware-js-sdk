import semver from 'semver';
import JSZip from 'jszip';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { wait, getDeviceBootloaderVersion, getDeviceType } from '../../utils';
import { CoreMessage } from '../../events';
import { PROTO } from '../../constants';
import type { Device } from '../../device/Device';
import type { TypedCall } from '../../device/DeviceCommands';
import { DeviceModelToTypes } from '../../types';
import { createFolder, emmcCommonUpdateProcess } from './utils/typedCallHelper';
import { NEW_BOOT_UPRATE_FIRMWARE_VERSION } from './utils/const';
import { postConfirmationMessage, postProgressTip, postProgressMessage } from './utils/uiHelper';
// Basic Utility Functions
export const waitBleInstall = async (updateType: string) => {
  if (updateType === 'ble') {
    // wait for device install
    await wait(10 * 1000);
  }
};

// Core Functions
export const uploadFirmware = async (
  updateType: 'firmware' | 'ble',
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  {
    payload,
    rebootOnSuccess,
  }: PROTO.FirmwareUpload & {
    rebootOnSuccess?: boolean;
  }
) => {
  const deviceType = getDeviceType(device.features);
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    postConfirmationMessage(device);
    postProgressTip(device, 'ConfirmOnDevice', postMessage);
    const eraseCommand = updateType === 'firmware' ? 'FirmwareErase' : 'FirmwareErase_ex';
    const eraseRes = await typedCall(eraseCommand as unknown as any, 'Success', {});
    if (eraseRes.type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'erase firmware error');
    }
    postProgressTip(device, 'FirmwareEraseSuccess', postMessage);
    postProgressMessage(device, 0, postMessage);
    const { message, type } = await typedCall('FirmwareUpload', 'Success', {
      payload,
    });
    postProgressMessage(device, 100, postMessage);

    await waitBleInstall(updateType);
    if (type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'install firmware error');
    }
    return message;
  }

  if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    if (device.features) {
      const bootloaderVersion = getDeviceBootloaderVersion(device.features);
      if (semver.gte(bootloaderVersion.join('.'), NEW_BOOT_UPRATE_FIRMWARE_VERSION)) {
        const filePath = `0:${updateType === 'ble' ? 'ble-' : ''}firmware.bin`;
        const response = await newTouchUpdateFirmwareProcess(
          postMessage,
          device,
          {
            payload,
            filePath,
          },
          rebootOnSuccess
        );
        return response.message;
      }
    }

    postConfirmationMessage(device);
    postProgressTip(device, 'ConfirmOnDevice', postMessage);
    const length = payload.byteLength;

    let response = await typedCall('FirmwareErase', ['FirmwareRequest', 'Success'], { length });
    postProgressTip(device, 'FirmwareEraseSuccess', postMessage);
    while (response.type !== 'Success') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const start = response.message.offset!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const end = response.message.offset! + response.message.length!;
      const chunk = payload.slice(start, end);

      if (start > 0) {
        postProgressMessage(device, Math.round((start / length) * 100), postMessage);
      }

      response = await typedCall('FirmwareUpload', ['FirmwareRequest', 'Success'], {
        payload: chunk,
      });
      // @ts-expect-error
      if (response.type === 'CallMethodError') {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'upload firmware error');
      }
    }

    postProgressMessage(device, 100, postMessage);

    await waitBleInstall(updateType);
    return response.message;
  }

  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'uploadFirmware: unknown device model');
};

const newTouchUpdateFirmwareProcess = async (
  postMessage: (message: CoreMessage) => void,
  device: Device,
  { payload, filePath }: PROTO.FirmwareUpload & { filePath: string },
  rebootOnSuccess = true
) => {
  let typedCall = device.getCommands().typedCall.bind(device.getCommands());
  postProgressTip(device, 'StartTransferData', postMessage);
  // Write File
  await emmcCommonUpdateProcess(device, { payload, filePath }, postMessage);

  postConfirmationMessage(device);
  postProgressTip(device, 'ConfirmOnDevice', postMessage);
  postProgressTip(device, 'InstallingFirmware', postMessage);
  typedCall = device.getCommands().typedCall.bind(device.getCommands());
  // Firmware Update
  const response = await typedCall('FirmwareUpdateEmmc', 'Success', {
    path: filePath,
    reboot_on_success: rebootOnSuccess,
  });
  return response;
};

export const updateResourcesInBootloaderMode = async (
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: ArrayBuffer
) => {
  // 更新资源需要进入bootloader模式, 然后使用emmc接口更新assets文件夹
  const bootloaderVersion = getDeviceBootloaderVersion(device.features).join('.');
  if (semver.lt(bootloaderVersion, NEW_BOOT_UPRATE_FIRMWARE_VERSION)) {
    throw new Error('bootloader version is too low to update resources in bootloader mode');
  }
  if (!device.isBootloader()) {
    throw new Error('device is not in bootloader mode');
  }

  if (device.features) {
    postProgressTip(device, 'UpdateSysResource', postMessage);

    const prepareResourceFolders = async (zipData: JSZip) => {
      const requiredFolders: Set<string> = new Set();
      for (const [key, value] of Object.entries(zipData.files)) {
        if (value.dir) {
          if (key.includes('assets')) {
            const name = key.slice(key.indexOf('/') + 1, key.length - 1);
            requiredFolders.add(name);
          }
        }
      }
      const folderList = Array.from(requiredFolders);
      for (const folder of folderList) {
        await createFolder(device, `0:/${folder}`);
      }
    };

    // 添加文件
    const uploadNewResources = async (newFiles: [string, JSZip.JSZipObject][]) => {
      let progress = 0;
      const stepProgress = 100 / newFiles.length;
      postProgressTip(device, 'StartTransferData', postMessage);

      const getResourcePath = (fileName: string): string => {
        const name = fileName.slice(fileName.indexOf('/') + 1, fileName.length);
        if (fileName.includes('assets/')) {
          return `0:/assets/${name.split('assets/')[1]}`;
        }

        if (fileName.includes('Resource')) {
          return `0:/res/${name.split('/').pop()}`;
        }

        return `0:/res/${name}`;
      };
      for (const [fileName, file] of newFiles) {
        if (!file.dir && fileName.indexOf('__MACOSX') === -1 && fileName) {
          const data = await file.async('arraybuffer');
          const path = getResourcePath(fileName);
          await emmcCommonUpdateProcess(
            device,
            {
              payload: data,
              filePath: path,
              manulProgress: Math.floor(progress),
            },
            postMessage
          );
        }
        progress += stepProgress;
        postProgressMessage(device, Math.floor(progress), postMessage);
      }
    };

    const zipData = await JSZip.loadAsync(source);

    await device.acquire();
    await prepareResourceFolders(zipData);

    const newFiles: [string, JSZip.JSZipObject][] = Object.entries(zipData.files);
    await uploadNewResources(newFiles);

    postProgressMessage(device, 100, postMessage);
    postProgressTip(device, 'UpdateSysResourceSuccess', postMessage);
    return true;
  }
};
