import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

import type { EmmcDirMake as HardwareEmmcDirMake } from '@onekeyfe/hd-transport';

export default class EmmcDirMake extends BaseMethod<HardwareEmmcDirMake> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcDirMake', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
