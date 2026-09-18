import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateDeviceFactoryCertificateWriteParams } from './helpers';

import type { DeviceFactoryCertificateWriteParams } from './helpers';

const FACTORY_CERTIFICATE_WRITE_RESPONSE_TIMEOUT_MS = 15 * 1000;

export default class DeviceFactoryCertificateWrite extends BaseMethod<DeviceFactoryCertificateWriteParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = validateDeviceFactoryCertificateWriteParams(this.payload);
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceCertificateWrite',
      'Success',
      {
        cert: {
          cert_and_pubkey: this.params.certificate,
          private_key: this.params.privateKey,
        },
      },
      {
        // The device may reset its USB link after committing one-time key material.
        // Bound the old link wait so the caller can reconnect and verify postconditions.
        timeoutMs: FACTORY_CERTIFICATE_WRITE_RESPONSE_TIMEOUT_MS,
      }
    );
    return res.message;
  }
}
