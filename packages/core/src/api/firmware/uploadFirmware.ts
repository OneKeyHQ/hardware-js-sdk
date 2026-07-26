import semver from 'semver';
import { blake2s } from '@noble/hashes/blake2s';
import JSZip from 'jszip';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { LoggerNames, getDeviceBootloaderVersion, getLogger, wait } from '../../utils';
import { DEVICE, UI_REQUEST, createUiMessage } from '../../events';
import { DeviceModelToTypes } from '../../types';
import { bytesToHex } from '../helpers/hexUtils';
import { DataManager } from '../../data-manager';
import { DevicePool } from '../../device/DevicePool';
import { MemoryByteSource } from '../../firmware-update/memoryByteSource';
import { buildProtocolV1FeaturesPayload } from '../../deviceProfile';

import type { KnownDevice } from '../../types';
import type { TypedCall, TypedResponseMessage } from '../../device/DeviceCommands';
import type { PROTO } from '../../constants';
import type { CoreMessage, IFirmwareUpdateProgressType } from '../../events';
import type { Success } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';
import type { FirmwareByteSource } from '../../firmware-update/byteSource';

const NEW_BOOT_UPRATE_FIRMWARE_VERSION = '2.4.5';
const SESSION_ERROR = 'session not found';
const FIRMWARE_UPDATE_CONFIRM = 'Firmware install confirmed';

const Log = getLogger(LoggerNames.Method);

const isDeviceDisconnectedError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('device was disconnected') ||
    message.includes('transferIn') ||
    message.includes('USBDevice')
  );
};

const postConfirmationMessage = (device: Device) => {
  // only if firmware is already installed. fresh device does not require button confirmation
  if (device.features?.firmwarePresent) {
    device.emit(DEVICE.BUTTON, device, { code: 'ButtonRequest_FirmwareUpdate' });
  }
};

const postProgressMessage = (
  device: Device,
  progress: number,
  progressType: IFirmwareUpdateProgressType,
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
      device: device.toMessageObject() as KnownDevice,
      progress,
      progressType,
    })
  );
};

