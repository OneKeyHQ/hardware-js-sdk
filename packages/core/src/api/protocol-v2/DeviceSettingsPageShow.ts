import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';
import { getProtocolV2SettingsBehavior } from '../../protocols/protocol-v2/settingsUnlockPolicy';

export type SupportedDeviceSettingsPage = DeviceSettingsPage;

export type DeviceSettingsPageShowParams = {
  page?:
    | SupportedDeviceSettingsPage
    | 'DeviceReset'
    | 'DevicePinChange'
    | 'DevicePassphrase'
    | 'DeviceAirgap';
  fieldName?: string;
  field_name?: string;
};

const SUPPORTED_PAGES = new Set<number>([
  DeviceSettingsPage.DeviceReset,
  DeviceSettingsPage.DevicePinChange,
  DeviceSettingsPage.DevicePassphrase,
  DeviceSettingsPage.DeviceAirgap,
]);

function normalizePage(value: DeviceSettingsPageShowParams['page']): SupportedDeviceSettingsPage {
  const page = typeof value === 'string' ? DeviceSettingsPage[value] : value;
  if (page !== undefined && SUPPORTED_PAGES.has(page)) {
    return page;
  }
  throw invalidParameter(
    'Parameter [page] must be DeviceReset, DevicePinChange, DevicePassphrase, or DeviceAirgap.'
  );
}

export default class DeviceSettingsPageShow extends BaseMethod<{
  page: SupportedDeviceSettingsPage;
  field_name?: string;
}> {
  init() {
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      page: normalizePage(this.payload.page),
      field_name: this.payload.field_name ?? this.payload.fieldName,
    };
    const behavior = getProtocolV2SettingsBehavior({
      kind: 'page',
      page: this.params.page,
    });
    this.unlockPolicy = behavior.unlockPolicy;
    this.protocolV2UiInteraction = behavior.uiInteraction;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceSettingsPageShow',
      'Success',
      this.params
    );
    if (this.params.page === DeviceSettingsPage.DevicePassphrase) {
      await this.device.getDeviceState({ refreshSections: ['status'] });
    } else if (this.params.page === DeviceSettingsPage.DeviceAirgap) {
      await this.device.getDeviceState({ refreshSections: ['settings'] });
    }
    return Promise.resolve(res.message);
  }
}
