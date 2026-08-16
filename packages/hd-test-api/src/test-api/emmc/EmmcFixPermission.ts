import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { EmmcFixPermission as HardwareEmmcFixPermission } from '@onekeyfe/hd-transport';

export default class EmmcFixPermission extends BaseMethod<HardwareEmmcFixPermission> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcFixPermission', 'Success');

    return Promise.resolve(res.message);
  }
}
