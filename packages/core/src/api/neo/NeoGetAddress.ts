import { NeoGetAddress as HardwareNeoGetAddress } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { NeoAddress, NeoGetAddressParams } from '../../types/api/neoGetAddress';

export default class NeoGetAddress extends BaseMethod<HardwareNeoGetAddress[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: NeoGetAddressParams) => {
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
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const responses: NeoAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('NeoGetAddress', 'NeoAddress', {
        ...param,
      });

      const path = serializedPath(param.address_n);
      responses.push({
        path,
        address: res.message.address ?? '',
        pub: res.message.public_key ?? '',
      });

      this.postPreviousAddressMessage({
        address: res.message.address,
        path,
      });
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
