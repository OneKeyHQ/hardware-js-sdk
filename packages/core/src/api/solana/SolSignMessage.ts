import { SolanaSignMessage as HardwareSolSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

export default class SolSignMessage extends BaseMethod<HardwareSolSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
      pro: {
        min: '4.12.0',
      },
      classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'SolanaSignMessage',
      'SolanaSignedMessage',
      {
        ...this.params,
      }
    );

    return Promise.resolve(response.message);
  }
}
