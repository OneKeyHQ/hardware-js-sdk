import semver from 'semver';
import JSZip from 'jszip';
import { blake2s } from '@noble/hashes/blake2s';
import { getDeviceBootloaderVersion } from '../../utils';
import { NEW_BOOT_UPRATE_FIRMWARE_VERSION, INIT_DATA_CHUNK_SIZE } from './utils/const';
import type { Device } from '../../device/Device';
import type { CoreMessage } from '../../events';
import {
  createFolder,
  emmcCommonUpdateProcess,
  processResourceRequest,
} from './utils/typedCallHelper';
import { postProgressTip, postProgressMessage } from './utils/uiHelper';
import { bytesToHex } from '../helpers/hexUtils';
import type { TypedCall } from '../../device/DeviceCommands';

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

      let validFileCount = 0;
      // 先计算有效文件数量
      for (const [fileName, file] of newFiles) {
        if (!file.dir && fileName.indexOf('__MACOSX') === -1 && fileName) {
          validFileCount++;
        }
      }

      let processedCount = 0;
      for (const [fileName, file] of newFiles) {
        if (!file.dir && fileName.indexOf('__MACOSX') === -1 && fileName) {
          const data = await file.async('arraybuffer');
          const path = getResourcePath(fileName);
          processedCount++;

          await emmcCommonUpdateProcess(
            device,
            {
              payload: data,
              filePath: path,
              manulProgress: processedCount === validFileCount ? 100 : Math.floor(progress),
            },
            postMessage
          );
        }
        progress += stepProgress;
        // postProgressMessage(device, Math.floor(progress), postMessage);
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
