import { Ping } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

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
