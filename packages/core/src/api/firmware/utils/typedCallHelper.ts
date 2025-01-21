import { blake2s } from '@noble/hashes/blake2s';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Success } from '@onekeyfe/hd-transport';
import type { Device } from '../../../device/Device';
import { postProgressMessage } from './uiHelper';
import { bytesToHex } from '../../helpers/hexUtils';
import { DataManager } from '../../../data-manager';
import { DevicePool } from '../../../device/DevicePool';
import type { TypedCall, TypedResponseMessage } from '../../../device/DeviceCommands';
import { PROTO } from '../../../constants';
import { wait, LoggerNames, getLogger } from '../../../utils';

const SESSION_ERROR = 'session not found';
const Log = getLogger(LoggerNames.Core);
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

// Complex Process Functions
export const processResourceRequest = async (
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

/**
 * 在bootloader模式下更新文件
 * @param payload 文件数据
 * @param filePath 文件路径
 * @param manulProgress 手动进度
 */
export const emmcCommonUpdateProcess = async (
  device: Device,
  {
    payload,
    filePath,
    manulProgress,
  }: PROTO.FirmwareUpload & { filePath: string; manulProgress?: number }
) => {
  const env = DataManager.getSettings('env');
  const perPackageSize = DataManager.isBleConnect(env) ? 16 : 128;
  const chunkSize = 1024 * perPackageSize;
  const totalChunks = Math.ceil(payload.byteLength / chunkSize);
  let offset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunkStart = i * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, payload.byteLength);
    const chunkLength = chunkEnd - chunkStart;
    const chunk = payload.slice(chunkStart, chunkEnd);
    const overwrite = i === 0;
    const progress = Math.round(((i + 1) / totalChunks) * 100);
    const writeRes = await emmcFileWriteWithRetry(
      device,
      filePath,
      chunkLength,
      offset,
      chunk,
      overwrite,
      manulProgress ?? progress
    );
    // @ts-expect-error
    offset += writeRes.message.processed_byte;
    postProgressMessage(device, progress, postMessage);
  }
};

const emmcFileWriteWithRetry = async (
  device: Device,
  filePath: string,
  chunkLength: number,
  offset: number,
  chunk: ArrayBuffer,
  overwrite: boolean,
  progress: number | null
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
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'emmc file write chunk once error');
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
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'emmc file write firmware error');
      }
      const env = DataManager.getSettings('env');
      if (DataManager.isBleConnect(env)) {
        await wait(3000);
        await device.deviceConnector?.acquire(device.originalDescriptor.id, null, true);
        await device.initialize();
      } else if (error.message.indexOf(SESSION_ERROR) > -1) {
        const deviceDiff = await device.deviceConnector?.enumerate();
        const devicesDescriptor = deviceDiff?.descriptors ?? [];
        const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined);
        if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
          device.updateFromCache(deviceList[0]);
          await device.acquire();
          device.getCommands().mainId = device.mainId ?? '';
        }
      }
      await wait(3000);
    }
  }
};
