import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { EmmcDirRemove as HardwareEmmcDirRemove } from '@onekeyfe/hd-transport';

export default class EmmcDirRemove extends BaseMethod<HardwareEmmcDirRemove> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcDirRemove', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
