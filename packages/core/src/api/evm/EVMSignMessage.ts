import { EthereumSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getEvmDefinitionParams } from './getEthereumDefinitions';

export default class EVMSignMessage extends BaseMethod<EthereumSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'chainId', type: 'number' },
    ]);

    const { path, messageHex, chainId } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      message: formatAnyHex(messageHex),
      chain_id: chainId,
    };
  }

  async run() {
    let res;
    if (this.supportTrezor) {
      const definitionParams = await getEvmDefinitionParams({
        addressN: this.params.address_n,
        chainId: this.params.chain_id,
        device: this.device,
      });
      res = await this.device.commands.typedCall(
        'EthereumSignMessage',
        'EthereumMessageSignature',
        {
          ...this.params,
          ...definitionParams,
        }
      );
    } else {
      res = await this.device.commands.typedCall(
        'EthereumSignMessageOneKey',
        'EthereumMessageSignatureOneKey',
        {
          ...this.params,
        }
      );
    }

    return Promise.resolve(res.message);
  }
}
