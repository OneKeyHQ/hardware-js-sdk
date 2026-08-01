import { EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';

import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateResources } from '../firmware/uploadFirmware';
import { createUiMessage } from '../../events/ui-request';
import { DataManager } from '../../data-manager';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { KnownDevice } from '../../types';
import type { DeviceFullyUploadResourceParams } from '../../types/api/deviceFullyUploadResource';

export default class DeviceFullyUploadResource extends BaseMethod {
  checkPromise: Deferred<any> | null = null;

  init() {
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

  isSupportResourceUpdate(updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = this.device.getCurrentDeviceType();
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
    const currentVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';

    return isTouchMode && semver.gte(currentVersion, '3.4.0');
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const payload = this.payload as DeviceFullyUploadResourceParams;

    const deviceFirmwareType = device.getCurrentFirmwareType();
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    if (!device.isBootloader() && features) {
      // check & upgrade firmware resource
      if (features) {
        let { binary } = this.payload;
        if (!binary) {
          this.postTipMessage('CheckLatestUiResource');
          const resourceUrl = DataManager.getSysFullResource(features, firmwareType);
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