const postProcessingMessage = (
  type: 'firmware' | 'ble' | 'bootloader' | 'resource',
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_PROCESSING, {
      type,
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

const toArrayBuffer = (payload: ArrayBuffer | Buffer): ArrayBuffer => {
  if (payload instanceof ArrayBuffer) {
    return payload;
  }
  const bytes = new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  return bytes.slice().buffer;
};

export const readFirmwareByteSourceFully = async (
  source: FirmwareByteSource
): Promise<ArrayBuffer> => {
  const output = new Uint8Array(source.size);
  let offset = 0;
  while (offset < source.size) {
    const length = Math.min(256 * 1024, source.size - offset);
    const chunk = new Uint8Array(await source.readAt(offset, length));
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output.buffer;
};

export const uploadFirmwareFromByteSource = async (
  updateType: 'firmware' | 'ble',
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: FirmwareByteSource,
  rebootOnSuccess?: boolean,
  isUpdateBootloader?: boolean
) => {
  const deviceType = device.getCurrentDeviceType();
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    postConfirmationMessage(device);
    postProgressTip(device, 'ConfirmOnDevice', postMessage);

    const isFirmware = updateType === 'firmware';

    if (isFirmware && !isUpdateBootloader) {
      const newFeatures = await typedCall('GetFeatures', 'Features', {});
      const deviceBootloaderVersion = getDeviceBootloaderVersion(
        buildProtocolV1FeaturesPayload(newFeatures.message, device.features)
      ).join('.');
      const supportUpgradeFileHeader = semver.gte(deviceBootloaderVersion, '2.1.0');
      Log.debug('supportUpgradeFileHeader:', supportUpgradeFileHeader);

      if (supportUpgradeFileHeader) {
        // Extract and validate firmware header (first 1KB)
        const HEADER_SIZE = 1024;
        if (source.size < HEADER_SIZE) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `firmware payload too small: ${source.size} bytes, expected at least ${HEADER_SIZE} bytes`
          );
        }

        Log.debug('Uploading firmware header:', {
          size: HEADER_SIZE,
          totalSize: source.size,
        });
        postProgressTip(device, 'UploadingFirmwareHeader', postMessage);

        const header = new Uint8Array(await source.readAt(0, HEADER_SIZE));

        try {
          const headerRes = await typedCall('UpgradeFileHeader', 'Success', {
            data: bytesToHex(header),
          });

          const isUnknownMessage = headerRes.message?.message?.includes('Failure_UnknownMessage');

          if (headerRes.type !== 'Success' && !isUnknownMessage) {
            Log.error('Firmware header upload failed:', headerRes);
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              'failed to upload firmware header'
            );
          }
        } catch (error) {
          Log.error('Firmware header upload failed:', error);
          const message = error instanceof Error ? error.message : String(error ?? '');
          if (!message.includes('Failure_UnknownMessage')) {
            throw error;
          }
        }
        Log.debug('Firmware header uploaded successfully');
      }
    }

    const eraseCommand = isFirmware ? 'FirmwareErase' : 'FirmwareErase_ex';
    const eraseRes = await typedCall(eraseCommand as unknown as any, 'Success', {});
    if (eraseRes.type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'erase firmware error');
    }
    postProgressTip(device, 'FirmwareEraseSuccess', postMessage);

    postProgressMessage(device, 0, 'installingFirmware', postMessage);
    let updateResponse: TypedResponseMessage<'Success'>;
    try {
      const payload = await readFirmwareByteSourceFully(source);
      updateResponse = await typedCall('FirmwareUpload', 'Success', {
        payload,
      });
    } catch (error) {
      if (isDeviceDisconnectedError(error)) {
        Log.log('Rebooting device');
        updateResponse = {
          type: 'Success',
          message: { message: FIRMWARE_UPDATE_CONFIRM },
        };
      } else {
        throw error;
      }
    }
    postProgressMessage(device, 100, 'installingFirmware', postMessage);

    await waitBleInstall(updateType);
    if (updateResponse.type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'install firmware error');
    }
    return updateResponse.message;
  }

  if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    if (device.features) {
      const bootloaderVersion = getDeviceBootloaderVersion(device.features);
      if (semver.gte(bootloaderVersion.join('.'), NEW_BOOT_UPRATE_FIRMWARE_VERSION)) {
        const response = await newTouchUpdateProcess(
          updateType,
          postMessage,
          device,
          source,
          rebootOnSuccess
        );
        return response.message;
      }
    }

    postConfirmationMessage(device);
    postProgressTip(device, 'ConfirmOnDevice', postMessage);
    const length = source.size;

    let response = await typedCall('FirmwareErase', ['FirmwareRequest', 'Success'], { length });
    postProgressTip(device, 'FirmwareEraseSuccess', postMessage);
    while (response.type !== 'Success') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const start = response.message.offset!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const end = response.message.offset! + response.message.length!;
      const chunk = await source.readAt(start, end - start);

      if (start > 0) {
        postProgressMessage(
          device,
          Math.round((start / length) * 100),
          'transferData',
          postMessage
        );
      }

      response = await typedCall('FirmwareUpload', ['FirmwareRequest', 'Success'], {
        payload: chunk,
      });
      // @ts-expect-error
      if (response.type === 'CallMethodError') {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'upload firmware error');
      }
    }

    postProgressMessage(device, 100, 'transferData', postMessage);

    await waitBleInstall(updateType);
    return response.message;
  }

  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'uploadFirmware: unknown device model');
};

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
  },
  isUpdateBootloader?: boolean
) => {
  const source = new MemoryByteSource(toArrayBuffer(payload));
  try {
    return await uploadFirmwareFromByteSource(
      updateType,
      typedCall,
      postMessage,
      device,
      source,
      rebootOnSuccess,
      isUpdateBootloader
    );
  } finally {
    await source.close();
  }
};

