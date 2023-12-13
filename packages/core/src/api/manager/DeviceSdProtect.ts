import { SdProtect } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceSdProtect extends BaseMethod<SdProtect> {
  init() {
    this.useDevicePassphraseState = false;
    this.params = {
      operation: this.payload.operation,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SdProtect', 'Success');

    return Promise.resolve(res.message);
  }
}
