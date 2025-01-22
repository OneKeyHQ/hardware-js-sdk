import { Deferred } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/utils/getBinary';
import { updateResources, updateResourcesInBootloaderMode } from '../firmware/uploadResource';
import { getDeviceType, getDeviceFirmwareVersion } from '../../utils';
import { createUiMessage } from '../../events/ui-request';
import type { KnownDevice, Features } from '../../types';
import { DataManager } from '../../data-manager';
import { enterBootloaderMode } from '../firmware/utils/bootloaderHelper';
import { REBOOT_TYPE, NEW_BOOT_UPRATE_FIRMWARE_VERSION } from '../firmware/utils/const';
import { rebootDevice } from '../firmware/utils/typedCallHelper';

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
        const bootloaderVersion = getDeviceFirmwareVersion(features);
        // 2.4.4版本之后才支持emmcFileWrite
        if (semver.gte(bootloaderVersion.join('.'), NEW_BOOT_UPRATE_FIRMWARE_VERSION)) {
          await enterBootloaderMode(device, this.postMessage, this.connectId);
          await updateResourcesInBootloaderMode(this.postMessage, device, binary);
          await rebootDevice(device, REBOOT_TYPE.REBOOT_NORMAL);
        } else {
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
}
