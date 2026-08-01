import { BaseMethod } from '../BaseMethod';

import type { DeviceFactoryInfoSetParams } from './helpers';

export default class DeviceFactoryInfoSet extends BaseMethod<DeviceFactoryInfoSetParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      version: this.payload.version,
      serial_number: this.payload.serial_number,
      burn_in_completed: this.payload.burn_in_completed,
      factory_test_completed: this.payload.factory_test_completed,
      manufacture_time: this.payload.manufacture_time,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceFactoryInfoSet', 'Success', {
      info: {
        version: this.params.version,
        serial_number: this.params.serial_number,
        burn_in_completed: this.params.burn_in_completed,
        factory_test_completed: this.params.factory_test_completed,
        manufacture_time: this.params.manufacture_time,
      },
    });
    return Promise.resolve(res.message);
  }
}
