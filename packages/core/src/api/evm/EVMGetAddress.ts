import { EthereumGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { EVMAddress, EVMGetAddressParams } from '../../types/api/evmGetAddress';
import { getEvmDefinitionParams } from './getEthereumDefinitions';

export default class EvmGetAddress extends BaseMethod<EthereumGetAddress[]> {
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

  async run() {
    const responses: EVMAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      let res;
      if (this.supportTrezor) {
        const definitionParams = await getEvmDefinitionParams({
          addressN: param.address_n,
          chainId: param.chain_id,
          device: this.device,
        });
        res = await this.device.commands.typedCall('EthereumGetAddress', 'EthereumAddress', {
          ...param,
          ...definitionParams,
        });
      } else {
        res = await this.device.commands.typedCall(
          'EthereumGetAddressOneKey',
          'EthereumAddressOneKey',
          {
            ...param,
          }
        );
      }

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
