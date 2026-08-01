import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateDeviceFactoryCertificateWriteParams } from './helpers';

import type { DeviceFactoryCertificateWriteParams } from './helpers';

export default class DeviceFactoryCertificateWrite extends BaseMethod<DeviceFactoryCertificateWriteParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.requireDeviceMode = [UI_REQUEST.BOOTLOADER];
    this.params = validateDeviceFactoryCertificateWriteParams(this.payload);
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceCertificateWrite', 'Success', {
      cert: {
        cert_and_pubkey: this.params.certificate,
        private_key: this.params.privateKey,
      },
    });
    return res.message;
  }
}
