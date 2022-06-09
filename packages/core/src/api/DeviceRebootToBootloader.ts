import { RebootToBootloader } from '@onekeyfe/hd-transport/src/types/messages';
import { BaseMethod } from './BaseMethod';

// Reboot BootLoader
export default class DeviceRebootToBootloader extends BaseMethod<RebootToBootloader> {
  init() {}

  async run() {
    const res = await this.device.commands.typedCall('RebootToBootloader', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
