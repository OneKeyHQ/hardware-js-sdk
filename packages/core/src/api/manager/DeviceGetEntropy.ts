import { GetEntropy } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceGetEntropy extends BaseMethod<GetEntropy> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      size: this.payload.size,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('GetEntropy', 'Entropy', this.params);

    return Promise.resolve(res.message);
  }
}
