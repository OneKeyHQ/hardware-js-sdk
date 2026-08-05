import { BaseMethod } from './BaseMethod';

import type { WebAuthnListResidentCredentials as HardwareWebAuthnListResidentCredentials } from '@onekeyfe/hd-transport';

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
