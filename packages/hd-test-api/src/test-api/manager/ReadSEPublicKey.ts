import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { ReadSEPublicKey as HardwareReadSEPublicKey } from '@onekeyfe/hd-transport';

export default class ReadSEPublicKey extends BaseMethod<HardwareReadSEPublicKey> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicKey', 'SEPublicKey');

    return Promise.resolve(res.message);
  }
}
