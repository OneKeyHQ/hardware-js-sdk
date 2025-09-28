import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { RebootType } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { FirmwareUpdateTipMessage } from '../../events/ui-request';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateBootloader } from '../firmware/uploadFirmware';
import { DeviceModelToTypes } from '../../types';
import { DataManager } from '../../data-manager';
import { checkBootloaderLength } from '../firmware/updateBootloader';
import { getDeviceType } from '../../utils';

import type { Device } from '../../device/Device';
import type { Features } from '../../types';

export default class DeviceUpdateBootloader extends FirmwareUpdateBaseMethod<any> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async updateBootloaderWithEmmcFileWrite(_device: Device, binary: ArrayBuffer) {
    const filePath = '0:boot/bootloader.bin';

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    // Use the more robust emmcCommonUpdateProcess from FirmwareUpdateBaseMethod
    await this.emmcCommonUpdateProcess({
      payload: binary,
      filePath,
    });

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);

    // Reboot to apply bootloader update using the inherited reboot method
    await this.reboot(RebootType.Normal); // Normal reboot (RebootType.Normal = 0)

    this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloaderSuccess);
    return true;
  }

  async updateTouchBootloader(device: Device, features?: Features) {
    let { binary } = this.payload;
    if (!binary) {
      this.postTipMessage(FirmwareUpdateTipMessage.CheckLatestUiResource);
      const resourceUrl = features ? DataManager.getBootloaderResource(features) : null;
      if (resourceUrl) {
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResource);
        const resource = await getSysResourceBinary(resourceUrl);
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResourceSuccess);
        if (resource) {
          binary = resource.binary;
        }
      }
    }

    if (!checkBootloaderLength(binary)) {
      throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
    }

    // Check if device is in bootloader mode
    if (features && features.bootloader_mode) {
      // Use emmcFileWrite + reboot logic for bootloader mode
      this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloader);
      return this.updateBootloaderWithEmmcFileWrite(device, binary);
    }

    if (features && !features.bootloader_mode) {
      // Use original updateBootloader logic for normal mode
      await updateBootloader(
        this.device.getCommands().typedCall.bind(this.device.getCommands()),
        this.postMessage,
        device,
        binary
      );
      return Promise.resolve(true);
    }
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const deviceType = getDeviceType(features);
    if (DeviceModelToTypes.model_touch.includes(deviceType)) {
      return this.updateTouchBootloader(device, features);
    }

    return Promise.resolve(true);
  }
}
