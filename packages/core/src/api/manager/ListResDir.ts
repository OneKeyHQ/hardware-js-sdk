import { BaseMethod } from '../BaseMethod';

import type { ListResDir as HardwareListResDir } from '@onekeyfe/hd-transport';

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
