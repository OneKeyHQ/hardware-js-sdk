import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

export default class DeviceFactoryCertificateRead extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceCertificateRead',
      'DeviceCertificate',
      {}
    );
    return res.message;
  }
}
