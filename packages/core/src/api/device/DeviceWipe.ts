import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { getProtocolV2SettingsBehavior } from '../../protocols/protocol-v2/settingsBehavior';

import type { WipeDevice } from '@onekeyfe/hd-transport';

export default class DeviceWipe extends BaseMethod<WipeDevice> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    const behavior = getProtocolV2SettingsBehavior({
      kind: 'page',
      page: DeviceSettingsPage.DeviceReset,
      reason: 'device-management',
      operation: 'wipe-device',
    });
    this.unlockPolicy = behavior.unlockPolicy;
    this.protocolV2Interaction = behavior.interaction;
  }

  async run() {
    if (this.device.isProtocolV2()) {
      const res = await this.device.commands.typedCall('DeviceSettingsPageShow', 'Success', {
        page: DeviceSettingsPage.DeviceReset,
      });
      this.device.invalidateAfterWipe();
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('WipeDevice', 'Success');
    this.device.invalidateAfterWipe();

    return Promise.resolve(res.message);
  }
}
