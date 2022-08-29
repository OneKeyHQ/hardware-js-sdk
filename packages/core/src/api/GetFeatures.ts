import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

export default class GetFeatures extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
  }

  run() {
    return Promise.resolve(this.device.features);
  }
}
