import { BaseMethod } from './BaseMethod';

import { UI_REQUEST } from '../constants/ui-request';
import { getBootloaderReleaseInfo } from './firmware/releaseHelper';

export default class CheckBootloaderRelease extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      return null;
    }
    const { features } = this.device;
    const releaseInfo = getBootloaderReleaseInfo(features, this.payload.willUpdateFirmwareVersion);
    return Promise.resolve(releaseInfo);
  }
}
