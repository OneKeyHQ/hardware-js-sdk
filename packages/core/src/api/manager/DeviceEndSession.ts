import { EndSession } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceEndSession extends BaseMethod<EndSession> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      size: this.payload.size,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EndSession', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
