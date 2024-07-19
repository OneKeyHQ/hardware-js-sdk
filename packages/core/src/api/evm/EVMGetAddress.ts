import { EthereumGetAddressOneKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { EVMAddress, EVMGetAddressParams } from '../../types';
import TransportManager from '../../data-manager/TransportManager';
import getAddressLegacyV1 from './legacyV1/getAddress';
import getAddress from './latest/getAddress';

export default class EvmGetAddress extends BaseMethod<EthereumGetAddressOneKey[]> {
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
    payload.bundle.forEach((batch: EVMGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'chainId', type: 'number' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        chain_id: batch.chainId,
      });
    });
  }

  async getEvmAddress(param: EthereumGetAddressOneKey) {
    if (TransportManager.getMessageVersion() === 'v1') {
      return getAddressLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        param,
      });
    }

    return getAddress({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      param,
    });
  }

  async run() {
    const responses: EVMAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.getEvmAddress(param);

      const { address } = res.message;

      if (!address) {
        throw new Error('EthereumGetAddressOneKey: address is undefined');
      }

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
