import { BaseMethod } from '../BaseMethod';

import type { DebugLinkMemoryRead as HardwareDebugLinkMemoryRead } from '@onekeyfe/hd-transport';

export default class DebugLinkMemoryRead extends BaseMethod<HardwareDebugLinkMemoryRead> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      address: this.payload.address,
      length: this.payload.length,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkMemoryRead',
      'DebugLinkMemory',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
