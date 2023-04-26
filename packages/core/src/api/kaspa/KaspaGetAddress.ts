import { KaspaGetAddress as HardwareKaspaGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { KaspaGetAddressParams, KaspaAddress } from '../../types';

export default class KaspaGetAddress extends BaseMethod<HardwareKaspaGetAddress[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: KaspaGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'prefix', type: 'string' },
        { name: 'scheme', type: 'string' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        prefix: batch.prefix,
        scheme: batch.scheme,
      });
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.3.0',
      },
    };
  }

  async run() {
    const responses: KaspaAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('KaspaGetAddress', 'KaspaAddress', {
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
