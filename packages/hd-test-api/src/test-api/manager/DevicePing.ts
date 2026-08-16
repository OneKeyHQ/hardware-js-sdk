import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { Ping } from '@onekeyfe/hd-transport';

export default class DevicePing extends BaseMethod<Ping> {
  init() {
    this.useDevicePassphraseState = false;
    this.params = {
      message: this.payload.message,
      button_protection: this.payload.button_protection,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('Ping', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
