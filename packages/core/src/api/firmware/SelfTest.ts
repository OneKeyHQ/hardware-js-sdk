import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { SelfTest as HardwareSelfTest } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

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
