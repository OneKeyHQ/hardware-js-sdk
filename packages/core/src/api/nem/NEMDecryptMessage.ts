import { NEMDecryptMessage as HardwareNEMDecryptMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath, serializedPath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

const MAINNET = 0x68; // 104

export default class NEMDecryptMessage extends BaseMethod<HardwareNEMDecryptMessage> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
