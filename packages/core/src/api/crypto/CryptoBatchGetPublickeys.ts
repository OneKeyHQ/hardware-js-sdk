import { BatchGetPublickeys } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class CryptoBatchGetPublickeys extends BaseMethod<BatchGetPublickeys> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
