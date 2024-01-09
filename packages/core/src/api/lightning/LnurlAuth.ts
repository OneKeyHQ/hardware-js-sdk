import { LnurlAuth as ILnurlAuth } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

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
      domain: payload.domain,
      data: payload.k1,
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
      'LnurlAuth',
      'LnurlAuthResp',
      this.params
    );

    return message;
  }
}
