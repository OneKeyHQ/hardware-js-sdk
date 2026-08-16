import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { SignIdentity } from '@onekeyfe/hd-transport';

export default class CryptoSignIdentity extends BaseMethod<SignIdentity> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // init params
    this.params = {
      identity: this.payload.identity,
      challenge_hidden: this.payload.challenge_hidden,
      challenge_visual: this.payload.challenge_visual,
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
    };
  }

  async run() {
    return this.device.commands.typedCall('SignIdentity', 'ECDHSessionKey', this.params);
  }
}
