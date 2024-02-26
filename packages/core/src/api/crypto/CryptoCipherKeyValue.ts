import { CipherKeyValue } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class CryptoCipherKeyValue extends BaseMethod<CipherKeyValue> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];
    const addressN = validatePath(this.payload.path);
    // init params
    this.params = {
      address_n: addressN,
      key: this.payload.key,
      value: this.payload.key,
      encrypt: this.payload.key,
      ask_on_encrypt: this.payload.key,
      ask_on_decrypt: this.payload.key,
      iv: this.payload.key,
    };
  }

  async run() {
    return this.device.commands.typedCall('CipherKeyValue', 'CipheredKeyValue', this.params);
  }
}
