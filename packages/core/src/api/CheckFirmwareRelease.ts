import { BaseMethod } from './BaseMethod';

import { DataManager } from '../data-manager';

export default class CheckFirmwareRelease extends BaseMethod {
  init() {}

  run() {
    if (this.device.features) {
      const firmwareStatus = DataManager.getFirmwareStatus(this.device.features);
      const changelog = DataManager.getFirmwareChangelog(this.device.features);
      const release = DataManager.getFirmwareLeatestRelease(this.device.features);
      return Promise.resolve({
        status: firmwareStatus,
        changelog,
        release,
      });
    }
    return Promise.resolve(null);
  }
}
