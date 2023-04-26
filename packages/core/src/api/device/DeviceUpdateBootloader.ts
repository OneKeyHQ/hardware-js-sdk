import { Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateBootloader } from '../firmware/uploadFirmware';
import { createUiMessage } from '../../events/ui-request';
import type { Features, KnownDevice } from '../../types';
import { DataManager } from '../../data-manager';
import { checkBootloaderLength, checkNeedUpdateBootForTouch } from '../firmware/updateBootloader';
import type { Device } from '../../device/Device';
import { getDeviceType } from '../../utils';

export default class DeviceUpdateBootloader extends BaseMethod {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  postTipMessage = (message: string) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
        device: this.device.toMessageObject() as KnownDevice,
        data: {
          message,
        },
      })
    );
  };

  async updateTouchBootloader(device: Device, features?: Features) {
    if (features && !features.bootloader_mode) {
      // check & upgrade firmware resource
      if (features && checkNeedUpdateBootForTouch(features)) {
        this.postTipMessage('CheckLatestUiResource');
        const resourceUrl = DataManager.getBootloaderResource(features);
        if (resourceUrl) {
          this.postTipMessage('DownloadLatestBootloaderResource');
          const resource = await getSysResourceBinary(resourceUrl);
          this.postTipMessage('DownloadLatestBootloaderResourceSuccess');
          if (resource) {
            if (!checkBootloaderLength(resource.binary)) {
              throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
            }
            await updateBootloader(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              resource.binary
            );
            return Promise.resolve(true);
          }
        }
      }
    }

    return Promise.resolve(true);
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const deviceType = getDeviceType(features);
    if (deviceType === 'touch') {
      return this.updateTouchBootloader(device, features);
    }

    return Promise.resolve(true);
  }
}
