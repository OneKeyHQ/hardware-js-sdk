import { EmmcDirRemove as HardwareEmmcDirRemove } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcDirRemove extends BaseMethod<HardwareEmmcDirRemove> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcDirRemove', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
