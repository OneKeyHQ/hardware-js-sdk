import { CosmosGetAddress as HardwareCosmosGetAddress } from '@onekeyfe/hd-transport';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { CosmosAddress, CosmosGetAddressParams } from '../../types';

export default class CosmosGetAddress extends BaseMethod<HardwareCosmosGetAddress[]> {
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
    payload.bundle.forEach((batch: CosmosGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'hrp', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;
      const { hrp } = batch;

      this.params.push({
        address_n: addressN,
        hrp,
        show_display: showOnOneKey,
      });
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.10.0',
      },
      model_touch: {
        min: '4.0.0',
      },
    };
  }

  async run() {
    // TODO: add batch support
    const responses: CosmosAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('CosmosGetAddress', 'CosmosAddress', {
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
