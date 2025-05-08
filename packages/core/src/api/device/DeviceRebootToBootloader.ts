import { OneKeyRebootType, RebootToBootloader } from '@onekeyfe/hd-transport';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';

// Reboot BootLoader
export default class DeviceRebootToBootloader extends FirmwareUpdateBaseMethod<RebootToBootloader> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  getVersionRange() {
    return {
      classic: {
        min: '2.1.11',
      },
      mini: {
        min: '2.1.11',
      },
    };
  }

  async run() {
    const res = await this.reboot(OneKeyRebootType.BootLoader);

    return Promise.resolve(res.message);
  }
}
