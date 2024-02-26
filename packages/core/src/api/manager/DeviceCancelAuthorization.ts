import { CancelAuthorization } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceCancelAuthorization extends BaseMethod<CancelAuthorization> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('CancelAuthorization', 'Success');

    return Promise.resolve(res.message);
  }
}
