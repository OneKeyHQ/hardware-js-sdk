import { blake2s } from '@noble/hashes/blake2s';
import JSZip from 'jszip';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Success } from '@onekeyfe/hd-transport';
import { wait } from '../../utils/index';
import { DEVICE, CoreMessage, createUiMessage, UI_REQUEST } from '../../events';
import { PROTO } from '../../constants';
import type { Device } from '../../device/Device';
import type { TypedCall, TypedResponseMessage } from '../../device/DeviceCommands';
import { KnownDevice } from '../../types';
import { bytesToHex } from '../helpers/hexUtils';
import { getDeviceModel } from '../../utils/deviceFeaturesUtils';

const postConfirmationMessage = (device: Device) => {
  // only if firmware is already installed. fresh device does not require button confirmation
  if (device.features?.firmware_present) {
    device.emit(DEVICE.BUTTON, device, { code: 'ButtonRequest_FirmwareUpdate' });
  }
};

const postProgressMessage = (
  device: Device,
  progress: number,
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
      device: device.toMessageObject() as KnownDevice,
      progress,
    })
  );
};

const postProgressTip = (
  device: Device,
  message: string,
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
      device: device.toMessageObject() as KnownDevice,
      data: {
        message,
      },
    })
  );
};

export const waitBleInstall = async (updateType: string) => {
  if (updateType === 'ble') {
    // wait for device install
    await wait(10 * 1000);
  }
};

export const uploadFirmware = async (
  updateType: 'firmware' | 'ble',
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  { payload }: PROTO.FirmwareUpload
) => {
  const deviceModel = getDeviceModel(device.features);
  if (deviceModel === 'model_mini') {
    postConfirmationMessage(device);
    postProgressTip(device, 'ConfirmOnDevice', postMessage);
    const eraseCommand = updateType === 'firmware' ? 'FirmwareErase' : 'FirmwareErase_ex';
    const eraseRes = await typedCall(eraseCommand as unknown as any, 'Success', {});
    if (eraseRes.type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'erase firmware error');
    }
    postProgressTip(device, 'FirmwareEraseSuccess', postMessage);
    postProgressMessage(device, 0, postMessage);
    const { message } = await typedCall('FirmwareUpload', 'Success', {
      payload,
    });
    postProgressMessage(device, 100, postMessage);

    await waitBleInstall(updateType);
    return message;
  }

  if (deviceModel === 'model_touch') {
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

const processResourceRequest = async (
  typedCall: TypedCall,
  res: TypedResponseMessage<'ResourceRequest'> | TypedResponseMessage<'Success'>,
  data: ArrayBuffer
): Promise<Success> => {
  if (res.type === 'Success') {
    return res.message;
  }

  const { offset, data_length } = res.message;

  if (offset === undefined) {
    throw new Error('offset is undefined');
  }

  const payload = new Uint8Array(
    data.slice(offset, Math.min(offset + data_length, data.byteLength))
  );
  const digest = blake2s(payload);

  const resourceAckParams = {
    data_chunk: bytesToHex(payload),
    hash: bytesToHex(digest),
  };

  const response = await typedCall('ResourceAck', ['ResourceRequest', 'Success'], {
    ...resourceAckParams,
  });
  return processResourceRequest(typedCall, response, data);
};

// Fixed size
const INIT_DATA_CHUNK_SIZE = 16 * 1024;
export const updateResource = async (typedCall: TypedCall, fileName: string, data: ArrayBuffer) => {
  const chunk = new Uint8Array(data.slice(0, Math.min(INIT_DATA_CHUNK_SIZE, data.byteLength)));
  const digest = blake2s(chunk);

  const res = await typedCall('ResourceUpdate', ['ResourceRequest', 'Success'], {
    file_name: fileName,
    data_length: data.byteLength,
    initial_data_chunk: bytesToHex(chunk),
    hash: bytesToHex(digest),
  });

  return processResourceRequest(typedCall, res, data);
};

export const updateResources = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: ArrayBuffer
) => {
  postProgressTip(device, 'UpdateSysResource', postMessage);

  const zipData = await JSZip.loadAsync(source);
  const files = Object.entries(zipData.files);

  let progress = 0;
  const stepProgress = 100 / files.length;

  for (const [fileName, file] of files) {
    const name = fileName.split('/').pop();
    if (!file.dir && fileName.indexOf('__MACOSX') === -1 && name) {
      const data = await file.async('arraybuffer');
      await updateResource(typedCall, name, data);
    }

    progress += stepProgress;
    postProgressMessage(device, Math.floor(progress), postMessage);
  }

  postProgressMessage(device, 100, postMessage);
  postProgressTip(device, 'UpdateSysResourceSuccess', postMessage);
  return true;
};

export const updateBootloader = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: ArrayBuffer
) => {
  postProgressTip(device, 'UpdateBootloader', postMessage);
  postProgressMessage(device, Math.floor(0), postMessage);
  await updateResource(typedCall, 'bootloader.bin', source);
  postProgressMessage(device, Math.floor(100), postMessage);
  postProgressTip(device, 'UpdateBootloaderSuccess', postMessage);
  return true;
};
