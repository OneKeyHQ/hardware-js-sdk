import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import signMessage from './latest/signMessage';
import signMessageLegacyV1 from './legacyV1/signMessage';
import { shouldUseLegacyV1EvmMessages } from './protocol';

import type { EthereumSignMessageOneKey } from '@onekeyfe/hd-transport';

export default class EVMSignMessage extends BaseMethod<EthereumSignMessageOneKey> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'chainId', type: 'number' },
      { name: 'usePreInitialize', type: 'boolean' },
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
    if (shouldUseLegacyV1EvmMessages(this.device)) {
      return signMessageLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        params: this.params,
      });
    }

    return signMessage({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      params: this.params,
    });
  }
}
