import { EmmcDirList as HardwareEmmcDirList } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcDirList extends BaseMethod<HardwareEmmcDirList> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcDirList', 'EmmcDir', this.params);

    return Promise.resolve(res.message);
  }
}
