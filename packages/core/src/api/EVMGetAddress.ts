import { EthereumAddress, EthereumGetAddress } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { EVMGetAddressParams } from '../types/api/evmGetAddress';

export default class EvmGetAddress extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    const hasBundle = !!this.payload?.bundle;
    const payload = hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    const params: EthereumGetAddress[] = [];

    payload.bundle.forEach((batch: EVMGetAddressParams) => {
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

    const responses: EthereumAddress[] = [];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      const res = await this.device.commands.typedCall('EthereumGetAddress', 'EthereumAddress', {
        ...param,
      });

      responses.push(res.message);
    }

    return Promise.resolve(hasBundle ? responses : responses[0]);
  }
}
