import { GetDeviceInfo } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class GetDeviceInfoSettings extends BaseMethod<GetDeviceInfo> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall('GetDeviceInfo', 'DeviceInfo');

    return Promise.resolve(res.message);
  }
}
