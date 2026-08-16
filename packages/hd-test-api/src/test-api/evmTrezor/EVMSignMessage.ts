import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import signMessageLegacyV1 from './legacyV1/signMessage';

import type { EthereumSignMessageOneKey } from '@onekeyfe/hd-transport';

export default class EVMSignMessage extends BaseMethod<EthereumSignMessageOneKey> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

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
    return signMessageLegacyV1({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      params: this.params,
    });
  }
}
