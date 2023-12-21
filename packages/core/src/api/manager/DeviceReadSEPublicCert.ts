import { ReadSEPublicCert } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class DeviceReadSEPublicCert extends BaseMethod<ReadSEPublicCert> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicCert', 'SEPublicCert');

    return Promise.resolve(res.message);
  }
}
