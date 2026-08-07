import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getBootloaderReleaseInfo } from './firmware/releaseHelper';

import type { CheckBootloaderReleaseParams } from '../types/api/checkBootloaderRelease';

export default class CheckBootloaderRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      return null;
    }
    const { features } = this.device;
    const payload = this.payload as CheckBootloaderReleaseParams;

    const deviceFirmwareType = this.device.getCurrentFirmwareType();
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    const releaseInfo = getBootloaderReleaseInfo({
      features,
      willUpdateFirmwareVersion: payload.willUpdateFirmwareVersion,
      firmwareType,
    });
    return Promise.resolve(releaseInfo);
  }
}
