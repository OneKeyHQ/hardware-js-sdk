import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { WebAuthnRemoveResidentCredential as HardwareWebAuthnRemoveResidentCredential } from '@onekeyfe/hd-transport';

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
