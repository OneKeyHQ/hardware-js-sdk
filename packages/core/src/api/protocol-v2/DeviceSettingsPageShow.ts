import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';

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
    this.unlockPolicy = 'retry-on-locked';
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      page: normalizePage(this.payload.page),
      field_name: this.payload.field_name ?? this.payload.fieldName,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceSettingsPageShow',
      'Success',
      this.params
    );
    return Promise.resolve(res.message);
  }
}
