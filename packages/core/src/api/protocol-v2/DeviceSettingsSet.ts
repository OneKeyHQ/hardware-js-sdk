import { BaseMethod } from '../BaseMethod';
import { mapDeviceSettingsToState } from '../../device/DeviceStateMapper';
import { getProtocolV2SettingsBehavior } from '../../protocols/protocol-v2/settingsUnlockPolicy';
import { invalidParameter } from '../helpers/filesystemValidation';

import type { DeviceSettings } from '@onekeyfe/hd-transport';

export type DeviceSettingsSetParams = {
  settings?: Omit<DeviceSettings, 'passphrase_enable' | 'airgap_mode'>;
};

export default class DeviceSettingsSet extends BaseMethod<{
  settings: Omit<DeviceSettings, 'passphrase_enable' | 'airgap_mode'>;
}> {
  init() {
    const { settings } = this.payload;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw invalidParameter('Parameter [settings] must be an object.');
    }

    const {
      passphrase_enable: _passphraseEnable,
      airgap_mode: _airgapMode,
      ...supported
    } = settings as DeviceSettings;
    if (Object.keys(supported).length === 0) {
      throw invalidParameter('Parameter [settings] must contain at least one supported setting.');
    }

    this.requireProtocolV2 = true;
    const behavior = getProtocolV2SettingsBehavior(supported);
    this.unlockPolicy = behavior.unlockPolicy;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { settings: supported };
    this.protocolV2UiInteraction = behavior.uiInteraction;
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', this.params);
    this.device.updateState(mapDeviceSettingsToState(this.params.settings), 'apply-settings');
    return Promise.resolve(res.message);
  }
}
