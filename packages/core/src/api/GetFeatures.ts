import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

export default class GetFeatures extends BaseMethod {
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
    return Promise.resolve(this.device.features);
  }
}
