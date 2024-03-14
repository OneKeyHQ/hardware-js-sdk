import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

export default class GetOnekeyFeatures extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [
      ...this.notAllowDeviceMode,
      UI_REQUEST.INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { message } = await this.device.commands.typedCall('OnekeyGetFeatures', 'OnekeyFeatures');
    return Promise.resolve(message);
  }
}
