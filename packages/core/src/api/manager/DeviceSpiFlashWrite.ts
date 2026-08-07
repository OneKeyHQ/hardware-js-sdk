import { BaseMethod } from '../BaseMethod';
import { formatAnyHex } from '../helpers/hexUtils';
import { UI_REQUEST } from '../../constants/ui-request';

import type { SpiFlashWrite } from '@onekeyfe/hd-transport';

export default class DeviceSpiFlashWrite extends BaseMethod<SpiFlashWrite> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      address: this.payload.address,
      data: formatAnyHex(this.payload.data),
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SpiFlashWrite', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
