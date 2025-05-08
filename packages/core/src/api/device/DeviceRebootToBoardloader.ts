import { OneKeyRebootType } from '@onekeyfe/hd-transport';
import type { RebootToBoardloaderParams } from '../../types/api/deviceRebootToBoardloader';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';

// Reboot BoardLoader
export default class DeviceRebootToBoardloader extends FirmwareUpdateBaseMethod<RebootToBoardloaderParams> {
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
    const res = await this.reboot(OneKeyRebootType.Boardloader);
    return Promise.resolve(res.message);
  }
}
