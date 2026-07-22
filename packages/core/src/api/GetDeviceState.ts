import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

export default class GetDeviceState extends BaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    return this.device.getDeviceState();
  }
}
