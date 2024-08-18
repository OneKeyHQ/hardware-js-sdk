import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';

export default class TestInitializeDeviceDuration extends BaseMethod {
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
    const beginTime = Date.now();
    await this.device.commands.typedCall('Initialize', 'Features');
    const endTime = Date.now();
    const duration = endTime - beginTime;
    return Promise.resolve(duration);
  }
}
