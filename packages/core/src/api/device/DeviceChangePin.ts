import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { invalidParameter } from '../helpers/filesystemValidation';
import { getProtocolV2SettingsBehavior } from '../../protocols/protocol-v2/settingsBehavior';

import type { ChangePin } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

export default class DeviceChangePin extends BaseMethod<ChangePin> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [{ name: 'remove', type: 'boolean' }]);

    this.params = {
      remove: this.payload.remove,
    };
    const behavior = getProtocolV2SettingsBehavior({
      kind: 'page',
      page: DeviceSettingsPage.DevicePinChange,
      reason: 'change-pin',
      operation: 'change-pin',
    });
    this.unlockPolicy = behavior.unlockPolicy;
    this.protocolV2Interaction = behavior.interaction;
  }

  validateForDevice(device: Device) {
    if (device.isProtocolV2() && this.params.remove) {
      throw invalidParameter(
        'Parameter [remove=true] is not supported by the Pro2 device PIN page.'
      );
    }
  }

  async run() {
    if (this.device.isProtocolV2()) {
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
