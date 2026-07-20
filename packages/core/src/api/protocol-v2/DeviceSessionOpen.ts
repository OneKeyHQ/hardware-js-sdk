import type { DeviceSessionOpen as DeviceSessionOpenParams } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';

export type { DeviceSessionOpenParams };

export default class DeviceSessionOpen extends BaseMethod<DeviceSessionOpenParams> {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      resume: this.payload.resume,
      select: this.payload.select,
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'DeviceSessionOpen',
      'DeviceSession',
      this.params
    );
    return message;
  }
}
