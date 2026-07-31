import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import verifyMessageLegacyV1 from './legacyV1/verifyMessage';
import verifyMessage from './latest/verifyMessage';
import { shouldUseLegacyV1EvmMessages } from './protocol';

import type { EthereumVerifyMessageOneKey } from '@onekeyfe/hd-transport';

export default class EVMSignMessage extends BaseMethod<EthereumVerifyMessageOneKey> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

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
    if (shouldUseLegacyV1EvmMessages(this.device)) {
      return verifyMessageLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        params: this.params,
      });
    }

    return verifyMessage({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      params: this.params,
    });
  }
}
