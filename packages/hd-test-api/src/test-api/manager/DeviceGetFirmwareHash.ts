import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { GetFirmwareHash } from '@onekeyfe/hd-transport';

export default class DeviceGetFirmwareHash extends BaseMethod<GetFirmwareHash> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      challenge: this.payload.challenge,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'GetFirmwareHash',
      'FirmwareHash',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
