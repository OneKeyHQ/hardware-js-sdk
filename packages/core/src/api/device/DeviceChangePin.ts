import { DeviceSessionPinType, DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { invalidParameter } from '../helpers/filesystemValidation';

import type { ChangePin } from '@onekeyfe/hd-transport';

export default class DeviceChangePin extends BaseMethod<ChangePin> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.unlockPolicy = 'unlock-before-run';
    // Protocol V2 device-management actions are not wallet-scoped, so either
    // the main PIN or an Attach PIN may authorize them.
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [{ name: 'remove', type: 'boolean' }]);

    this.params = {
      remove: this.payload.remove,
    };
    this.protocolV2UiInteraction = {
      request: 'button',
      source: 'method-lifecycle',
      reason: 'change-pin',
      completion: 'operation-completed',
      deviceOnly: true,
      page: DeviceSettingsPage.DevicePinChange,
    };
  }

  async run() {
    if (this.device.isProtocolV2()) {
      if (this.params.remove) {
        throw invalidParameter(
          'Parameter [remove=true] is not supported by the Pro2 device PIN page.'
        );
      }
      const res = await this.device.commands.typedCall('DeviceSettingsPageShow', 'Success', {
        page: DeviceSettingsPage.DevicePinChange,
      });
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('ChangePin', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
