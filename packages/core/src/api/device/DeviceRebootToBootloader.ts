import { RebootToBootloader } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

// Reboot BootLoader
export default class DeviceRebootToBootloader extends BaseMethod<RebootToBootloader> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const res = await this.device.commands.typedCall('RebootToBootloader', 'Success');

    return Promise.resolve(res.message);
  }
}
