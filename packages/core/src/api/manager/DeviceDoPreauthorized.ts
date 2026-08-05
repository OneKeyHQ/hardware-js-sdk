import { BaseMethod } from '../BaseMethod';

import type { DoPreauthorized } from '@onekeyfe/hd-transport';

export default class DeviceDoPreauthorized extends BaseMethod<DoPreauthorized> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('DoPreauthorized', 'Success');

    return Promise.resolve(res.message);
  }
}
