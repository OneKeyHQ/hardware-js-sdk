import { ListResDir as HardwareListResDir } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class ListResDir extends BaseMethod<HardwareListResDir> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('ListResDir', 'FileInfoList');

    return Promise.resolve(res.message);
  }
}
