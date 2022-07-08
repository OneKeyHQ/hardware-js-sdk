import { SolanaGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { SolanaAddress, SolanaGetAddressParams } from '../../types';

export default class SolGetAddress extends BaseMethod<SolanaGetAddress[]> {
  hasBundle = false;

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: SolanaGetAddressParams) => {
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
    const responses: SolanaAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      // @ts-expect-error
      const res = await this.device.commands.typedCall('SolanaGetAddress', 'SolanaAddress', {
        ...param,
      });

      // @ts-expect-error
      const { address } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        address,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