const newTouchUpdateProcess = async (
  updateType: 'firmware' | 'ble',
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: FirmwareByteSource,
  rebootOnSuccess = true
) => {
  let typedCall = device.getCommands().typedCall.bind(device.getCommands());
  postProgressTip(device, 'StartTransferData', postMessage);
  // Write File
  const filePath = `0:${updateType === 'ble' ? 'ble-' : ''}firmware.bin`;
  const env = DataManager.getSettings('env');
  const perPackageSize = DataManager.isBleConnect(env) ? 16 : 128;
  const chunkSize = 1024 * perPackageSize;
  const totalChunks = Math.ceil(source.size / chunkSize);
  let offset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunkStart = i * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, source.size);
    const chunkLength = chunkEnd - chunkStart;
    const chunk = await source.readAt(chunkStart, chunkLength);
    const overwrite = i === 0;
    const progress = Math.round(((i + 1) / totalChunks) * 100);
    const writeRes = await emmcFileWriteWithRetry(
      device,
      filePath,
      chunkLength,
      offset,
      chunk,
      overwrite,
      progress
    );
    // @ts-expect-error
    offset += writeRes.message.processed_byte;
    postProgressMessage(device, progress, 'transferData', postMessage);
  }

  postConfirmationMessage(device);
  postProgressTip(device, 'ConfirmOnDevice', postMessage);
  postProgressTip(device, 'InstallingFirmware', postMessage);
  typedCall = device.getCommands().typedCall.bind(device.getCommands());
  // Firmware Update
  let response: TypedResponseMessage<'Success'>;
  try {
    response = await typedCall('FirmwareUpdateEmmc', 'Success', {
      path: filePath,
      reboot_on_success: rebootOnSuccess,
    });
  } catch (error) {
    if (isDeviceDisconnectedError(error)) {
      Log.log('Rebooting device');
      response = {
        type: 'Success',
        message: { message: FIRMWARE_UPDATE_CONFIRM },
      } as TypedResponseMessage<'Success'>;
    } else {
      throw error;
    }
  }

  if (
    response.type === 'Success' &&
    (response as any)?.message?.message === FIRMWARE_UPDATE_CONFIRM
  ) {
    const timeout = 2 * 60 * 1000;
    // eslint-disable-next-line no-constant-condition
    // Check if timeout exceeded
    const startTime = Date.now();
    const isBleReconnect = DataManager.isBleConnect(env);
    while (Date.now() - startTime < timeout) {
      try {
        if (isBleReconnect) {
          try {
            await device.deviceConnector?.acquire(device.originalDescriptor.id, null, true);
            const typedCall = device.getCommands().typedCall.bind(device.getCommands());
            await Promise.race([
              typedCall('Initialize', 'Features', {}),
              new Promise((_, reject) => {
                setTimeout(() => {
                  reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));
                }, 3000);
              }),
            ]);
          } catch (e) {
            // ignore error because of device is not connected
            Log.log('catch Bluetooth error when device is restarting: ', e);
          }
        } else {
          const deviceDiff = await device.deviceConnector?.enumerate();
          const devicesDescriptor = deviceDiff?.descriptors ?? [];
          const { deviceList } = await DevicePool.getDevices(
            devicesDescriptor,
            device.originalDescriptor.id
          );
          if (deviceList.length === 1) {
            device.updateFromCache(deviceList[0]);
            await device.acquire();
            device.commands.disposed = false;
            device.getCommands().mainId = device.mainId ?? '';
          }
        }
        const typedCall = device.getCommands().typedCall.bind(device.getCommands());
        await typedCall('GetFeatures', 'Features', {});
        DevicePool.resetState();
        break;
      } catch (error) {
        console.error('Device reconnect failed: ', error);
        Log.error('Device reconnect failed:', error);
        await wait(1000);
      }
    }
  }
  return response;
};

const emmcFileWriteWithRetry = async (
  device: Device,
  filePath: string,
  chunkLength: number,
  offset: number,
  chunk: ArrayBuffer,
  overwrite: boolean,
  progress: number
) => {
  const writeFunc = async () => {
    const typedCall = device.getCommands().typedCall.bind(device.getCommands());
    // @ts-expect-error
    const writeRes = await typedCall('EmmcFileWrite', 'EmmcFile', {
      file: {
        path: filePath,
        len: chunkLength,
        offset,
        data: chunk,
      },
      overwrite,
      append: offset !== 0,
      ui_percentage: progress,
    });
    if (writeRes.type !== 'EmmcFile') {
      // @ts-expect-error
      if (writeRes.type === 'CallMethodError') {
        if (((writeRes as any).message.error ?? '').indexOf(SESSION_ERROR) > -1) {
          throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, SESSION_ERROR);
        }
      }
      throw ERRORS.TypedError(HardwareErrorCode.EmmcFileWriteFirmwareError, 'transfer data error');
    }
    return writeRes;
  };

  let retryCount = 10;
  while (retryCount > 0) {
    try {
      const result = await writeFunc();
      return result;
    } catch (error) {
      Log.error(`emmcWrite error: `, error);
      retryCount--;
      if (retryCount === 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'transfer data error'
        );
      }
      const env = DataManager.getSettings('env');
      if (DataManager.isBleConnect(env)) {
        await wait(3000);
        await device.deviceConnector?.acquire(device.originalDescriptor.id, null, true);
        await device.initialize();
      } else if (
        error?.message?.indexOf(SESSION_ERROR) > -1 ||
        error?.response?.data?.indexOf(SESSION_ERROR) > -1
      ) {
        const deviceDiff = await device.deviceConnector?.enumerate();
        const devicesDescriptor = deviceDiff?.descriptors ?? [];
        const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined);
        if (deviceList.length === 1 && deviceList[0]?.isBootloader()) {
          device.updateFromCache(deviceList[0]);
          await device.acquire();
          device.getCommands().mainId = device.mainId ?? '';
        }
      }
      await wait(3000);
    }
  }
};

