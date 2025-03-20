import { BaseMethod } from '../BaseMethod';
import type { RebootToBoardloaderParams } from '../../types/api/deviceRebootToBoardloader';

// Reboot BoardLoader
export default class DeviceRebootToBoardloader extends BaseMethod<RebootToBoardloaderParams> {
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
    // On Touch devices, messsage code 904 is RebootToBoardloader
    // so BininOutMessageSE message code 904 is used here
    const res = await this.device.commands.typedCall('BixinOutMessageSE', 'Success');

    return Promise.resolve(res.message);
  }
}
