import { BaseMethod } from '../BaseMethod';

import type { GetNextU2FCounter as HardwareGetNextU2FCounter } from '@onekeyfe/hd-transport';

export default class GetNextU2FCounter extends BaseMethod<HardwareGetNextU2FCounter> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('GetNextU2FCounter', 'NextU2FCounter');

    return Promise.resolve(res.message);
  }
}
