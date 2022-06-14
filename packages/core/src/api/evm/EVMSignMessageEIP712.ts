import { EthereumSignMessageEIP712 } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class EVMSignMessageEIP712 extends BaseMethod<EthereumSignMessageEIP712> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'domainHash', type: 'hexString', required: true },
      { name: 'messageHash', type: 'hexString', required: true },
    ]);

    const { path, domainHash, messageHash } = this.payload;

    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      domain_hash: formatAnyHex(domainHash),
      message_hash: formatAnyHex(messageHash),
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'EthereumSignMessageEIP712',
      'EthereumMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(res.message);
  }
}
