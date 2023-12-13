import { WriteSEPublicCert } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceWriteSEPublicCert extends BaseMethod<WriteSEPublicCert> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      public_cert: this.payload.public_cert,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('WriteSEPublicCert', 'Success');

    return Promise.resolve(res.message);
  }
}
