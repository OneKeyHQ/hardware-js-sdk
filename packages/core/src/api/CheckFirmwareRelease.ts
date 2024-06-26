import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';

import { getFirmwareReleaseInfo } from './firmware/releaseHelper';

export default class CheckFirmwareRelease extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [
      ...this.notAllowDeviceMode,
      UI_REQUEST.INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    if (this.device.features) {
      const releaseInfo = getFirmwareReleaseInfo(this.device.features);
      return Promise.resolve(releaseInfo);
    }
    return Promise.resolve(null);
  }
}
