import { LnurlAuth as ILnurlAuth } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { bytesToHex } from '../helpers/hexUtils';

export default class LnurlAuth1 extends BaseMethod<ILnurlAuth> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    validateParams(payload, [
      { name: 'domain', type: 'string', required: true },
      { name: 'k1', type: 'string', required: true },
    ]);

    this.params = {
      domain: bytesToHex(Buffer.from(payload.domain, 'utf-8')),
      data: bytesToHex(Buffer.from(payload.k1, 'hex')),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.7.0',
      },
      model_touch: {
        min: '4.8.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'LnurlAuth',
      'LnurlAuthResp',
      this.params
    );

    validateResult(message, ['publickey', 'path']);

    return {
      ...message,
      pub: message.publickey,
    };
  }
}
