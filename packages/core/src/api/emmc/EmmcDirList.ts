import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

import type { EmmcDirList as HardwareEmmcDirList } from '@onekeyfe/hd-transport';

export default class EmmcDirList extends BaseMethod<HardwareEmmcDirList> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcDirList', 'EmmcDir', this.params);

    return Promise.resolve(res.message);
  }
}
