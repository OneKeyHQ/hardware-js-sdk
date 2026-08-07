import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

import type { ReadSEPublicCert } from '@onekeyfe/hd-transport';

export default class DeviceReadSEPublicCert extends BaseMethod<ReadSEPublicCert> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const res = await this.device.commands.typedCall('ReadSEPublicCert', 'SEPublicCert');

    return Promise.resolve(res.message);
  }
}
