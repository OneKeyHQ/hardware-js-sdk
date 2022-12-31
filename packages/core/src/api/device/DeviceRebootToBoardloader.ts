import { BaseMethod } from '../BaseMethod';
import type { RebootToBoardloaderParams } from '../../types/api/deviceRebootToBoardloader';

// Reboot BoardLoader
export default class DeviceRebootToBoardloader extends BaseMethod<RebootToBoardloaderParams> {
  init() {
    this.useDevicePassphraseState = false;
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
    const res = await this.device.commands.typedCall('RebootToBoardloader', 'Success');

    return Promise.resolve(res.message);
  }
}
