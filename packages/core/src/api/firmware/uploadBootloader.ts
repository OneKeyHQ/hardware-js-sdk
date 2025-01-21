import type { CoreMessage } from '../../events';
import type { Device } from '../../device/Device';
import { postProgressTip, postProgressMessage } from './utils/uiHelper';
import type { TypedCall } from '../../device/DeviceCommands';
import { updateResource } from './uploadResource';
import { rebootDevice, emmcCommonUpdateProcess } from './utils/typedCallHelper';
import { REBOOT_TYPE } from './utils/const';

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

// TODO: 后续再加入在bootloader中更新firmware, res, bootlaoder
export const updateBootloaderInBootloaderMode = async (
  typedCall: TypedCall,
  device: Device,
  source: ArrayBuffer
) => {
  await emmcCommonUpdateProcess(device, {
    payload: source,
    filePath: '0:boot/bootloader.bin',
  });
  await rebootDevice(typedCall, REBOOT_TYPE.REBOOT_BOOTLOADER);
  return true;
};
