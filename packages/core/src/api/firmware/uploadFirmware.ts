import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { wait, getDeviceBootloaderVersion, getDeviceType } from '../../utils';
import { CoreMessage } from '../../events';
import { PROTO } from '../../constants';
import type { Device } from '../../device/Device';
import type { TypedCall } from '../../device/DeviceCommands';
import { DeviceModelToTypes } from '../../types';
import { emmcCommonUpdateProcess } from './utils/typedCallHelper';
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
