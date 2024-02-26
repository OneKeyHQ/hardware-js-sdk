import { WebAuthnRemoveResidentCredential as HardwareWebAuthnRemoveResidentCredential } from '@onekeyfe/hd-transport';

import { BaseMethod } from './BaseMethod';

export default class WebAuthnRemoveResidentCredential extends BaseMethod<HardwareWebAuthnRemoveResidentCredential> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;

    // init params
    this.params = {
      index: this.payload.index,
    };
  }

  async run() {
    return this.device.commands.typedCall('WebAuthnRemoveResidentCredential', 'Success', {
      ...this.params,
    });
  }
}
