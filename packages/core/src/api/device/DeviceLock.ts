import { BaseMethod } from '../BaseMethod';

import type { LockDevice } from '@onekeyfe/hd-transport';

export default class DeviceLock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    return this.device.lockDevice();
  }
}
