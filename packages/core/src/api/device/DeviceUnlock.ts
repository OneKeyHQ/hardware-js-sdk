import { BaseMethod } from '../BaseMethod';

import type { LockDevice } from '@onekeyfe/hd-transport';

export default class DeviceUnlock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
  }

  async run() {
    return this.device.unlockDevice();
  }
}
