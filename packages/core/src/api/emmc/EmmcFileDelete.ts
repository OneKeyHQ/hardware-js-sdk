import { EmmcFileDelete as HardwareEmmcFileDelete } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcFileDelete extends BaseMethod<HardwareEmmcFileDelete> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcFileDelete', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
