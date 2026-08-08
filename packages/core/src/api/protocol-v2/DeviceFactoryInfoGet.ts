import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class DeviceFactoryInfoGet extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Neo/Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceFactoryInfoGet',
      'DeviceFactoryInfo',
      {}
    );
    return Promise.resolve(res.message);
  }
}
