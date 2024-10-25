import { ReadSEPublicKey as HardwareReadSEPublicKey } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class ReadSEPublicKey extends BaseMethod<HardwareReadSEPublicKey> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicKey', 'SEPublicKey');

    return Promise.resolve(res.message);
  }
}
