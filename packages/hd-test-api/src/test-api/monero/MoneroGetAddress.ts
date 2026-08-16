import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { validateParams } from '../helpers/paramsValidator';

import type {
  MoneroAddress as HardwareMoneroAddress,
  MoneroGetAddress as HardwareMoneroGetAddress,
} from '@onekeyfe/hd-transport';

type MoneroAddress = HardwareMoneroAddress & { path: string };

export default class MoneroGetAddress extends BaseMethod<HardwareMoneroGetAddress[]> {
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
    payload.bundle.forEach((batch: any) => {
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
    const responses: MoneroAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('MoneroGetAddress', 'MoneroAddress', {
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
