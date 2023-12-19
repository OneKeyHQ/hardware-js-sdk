import { NostrEncryptMessage as EncryptMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class NostrEncryptMessage extends BaseMethod<EncryptMessage> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'pubkey', required: true, type: 'string' },
      { name: 'plaintext', required: true, type: 'string' },
      { name: 'showOnOneKey', type: 'boolean' },
    ]);
    const addressN = validatePath(payload.path, 5);

    this.params = {
      address_n: addressN,
      pubkey: payload.pubkey,
      msg: payload.plaintext,
      show_display: payload.showOnOneKey ?? true,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.6.0',
      },
      model_touch: {
        min: '4.6.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'NostrEncryptMessage',
      'NostrEncryptedMessage',
      this.params
    );

    return {
      path: serializedPath(this.params.address_n),
      pubkey: this.params.pubkey,
      plaintext: this.params.msg,
      encryptedMessage: message.msg,
    };
  }
}
