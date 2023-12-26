import { ChangeWipeCode } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceChangeWipeCode extends BaseMethod<ChangeWipeCode> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      remove: this.payload.remove,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('ChangeWipeCode', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
