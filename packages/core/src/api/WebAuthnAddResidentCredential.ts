import { WebAuthnAddResidentCredential as HardwareWebAuthnAddResidentCredential } from '@onekeyfe/hd-transport';

import { BaseMethod } from './BaseMethod';

export default class WebAuthnAddResidentCredential extends BaseMethod<HardwareWebAuthnAddResidentCredential> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;

    // init params
    this.params = {
      credential_id: this.payload.credential_id,
    };
  }

  async run() {
    return this.device.commands.typedCall('WebAuthnAddResidentCredential', 'Success', {
      ...this.params,
    });
  }
}
