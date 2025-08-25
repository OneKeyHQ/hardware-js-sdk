import { AptosSignSIWAMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { AptosSignInMessageParams, AptosSignInMessageSignature } from '../../types';

export default class AptosSignInMessage extends BaseMethod<AptosSignSIWAMessage> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'payload', type: 'string', required: true },
    ]);

    const { path, payload } = this.payload as AptosSignInMessageParams;
    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      siwa_payload: payload,
    };
  }

  getVersionRange() {
    return {
      pro: {
        min: '4.16.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'AptosSignSIWAMessage',
      'AptosMessageSignature',
      {
        ...this.params,
      }
    );

    const { address, signature } = res.message;

    return Promise.resolve<AptosSignInMessageSignature>({
      path: serializedPath(this.params.address_n),
      address,
      signature,
    });
  }
}
