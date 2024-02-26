import { SESignMessage } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceSESignMessage extends BaseMethod<SESignMessage> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      message: this.payload.message,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SESignMessage', 'SEMessageSignature');

    return Promise.resolve(res.message);
  }
}
