import { WriteSEPrivateKey } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class DeviceWriteSEPrivateKey extends BaseMethod<WriteSEPrivateKey> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      private_key: this.payload.private_key,
    };
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const res = await this.device.commands.typedCall('WriteSEPrivateKey', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
