import { BaseMethod } from '../BaseMethod';

import type { LockDevice } from '@onekeyfe/hd-transport';

export default class DeviceUnlock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.protocolV2UiInteraction = {
      request: 'pin',
      source: 'method-lifecycle',
      reason: 'device-unlock',
      completion: 'operation-completed',
      deviceOnly: true,
      operation: 'unlock-device',
    };
  }

  async run() {
    return this.device.unlockDevice();
  }
}
