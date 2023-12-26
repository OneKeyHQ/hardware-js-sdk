import { EmmcFileRead as HardwareEmmcFileRead } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcFileRead extends BaseMethod<HardwareEmmcFileRead> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      file: this.payload.file,
      ui_percentage: this.payload.ui_percentage,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcFileRead', 'EmmcFile', this.params);

    return Promise.resolve(res.message);
  }
}
