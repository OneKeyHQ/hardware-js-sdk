import { NostrSignSchnorr as SignSchnorr } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class NostrSignSchnorr extends BaseMethod<SignSchnorr> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'hash', required: true, type: 'string' },
    ]);
    const addressN = validatePath(payload.path, 5);

    this.params = {
      address_n: addressN,
      hash: payload.hash,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.6.0',
      },
      model_touch: {
        min: '4.7.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'NostrSignSchnorr',
      'NostrSignedSchnorr',
      this.params
    );

    return {
      path: serializedPath(this.params.address_n),
      rawHash: this.params.hash,
      signature: message.signature,
    };
  }
}
