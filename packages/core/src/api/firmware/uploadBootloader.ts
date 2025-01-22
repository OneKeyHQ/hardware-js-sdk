import semver from 'semver';
import type { CoreMessage } from '../../events';
import type { Device } from '../../device/Device';
import { postProgressTip, postProgressMessage } from './utils/uiHelper';
import type { TypedCall } from '../../device/DeviceCommands';
import { updateResource } from './uploadResource';
import { rebootDevice, emmcCommonUpdateProcess } from './utils/typedCallHelper';
import { NEW_BOOT_UPRATE_FIRMWARE_VERSION, REBOOT_TYPE } from './utils/const';
import { getDeviceBootloaderVersion } from '../../utils';
import { enterBootloaderMode } from './utils/bootloaderHelper';

export const updateBootloader = async (
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  source: ArrayBuffer
) => {
  const bootloaderVersion = getDeviceBootloaderVersion(device.features).join('.');

  postProgressTip(device, 'UpdateBootloader', postMessage);
  postProgressMessage(device, Math.floor(0), postMessage);

  if (semver.gte(bootloaderVersion, NEW_BOOT_UPRATE_FIRMWARE_VERSION)) {
    await updateBootloaderInBootloaderMode(device, postMessage, source);
  } else {
    await updateResource(typedCall, 'bootloader.bin', source);
  }

  postProgressMessage(device, Math.floor(100), postMessage);
  postProgressTip(device, 'UpdateBootloaderSuccess', postMessage);
  return true;
};

export const updateBootloaderInBootloaderMode = async (
  device: Device,
  postMessage: (message: CoreMessage) => void,
  source: ArrayBuffer
) => {
  if (!device.isBootloader()) {
    await enterBootloaderMode(device, postMessage);
    await device.acquire();
  }
  await emmcCommonUpdateProcess(
    device,
    {
      payload: source,
      filePath: '0:boot/bootloader.bin',
    },
    postMessage
  );
  await rebootDevice(device, REBOOT_TYPE.REBOOT_BOOTLOADER);
  return true;
};
