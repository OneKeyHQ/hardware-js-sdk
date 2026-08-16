import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';

import type { BatchGetPublickeys } from '@onekeyfe/hd-transport';

export default class CryptoBatchGetPublickeys extends BaseMethod<BatchGetPublickeys> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // init params
    this.params = {
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
      paths: this.payload.paths.map((path: string) => {
        const addressN = validatePath(path);
        return {
          address_n: addressN,
          show_display: this.payload.show_display,
        };
      }),
    };
  }

  async run() {
    return this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', this.params);
  }
}
