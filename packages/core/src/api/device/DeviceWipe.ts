import { WipeDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceWipe extends BaseMethod<WipeDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('WipeDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
