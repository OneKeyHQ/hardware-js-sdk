import { DeviceBackToBoot } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { DeviceModelToTypes } from '../../types';
import { getDeviceType } from '../../utils';

// Upload hint Reboot BootLoader
export default class DeviceUpdateReboot extends BaseMethod<DeviceBackToBoot> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const deviceType = getDeviceType(this.device.features);
    let res;
    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      res = await this.device.commands.typedCall('BixinReboot', 'Success');
    } else {
      res = await this.device.commands.typedCall('DeviceBackToBoot', 'Success');
    }

    return Promise.resolve(res.message);
  }
}
