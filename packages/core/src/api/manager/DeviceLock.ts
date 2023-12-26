import { LockDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceLock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('LockDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
