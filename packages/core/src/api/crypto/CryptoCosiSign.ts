import { CosiSign } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class CryptoCosiSign extends BaseMethod<CosiSign> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];
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
