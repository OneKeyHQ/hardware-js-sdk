import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getFirmwareReleaseInfo } from './firmware/releaseHelper';

import type { CheckFirmwareReleaseParams } from '../types/api/checkFirmwareRelease';

export default class CheckFirmwareRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    const payload = this.payload as CheckFirmwareReleaseParams;

    if (this.device.features) {
      const deviceFirmwareType = this.device.getCurrentFirmwareType();
      const firmwareType = payload.firmwareType ?? deviceFirmwareType;

      const releaseInfo = getFirmwareReleaseInfo(this.device.features, firmwareType);
      return Promise.resolve(releaseInfo);
    }
    return Promise.resolve(null);
  }
}
