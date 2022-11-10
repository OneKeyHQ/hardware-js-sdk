import { CipherKeyValue as HardwareCipherKeyValue } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../constants/ui-request';
import { serializedPath, validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { CipheredKeyValue, CipheredKeyValueParams } from '../types';
import { formatAnyHex } from './helpers/hexUtils';

export default class CipherKeyValue extends BaseMethod<HardwareCipherKeyValue[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: CipheredKeyValueParams) => {
      const addressN = validatePath(batch.path);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'hexString' },
        { name: 'encrypt', type: 'boolean' },
        { name: 'askOnEncrypt', type: 'boolean' },
        { name: 'askOnDecrypt', type: 'boolean' },
        { name: 'iv', type: 'hexString' },
      ]);

      this.params.push({
        address_n: addressN,
        key: batch.key,
        value: formatAnyHex(batch.value),
        encrypt: batch.encrypt,
        ask_on_encrypt: batch.askOnEncrypt,
        ask_on_decrypt: batch.askOnDecrypt,
        iv: formatAnyHex(batch.iv),
      });
    });
  }

  async run() {
    const responses: CipheredKeyValue[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('CipherKeyValue', 'CipheredKeyValue', {
        ...param,
      });

      responses.push({
        path: serializedPath(param.address_n),
        ...res.message,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
