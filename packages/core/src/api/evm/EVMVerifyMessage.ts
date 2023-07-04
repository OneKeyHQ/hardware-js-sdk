import { EthereumVerifyMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod<EthereumVerifyMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'address', type: 'string', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'signature', type: 'hexString', required: true },
      { name: 'chainId', type: 'number' },
    ]);

    const { address, messageHex, signature } = formatAnyHex(this.payload);

    this.params = {
      address,
      message: messageHex,
      signature,
      chain_id: this.payload.chainId,
    };
  }

  async run() {
    let res;
    if (this.supportTrezor) {
      res = await this.device.commands.typedCall('EthereumVerifyMessage', 'Success', {
        ...this.params,
      });
    } else {
      res = await this.device.commands.typedCall('EthereumVerifyMessageOneKey', 'Success', {
        ...this.params,
      });
    }

    return Promise.resolve(res.message);
  }
}
