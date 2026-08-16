/* eslint-disable max-classes-per-file */
import { CoreExtensionBaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

type Success = { message?: string };

abstract class ProtocolV1FactoryMethod<Params = undefined> extends CoreExtensionBaseMethod<Params> {
  getSupportedProtocols() {
    return ['V1'] as const;
  }

  protected configureFactoryCall() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.skipForceUpdateCheck = true;
  }
}

export class DeviceInfoSettings extends ProtocolV1FactoryMethod<{
  serial_no?: string;
  cpu_info?: string;
  pre_firmware?: string;
}> {
  init() {
    this.configureFactoryCall();
    this.params = {
      serial_no: this.payload.serial_no,
      cpu_info: this.payload.cpu_info,
      pre_firmware: this.payload.pre_firmware,
    };
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<typeof this.params, Success>(
      'DeviceInfoSettings',
      'Success',
      this.params
    );
    return response.message;
  }
}

export class GetDeviceInfoSettings extends ProtocolV1FactoryMethod<Record<string, never>> {
  init() {
    this.configureFactoryCall();
    this.params = {};
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      Record<string, never>,
      Record<string, unknown>
    >('GetDeviceInfo', 'DeviceInfo', {});
    return response.message;
  }
}

export class DeviceReadSEPublicCert extends ProtocolV1FactoryMethod<Record<string, never>> {
  init() {
    this.configureFactoryCall();
    this.params = {};
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      Record<string, never>,
      { public_cert?: string }
    >('ReadSEPublicCert', 'SEPublicCert', {});
    return response.message;
  }
}

export class DeviceWriteSEPrivateKey extends ProtocolV1FactoryMethod<{ private_key?: string }> {
  init() {
    this.configureFactoryCall();
    this.params = { private_key: this.payload.private_key };
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<typeof this.params, Success>(
      'WriteSEPrivateKey',
      'Success',
      this.params
    );
    return response.message;
  }
}

export class DeviceWriteSEPublicCert extends ProtocolV1FactoryMethod<{ public_cert?: string }> {
  init() {
    this.configureFactoryCall();
    this.params = { public_cert: this.payload.public_cert };
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<typeof this.params, Success>(
      'WriteSEPublicCert',
      'Success',
      this.params
    );
    return response.message;
  }
}

export class DeviceSESignMessage extends ProtocolV1FactoryMethod<{ message?: string }> {
  init() {
    this.configureFactoryCall();
    this.params = { message: this.payload.message };
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<
      typeof this.params,
      { signature?: string }
    >('SESignMessage', 'SEMessageSignature', this.params);
    return response.message;
  }
}
