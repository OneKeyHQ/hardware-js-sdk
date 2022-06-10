import { ApplyFlags } from '@onekeyfe/hd-transport/src/types/messages';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';

export default class DeviceFlags extends BaseMethod<ApplyFlags> {
  init() {
    // check payload
    validateParams(this.payload, [{ name: 'flags', type: 'number' }]);

    // init params
    this.params = {
      flags: this.payload.flags,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('ApplyFlags', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
