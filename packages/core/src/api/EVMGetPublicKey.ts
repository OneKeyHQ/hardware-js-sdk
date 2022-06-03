import { EthereumGetPublicKey, EthereumPublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { EVMGetPublicKeyParams } from '../types/api/evmGetPublicKey';

export default class EVMGetPublicKey extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    const hasBundle = !!this.payload?.bundle;
    const payload = hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    const params: EthereumGetPublicKey[] = [];

    payload.bundle.forEach((batch: EVMGetPublicKeyParams) => {
      const address_n = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? false;

      params.push({
        address_n,
        show_display: showOnOneKey,
      });
    });

    const responses: EthereumPublicKey[] = [];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      const res = await this.device.commands.typedCall(
        'EthereumGetPublicKey',
        'EthereumPublicKey',
        {
          ...param,
        }
      );

      responses.push(res.message);
    }

    return Promise.resolve(hasBundle ? responses : responses[0]);
  }
}
