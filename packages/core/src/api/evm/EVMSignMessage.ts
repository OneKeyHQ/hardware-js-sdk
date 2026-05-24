import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import TransportManager from '../../data-manager/TransportManager';
import signMessage from './latest/signMessage';
import signMessageLegacyV1 from './legacyV1/signMessage';

import type { EthereumSignMessageOneKey } from '@onekeyfe/hd-transport';

export default class EVMSignMessage extends BaseMethod<EthereumSignMessageOneKey> {
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
    if (TransportManager.getMessageVersion() === 'v1') {
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
