import { PolkadotGetAddress as HardwarePolkadotGetAddress } from '@onekeyfe/hd-transport';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { PolkadotAddress, PolkadotGetAddressParams } from '../../types';

export default class PolkadotGetAddress extends BaseMethod<HardwarePolkadotGetAddress[]> {
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
    payload.bundle.forEach((batch: PolkadotGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'prefix', required: true },
        { name: 'network', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;
      const { prefix, network } = batch;

      this.params.push({
        address_n: addressN,
        prefix,
        network,
        show_display: showOnOneKey,
      });
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.11.0',
      },
      model_touch: {
        min: '4.2.0',
      },
    };
  }

  async run() {
    // TODO: add batch support
    const responses: PolkadotAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('PolkadotGetAddress', 'PolkadotAddress', {
        ...param,
      });

      const { address, public_key } = res.message;

      const path = serializedPath(param.address_n);
      responses.push({
        path,
        address,
        publicKey: public_key ?? '',
      });

      this.postPreviousAddressMessage({
        path,
        address,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
