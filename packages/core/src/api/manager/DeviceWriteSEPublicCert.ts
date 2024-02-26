import { WriteSEPublicCert } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class DeviceWriteSEPublicCert extends BaseMethod<WriteSEPublicCert> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = {
      public_cert: this.payload.public_cert,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('WriteSEPublicCert', 'Success');

    return Promise.resolve(res.message);
  }
}
