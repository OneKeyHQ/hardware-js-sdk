import { DoPreauthorized } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceDoPreauthorized extends BaseMethod<DoPreauthorized> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('DoPreauthorized', 'Success');

    return Promise.resolve(res.message);
  }
}
