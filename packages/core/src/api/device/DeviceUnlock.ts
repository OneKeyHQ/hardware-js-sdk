import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';

import type { DeviceUnlockParams } from '../../types/api/deviceUnlock';

export default class DeviceUnlock extends BaseMethod<DeviceUnlockParams> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.params = {
      pinType: this.payload.pinType ?? DeviceSessionPinType.Main,
    };
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
    return this.device.unlockDevice(this.params.pinType, { emitUiEvent: false });
  }
}
