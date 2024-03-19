import { Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateBootloader } from '../firmware/uploadFirmware';
import { createUiMessage } from '../../events/ui-request';
import { DeviceModelToTypes } from '../../types';
import { DataManager } from '../../data-manager';
import { checkBootloaderLength, checkNeedUpdateBootForTouch } from '../firmware/updateBootloader';
import { getDeviceType } from '../../utils';

import type { Device } from '../../device/Device';
import type { Features, KnownDevice } from '../../types';

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
      const needUpdateBoot = checkNeedUpdateBootForTouch(features);
      const existsBootRes = this.payload?.binary != null;

      const hasUpdateBootloader = needUpdateBoot || existsBootRes;
      if (features && hasUpdateBootloader) {
        let { binary } = this.payload;
        if (!binary) {
          this.postTipMessage('CheckLatestUiResource');
          const resourceUrl = DataManager.getBootloaderResource(features);
          if (resourceUrl) {
            this.postTipMessage('DownloadLatestBootloaderResource');
            const resource = await getSysResourceBinary(resourceUrl);
            this.postTipMessage('DownloadLatestBootloaderResourceSuccess');
            if (resource) {
              binary = resource.binary;
            }
          }
        }

        if (!checkBootloaderLength(binary)) {
          throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
        }
        await updateBootloader(
          this.device.getCommands().typedCall.bind(this.device.getCommands()),
          this.postMessage,
          device,
          binary
        );
        return Promise.resolve(true);
      }
    }

    return Promise.resolve(true);
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
