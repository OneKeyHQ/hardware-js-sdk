import { BaseMethod } from '../BaseMethod';
import { createProtocolV2DeviceInteraction } from '../../protocols/protocol-v2/interaction';

import type { LockDevice } from '@onekeyfe/hd-transport';

export default class DeviceUnlock extends BaseMethod<LockDevice> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.protocolV2Interaction = createProtocolV2DeviceInteraction({
      kind: 'enter-pin-on-device',
      reason: 'device-unlock',
      completion: 'operation-completed',
      operation: 'unlock-device',
    });
  }

  async run() {
    return this.device.unlockDevice();
  }
}
