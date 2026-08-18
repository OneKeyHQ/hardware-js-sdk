import { DeviceSessionPinType, DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';

import type { WipeDevice } from '@onekeyfe/hd-transport';

export default class DeviceWipe extends BaseMethod<WipeDevice> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.unlockPolicy = 'unlock-before-run';
    // Protocol V2 device-management actions are not wallet-scoped, so either
    // the main PIN or an Attach PIN may authorize them.
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
    this.useDevicePassphraseState = false;
    this.protocolV2UiInteraction = {
      request: 'button',
      source: 'method-lifecycle',
      reason: 'device-management',
      completion: 'operation-completed',
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
      this.device.invalidateAfterWipe();
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('WipeDevice', 'Success');
    this.device.invalidateAfterWipe();

    return Promise.resolve(res.message);
  }
}
