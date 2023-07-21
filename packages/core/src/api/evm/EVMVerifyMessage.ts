import { EthereumVerifyMessageOneKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import TransportManager from '../../data-manager/TransportManager';
import verifyMessageLegacyV1 from './legacyV1/verifyMessage';
import verifyMessage from './latest/verifyMessage';

export default class EVMSignMessage extends BaseMethod<EthereumVerifyMessageOneKey> {
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
    if (TransportManager.getMessageVersion() === 'v1') {
      return verifyMessageLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        params: this.params,
      });
    }

    return verifyMessage({
      device: this.device,
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      params: this.params,
      supportTrezor: this.supportTrezor,
    });
  }
}
