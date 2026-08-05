import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

import type { NEMDecryptMessage as HardwareNEMDecryptMessage } from '@onekeyfe/hd-transport';

const MAINNET = 0x68; // 104

export default class NEMDecryptMessage extends BaseMethod<HardwareNEMDecryptMessage> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.params = {
      address_n: validatePath(this.payload.path, 3),
      network: this.payload.network ?? MAINNET,
      public_key: this.payload.public_key,
      payload: this.payload.payload,
    };
  }

  async run() {
    return this.device.commands.typedCall('NEMDecryptMessage', 'NEMDecryptedMessage', {
      ...this.params,
    });
  }
}
