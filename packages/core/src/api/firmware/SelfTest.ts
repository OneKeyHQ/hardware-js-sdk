import { BaseMethod } from '../BaseMethod';

import type { SelfTest as HardwareSelfTest } from '@onekeyfe/hd-transport';

export default class SelfTest extends BaseMethod<HardwareSelfTest> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      payload: this.payload.payload,
    };
  }

  async run() {
    return this.device.getCommands().typedCall('SelfTest', 'Success', this.params);
  }
}
