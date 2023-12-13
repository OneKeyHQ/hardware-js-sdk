import { ReadSEPublicCert } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceReadSEPublicCert extends BaseMethod<ReadSEPublicCert> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicCert', 'SEPublicCert');

    return Promise.resolve(res.message);
  }
}
