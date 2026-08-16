import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';

import type { CosiSign } from '@onekeyfe/hd-transport';

export default class CryptoCosiSign extends BaseMethod<CosiSign> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    const addressN = validatePath(this.payload.path);
    // init params
    this.params = {
      address_n: addressN,
      data: this.payload.data,
      global_commitment: this.payload.global_commitment,
      global_pubkey: this.payload.global_pubkey,
    };
  }

  async run() {
    return this.device.commands.typedCall('CosiSign', 'CosiSignature', this.params);
  }
}
