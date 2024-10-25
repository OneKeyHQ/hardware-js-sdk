import { GetDeviceInfo } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class GetDeviceInfoSettings extends BaseMethod<GetDeviceInfo> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.skipForceUpdateCheck = true;

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall('GetDeviceInfo', 'DeviceInfo');

    return Promise.resolve(res.message);
  }
}
