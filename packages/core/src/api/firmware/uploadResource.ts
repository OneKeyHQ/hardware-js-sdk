import JSZip from 'jszip';
import { blake2s } from '@noble/hashes/blake2s';
import { INIT_DATA_CHUNK_SIZE } from './utils/const';
import type { Device } from '../../device/Device';
import type { CoreMessage } from '../../events';
import { processResourceRequest } from './utils/typedCallHelper';
import { postProgressTip, postProgressMessage } from './utils/uiHelper';
import { bytesToHex } from '../helpers/hexUtils';
import type { TypedCall } from '../../device/DeviceCommands';

export const updateResource = async (
  typedCall: TypedCall,
  fileName: string,
  data: ArrayBuffer,
  onConfirmAfter?: () => void
) => {
  const chunk = new Uint8Array(data.slice(0, Math.min(INIT_DATA_CHUNK_SIZE, data.byteLength)));
  const digest = blake2s(chunk);

  const res = await typedCall('ResourceUpdate', ['ResourceRequest', 'Success'], {
    file_name: fileName,
    data_length: data.byteLength,
    initial_data_chunk: bytesToHex(chunk),
    hash: bytesToHex(digest),
  });

  onConfirmAfter?.();
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
