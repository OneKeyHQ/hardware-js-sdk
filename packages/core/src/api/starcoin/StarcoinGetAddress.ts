import { StarcoinGetAddress as HardwareStarcoinGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath, serializedPath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { StarcoinAddress, StarcoinGetAddressParams } from '../../types/api/starcoinGetAddress';

export default class StarcoinGetAddress extends BaseMethod<HardwareStarcoinGetAddress[]> {
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
    payload.bundle.forEach((batch: StarcoinGetAddressParams) => {
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
    const responses: StarcoinAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('StarcoinGetAddress', 'StarcoinAddress', {
        ...param,
      });

      const path = serializedPath(param.address_n);
      responses.push({
        path,
        ...res.message,
      });

      this.postPreviousAddressMessage({
        path,
        address: res.message.address,
      });
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
