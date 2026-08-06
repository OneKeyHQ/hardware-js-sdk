import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

import type { SolanaSignOffChainMessage as HardwareSolSignOffChainMessage } from '@onekeyfe/hd-transport';

export default class SolSignOffchainMessage extends BaseMethod<HardwareSolSignOffChainMessage> {
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
      { name: 'messageVersion', type: 'number', required: false },
      { name: 'messageFormat', type: 'number', required: false },
      { name: 'applicationDomainHex', type: 'hexString', required: false },
    ]);

    const { path, messageHex, messageVersion, messageFormat, applicationDomainHex } = this.payload;
    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
      message_version: messageVersion ?? undefined,
      message_format: messageFormat ?? undefined,
      application_domain: applicationDomainHex ?? undefined,
    };
  }

  getVersionRange() {
    return {
      model_pro2: {
        min: '0.0.0',
      },
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'SolanaSignOffChainMessage',
      'SolanaMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve({
      signature: response.message.signature,
      pub: response.message.public_key,
    });
  }
}
