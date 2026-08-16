import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import type { GetECDHSessionKey } from '@onekeyfe/hd-transport';

export default class CryptoGetECDHSessionKey extends BaseMethod<GetECDHSessionKey> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // init params
    this.params = {
      identity: this.payload.identity,
      peer_public_key: this.payload.peer_public_key,
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
    };
  }

  async run() {
    return this.device.commands.typedCall('GetECDHSessionKey', 'ECDHSessionKey', this.params);
  }
}
