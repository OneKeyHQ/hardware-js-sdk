/* eslint-disable max-classes-per-file */
import { CoreExtensionBaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import {
  validateDeviceFactoryCertificateWriteParams,
  validateDeviceFactoryChallengeSignParams,
  validateDeviceFactoryInfoSetParams,
} from './validation';

import type {
  DeviceCertificate,
  DeviceCertificateSignature,
  DeviceFactoryCertificateWriteParams,
  DeviceFactoryChallengeSignParams,
  DeviceFactoryInfo,
  DeviceFactoryInfoSetParams,
} from './types';

type Success = { message?: string };

abstract class FactoryMethod<Params = undefined> extends CoreExtensionBaseMethod<Params> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  protected configureFactoryCall() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }
}

export class DeviceFactoryInfoSet extends FactoryMethod<DeviceFactoryInfoSetParams> {
  init() {
    this.configureFactoryCall();
    this.params = validateDeviceFactoryInfoSetParams(this.payload);
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      { info: DeviceFactoryInfoSetParams },
      Success
    >('DeviceFactoryInfoSet', 'Success', { info: this.params });
    return response.message;
  }
}

export class DeviceFactoryInfoGet extends FactoryMethod {
  init() {
    this.configureFactoryCall();
    this.params = undefined;
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      Record<string, never>,
      DeviceFactoryInfo
    >('DeviceFactoryInfoGet', 'DeviceFactoryInfo', {});
    return response.message;
  }
}

export class DeviceFactoryCertificateWrite extends FactoryMethod<DeviceFactoryCertificateWriteParams> {
  init() {
    this.configureFactoryCall();
    this.params = validateDeviceFactoryCertificateWriteParams(this.payload);
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      { cert: { cert_and_pubkey: string; private_key?: string } },
      Success
    >('DeviceCertificateWrite', 'Success', {
      cert: {
        cert_and_pubkey: this.params.certificate,
        private_key: this.params.privateKey,
      },
    });
    return response.message;
  }
}

export class DeviceFactoryCertificateRead extends FactoryMethod {
  init() {
    this.configureFactoryCall();
    this.params = undefined;
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      Record<string, never>,
      DeviceCertificate
    >('DeviceCertificateRead', 'DeviceCertificate', {});
    return response.message;
  }
}

export class DeviceFactoryChallengeSign extends FactoryMethod<DeviceFactoryChallengeSignParams> {
  init() {
    this.configureFactoryCall();
    this.params = validateDeviceFactoryChallengeSignParams(this.payload);
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      { data: string },
      DeviceCertificateSignature
    >('DeviceCertificateSign', 'DeviceCertificateSignature', { data: this.params.digest });
    return response.message;
  }
}
