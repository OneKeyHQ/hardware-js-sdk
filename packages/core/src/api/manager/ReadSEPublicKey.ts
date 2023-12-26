import { ReadSEPublicKey as HardwareReadSEPublicKey } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class ReadSEPublicKey extends BaseMethod<HardwareReadSEPublicKey> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicKey', 'SEPublicKey');

    return Promise.resolve(res.message);
  }
}
