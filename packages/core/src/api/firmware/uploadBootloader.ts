import type { CoreMessage } from '../../events';
import type { Device } from '../../device/Device';
import { postProgressTip, postProgressMessage, postProcessingMessage } from './utils/uiHelper';
import type { TypedCall } from '../../device/DeviceCommands';
import { updateResource } from './uploadResource';

export const updateBootloader = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: ArrayBuffer
) => {
  postProgressTip(device, 'UpdateBootloader', postMessage);
  postProgressMessage(device, Math.floor(0), postMessage);
  await updateResource(typedCall, 'bootloader.bin', source, () => {
    postProcessingMessage('resource', postMessage);
  });
  postProgressMessage(device, Math.floor(100), postMessage);
  postProgressTip(device, 'UpdateBootloaderSuccess', postMessage);
  return true;
};
