import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { getFirmwareType } from '../../utils';

import type { DnxGetAddress as HardwareDnxGetAddress } from '@onekeyfe/hd-transport';
import type { DnxAddress, DnxGetAddressParams } from '../../types';

export default class DnxGetAddress extends BaseMethod<HardwareDnxGetAddress[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: DnxGetAddressParams) => {
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
      classic: {
        min: '3.8.0',
      },
    };
  }

  async run() {
    if (this.device.originalDescriptor?.protocolType === 'V2') {
      throw createDeviceNotSupportMethodError(this.name, getFirmwareType(this.device.features));
    }

    const responses: DnxAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('DnxGetAddress', 'DnxAddress', {
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

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
