import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { EmmcPathInfo as HardwareEmmcPathInfo } from '@onekeyfe/hd-transport';

export default class EmmcPathInfo extends BaseMethod<HardwareEmmcPathInfo> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcPathInfo', 'EmmcFile');

    return Promise.resolve(res.message);
  }
}
