import { EmmcFixPermission as HardwareEmmcFixPermission } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class EmmcFixPermission extends BaseMethod<HardwareEmmcFixPermission> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  async run() {
    const res = await this.device.commands.typedCall('EmmcFixPermission', 'Success');

    return Promise.resolve(res.message);
  }
}
