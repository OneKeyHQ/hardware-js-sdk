import { BaseMethod } from '../BaseMethod';

import type { LockDevice } from '@onekeyfe/hd-transport';

export default class DeviceLock extends BaseMethod<LockDevice> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
  }

  async run() {
    return this.device.lockDevice();
  }
}
