import { WebAuthnListResidentCredentials as HardwareWebAuthnListResidentCredentials } from '@onekeyfe/hd-transport';

import { BaseMethod } from './BaseMethod';

export default class WebAuthnListResidentCredentials extends BaseMethod<HardwareWebAuthnListResidentCredentials> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;

    // init params
    this.params = {};
  }

  async run() {
    return this.device.commands.typedCall(
      'WebAuthnListResidentCredentials',
      'WebAuthnCredentials',
      {
        ...this.params,
      }
    );
  }
}
