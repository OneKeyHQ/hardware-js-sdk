import { BaseMethod } from '../BaseMethod';
import { normalizeRebootType } from './helpers';

import type { DeviceRebootParams } from './helpers';

export default class DevReboot extends BaseMethod<DeviceRebootParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      rebootType: this.payload.rebootType,
      reboot_type: this.payload.reboot_type,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('DevReboot', 'Success', {
      reboot_type: normalizeRebootType(this.params.reboot_type ?? this.params.rebootType),
    });
    return Promise.resolve(res.message);
  }
}
