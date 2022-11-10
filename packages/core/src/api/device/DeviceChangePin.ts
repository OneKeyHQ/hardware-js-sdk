import { ChangePin } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class DeviceChangePin extends BaseMethod<ChangePin> {
  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [{ name: 'remove', type: 'boolean' }]);

    this.params = {
      remove: this.payload.remove,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('ChangePin', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
