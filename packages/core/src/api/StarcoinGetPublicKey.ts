import { StarcoinGetPublicKey as HardwareStarcoinGetPublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath, serializedPath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { StarcoinPublicKey, StarcoinGetPublicKeyParams } from '../types/api/starcoinGetPublicKey';

export default class StarcoinGetPublicKey extends BaseMethod<HardwareStarcoinGetPublicKey[]> {
  hasBundle = false;

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: StarcoinGetPublicKeyParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
      });
    });
  }

  async run() {
    const responses: StarcoinPublicKey[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall(
        'StarcoinGetPublicKey',
        'StarcoinPublicKey',
        {
          ...param,
        }
      );

      responses.push({
        path: serializedPath(param.address_n),
        ...res.message,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
