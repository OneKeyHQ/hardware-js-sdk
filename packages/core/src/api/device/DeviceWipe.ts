import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';

import type { WipeDevice } from '@onekeyfe/hd-transport';

export default class DeviceWipe extends BaseMethod<WipeDevice> {
  init() {
    this.useDevicePassphraseState = false;
    this.protocolV2UiInteraction = {
      request: 'button',
      source: 'method-lifecycle',
      reason: 'device-management',
      completion: 'page-accepted',
      deviceOnly: true,
      page: DeviceSettingsPage.DeviceReset,
      operation: 'wipe-device',
    };
  }

  async run() {
    if (this.device.isProtocolV2()) {
      const res = await this.device.commands.typedCall('DeviceSettingsPageShow', 'Success', {
        page: DeviceSettingsPage.DeviceReset,
      });
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('WipeDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
