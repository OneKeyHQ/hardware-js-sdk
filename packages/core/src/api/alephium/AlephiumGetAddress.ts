import { AlephiumGetAddress as HardwareAlephiumGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { AlephiumAddress, AlephiumGetAddressParams } from '../../types';

export default class AlephiumGetAddress extends BaseMethod<HardwareAlephiumGetAddress[]> {
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
    payload.bundle.forEach((batch: AlephiumGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'includePublicKey', type: 'boolean' },
        { name: 'group', type: 'number' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        include_public_key: batch.includePublicKey ?? false,
        target_group: batch.group,
      });
    });
  }

  getVersionRange() {
    return {
      classic1s: {
        min: '4.0.0',
      },
      model_touch: {
        min: '4.10.0',
      },
    };
  }

  async run() {
    const responses: AlephiumAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('AlephiumGetAddress', 'AlephiumAddress', {
        ...param,
      });

      const { address } = res.message;

      const result = {
        path: serializedPath(param.address_n),
        address,
        publicKey: param.include_public_key ? res.message.public_key : undefined,
        derivedPath: serializedPath(res.message.derived_path),
      };
      responses.push(result);

      this.postPreviousAddressMessage(result);
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
