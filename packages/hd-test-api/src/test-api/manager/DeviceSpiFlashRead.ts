import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { formatAnyHex } from '../helpers/hexUtils';

import type { SpiFlashRead } from '@onekeyfe/hd-transport';

export default class DeviceSpiFlashRead extends BaseMethod<SpiFlashRead> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      address: this.payload.address,
      len: formatAnyHex(this.payload.data),
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SpiFlashRead', 'SpiFlashData', this.params);

    return Promise.resolve(res.message);
  }
}
