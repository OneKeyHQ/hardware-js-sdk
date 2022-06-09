import { BixinReboot } from '@onekeyfe/hd-transport/src/types/messages';
import { BaseMethod } from './BaseMethod';

// Upload hint Reboot BootLoader
export default class DeviceUpdateReboot extends BaseMethod<BixinReboot> {
  init() {}

  async run() {
    const res = await this.device.commands.typedCall('BixinReboot', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
