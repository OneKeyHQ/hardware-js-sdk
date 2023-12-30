import { MoneroGetAddress as HardwareMoneroGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class MoneroGetWatchKey extends BaseMethod<HardwareMoneroGetAddress[]> {
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
    payload.bundle.forEach((batch: any) => {
      const addressN = validatePath(batch.path, 3);

      const { network_type } = batch;

      this.params.push({
        address_n: addressN,
        network_type,
      });
    });
  }

  async run() {
    const responses: any[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('MoneroGetWatchKey', 'MoneroWatchKey', {
        ...param,
      });

      const { address, watch_key } = res.message;

      const result = {
        path: serializedPath(param.address_n),
        address,
        watch_key,
      };
      responses.push(result);

      this.postPreviousAddressMessage(result);
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
