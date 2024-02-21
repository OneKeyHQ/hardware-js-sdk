import { Deferred } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateResources } from '../firmware/uploadFirmware';
import { getDeviceType } from '../../utils';
import { createUiMessage } from '../../events/ui-request';
import type { KnownDevice, Features } from '../../types';
import { DataManager } from '../../data-manager';
import { getDeviceFirmwareVersion } from '../../utils/deviceFeaturesUtils';

export default class DeviceFullyUploadResource extends BaseMethod {
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

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === 'touch' || deviceType === 'pro';
    const currentVersion = getDeviceFirmwareVersion(features).join('.');

    return isTouchMode && semver.gte(currentVersion, '3.4.0');
  }

  async run() {
    const { device } = this;
    const { features } = device;

    if (!features?.bootloader_mode && features) {
      // check & upgrade firmware resource
      if (features) {
        let { binary } = this.payload;
        if (!binary) {
          this.postTipMessage('CheckLatestUiResource');
          const resourceUrl = DataManager.getSysFullResource(features);
          if (resourceUrl) {
            this.postTipMessage('DownloadLatestUiResource');
            const resource = await getSysResourceBinary(resourceUrl);
            this.postTipMessage('DownloadLatestUiResourceSuccess');
            if (resource) {
              binary = resource.binary;
            }
          }
        }
        await updateResources(
          this.device.getCommands().typedCall.bind(this.device.getCommands()),
          this.postMessage,
          device,
          binary
        );
      }
    }
  }
}
