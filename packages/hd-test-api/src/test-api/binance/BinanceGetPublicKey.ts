import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';

import type { BinanceGetPublicKey as HardwareBinanceGetPublicKey } from '@onekeyfe/hd-transport';

export default class BinanceGetPublicKey extends BaseMethod<HardwareBinanceGetPublicKey> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // init params
    this.params = {
      address_n: validatePath(this.payload.path, 3),
      show_display: this.payload.showOnOneKey ?? true,
    };
  }

  async run() {
    return this.device.commands.typedCall('BinanceGetPublicKey', 'BinancePublicKey', {
      ...this.params,
    });
  }
}
