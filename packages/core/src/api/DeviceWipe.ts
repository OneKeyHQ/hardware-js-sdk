import { WipeDevice } from '@onekeyfe/hd-transport/src/types/messages';
import { BaseMethod } from './BaseMethod';

export default class DeviceWipe extends BaseMethod<WipeDevice> {
  init() {}

  async run() {
    const res = await this.device.commands.typedCall('WipeDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