const INIT_DATA_CHUNK_SIZE = 16 * 1024;

const processResourceRequestFromByteSource = async (
  typedCall: TypedCall,
  res: TypedResponseMessage<'ResourceRequest'> | TypedResponseMessage<'Success'>,
  source: FirmwareByteSource
): Promise<Success> => {
  let response = res;
  while (response.type !== 'Success') {
    const { offset, data_length: dataLength } = response.message;
    if (
      offset === undefined ||
      dataLength === undefined ||
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(dataLength) ||
      offset < 0 ||
      offset >= source.size ||
      dataLength <= 0
    ) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'resource request range is invalid');
    }
    const length = Math.min(dataLength, source.size - offset);
    const payload = new Uint8Array(await source.readAt(offset, length));
    const digest = blake2s(payload);
    response = await typedCall('ResourceAck', ['ResourceRequest', 'Success'], {
      data_chunk: bytesToHex(payload),
      hash: bytesToHex(digest),
    });
  }
  return response.message;
};

export const updateResourceFromByteSource = async (
  typedCall: TypedCall,
  fileName: string,
  source: FirmwareByteSource,
  onConfirmAfter?: () => void
) => {
  if (!Number.isSafeInteger(source.size) || source.size <= 0) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'resource payload is empty');
  }
  const chunk = new Uint8Array(await source.readAt(0, Math.min(INIT_DATA_CHUNK_SIZE, source.size)));
  const digest = blake2s(chunk);

  const res = await typedCall('ResourceUpdate', ['ResourceRequest', 'Success'], {
    file_name: fileName,
    data_length: source.size,
    initial_data_chunk: bytesToHex(chunk),
    hash: bytesToHex(digest),
  });

  onConfirmAfter?.();
  return processResourceRequestFromByteSource(typedCall, res, source);
};

export const updateResource = async (
  typedCall: TypedCall,
  fileName: string,
  data: ArrayBuffer,
  onConfirmAfter?: () => void
) => {
  const source = new MemoryByteSource(data);
  try {
    return await updateResourceFromByteSource(typedCall, fileName, source, onConfirmAfter);
  } finally {
    await source.close();
  }
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
    postProgressMessage(device, Math.floor(progress), 'installingFirmware', postMessage);
  }

  postProgressMessage(device, 100, 'installingFirmware', postMessage);
  postProgressTip(device, 'UpdateSysResourceSuccess', postMessage);
  return true;
};

export interface FirmwareResourceByteSourceEntry {
  fileName: string;
  source: FirmwareByteSource;
}

export const updateResourcesFromByteSources = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  entries: readonly FirmwareResourceByteSourceEntry[]
) => {
  if (entries.length === 0) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'No resource artifacts were prepared');
  }
  postProgressTip(device, 'UpdateSysResource', postMessage);
  for (const [index, entry] of entries.entries()) {
    await updateResourceFromByteSource(typedCall, entry.fileName, entry.source);
    postProgressMessage(
      device,
      Math.floor(((index + 1) / entries.length) * 100),
      'installingFirmware',
      postMessage
    );
  }
  postProgressTip(device, 'UpdateSysResourceSuccess', postMessage);
  return true;
};

export const updateBootloader = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  data: ArrayBuffer
) => {
  const source = new MemoryByteSource(data);
  try {
    return await updateBootloaderFromByteSource(typedCall, postMessage, device, source);
  } finally {
    await source.close();
  }
};

export const updateBootloaderFromByteSource = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: FirmwareByteSource
) => {
  postProgressTip(device, 'UpdateBootloader', postMessage);
  postProgressMessage(device, 0, 'installingFirmware', postMessage);
  await updateResourceFromByteSource(typedCall, 'bootloader.bin', source, () => {
    postProcessingMessage('resource', postMessage);
  });
  postProgressMessage(device, 100, 'installingFirmware', postMessage);
  postProgressTip(device, 'UpdateBootloaderSuccess', postMessage);
  return true;
};
