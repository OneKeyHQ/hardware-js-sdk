import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { FirmwareUpdateEmmc } from '@onekeyfe/hd-transport';

export default class FirmwareUpdateEmmcTest extends BaseMethod<FirmwareUpdateEmmc> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      path: this.payload.path,
      reboot_on_success: this.payload.reboot_on_success,
    };
  }

  async run() {
    return this.device.getCommands().typedCall('FirmwareUpdateEmmc', 'Success', this.params);
  }
}
