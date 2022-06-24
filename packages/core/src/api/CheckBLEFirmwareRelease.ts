import { BaseMethod } from './BaseMethod';

import { UI_REQUEST } from '../constants/ui-request';
import { DataManager } from '../data-manager';

export default class CheckBLEFirmwareRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  run() {
    if (this.device.features) {
      const firmwareStatus = DataManager.getBLEFirmwareStatus(this.device.features);
      const changelog = DataManager.getBleFirmwareChangelog(this.device.features);
      const release = DataManager.getBleFirmwareLeatestRelease(this.device.features);
      return Promise.resolve({
        status: firmwareStatus,
        changelog,
        release,
      });
    }
    return Promise.resolve(null);
  }
}
