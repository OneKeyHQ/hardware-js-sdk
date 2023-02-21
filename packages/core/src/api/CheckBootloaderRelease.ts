import { BaseMethod } from './BaseMethod';

import { UI_REQUEST } from '../constants/ui-request';
import { checkNeedUpdateBoot } from './firmware/updateBootloader';
import { DataManager } from '../data-manager';

export default class CheckBootloaderRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.checkDeviceId = true;
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (this.device.features) {
      const shouldUpdate = checkNeedUpdateBoot(this.device.features);
      const resource = DataManager.getBootloaderResource(this.device.features);
      return Promise.resolve({
        shouldUpdate,
        status: shouldUpdate ? 'outdated' : 'valid',
        release: resource,
      });
    }
    return null;
  }
}
