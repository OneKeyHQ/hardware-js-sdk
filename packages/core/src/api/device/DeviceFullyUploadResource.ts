import { Deferred, EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/utils/getBinary';
import { updateResources } from '../firmware/uploadResource';
import { getDeviceType, getDeviceFirmwareVersion } from '../../utils';
import type { Features } from '../../types';
import { DataManager } from '../../data-manager';
import { postProgressTip } from '../firmware/utils/uiHelper';

export default class DeviceFullyUploadResource extends BaseMethod {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
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
          postProgressTip(device, 'CheckLatestUiResource', this.postMessage);
          const resourceUrl = DataManager.getSysFullResource(features);
          if (resourceUrl) {
            postProgressTip(device, 'DownloadLatestUiResource', this.postMessage);
            const resource = await getSysResourceBinary(resourceUrl);
            postProgressTip(device, 'DownloadLatestUiResourceSuccess', this.postMessage);
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
