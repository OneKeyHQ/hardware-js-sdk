import { EmmcFileWrite as HardwareEmmcFileWrite } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcFileWrite extends BaseMethod<HardwareEmmcFileWrite> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      file: this.payload.file,
      overwrite: this.payload.overwrite,
      append: this.payload.append,
      ui_percentage: this.payload.ui_percentage,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcFileWrite', 'EmmcFile', this.params);

    return Promise.resolve(res.message);
  }
}
