import { AlgorandGetAddress as HardwareAlgoGetAddress } from '@onekeyfe/hd-transport';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { AlgoAddress, AlgoGetAddressParams } from '../../types';

export default class AlgoGetAddress extends BaseMethod<HardwareAlgoGetAddress[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: AlgoGetAddressParams) => {
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

  getVersionRange() {
    return {
      model_mini: {
        min: '2.6.0',
      },
    };
  }

  async run() {
    const responses: AlgoAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('AlgorandGetAddress', 'AlgorandAddress', {
        ...param,
      });

      const { address } = res.message;

      const result = {
        path: serializedPath(param.address_n),
        address,
      };
      responses.push(result);
      this.postPreviousAddressMessage(result);
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
