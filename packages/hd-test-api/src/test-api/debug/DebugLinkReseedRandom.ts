import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { DebugLinkReseedRandom as HardwareDebugLinkReseedRandom } from '@onekeyfe/hd-transport';

export default class DebugLinkReseedRandom extends BaseMethod<HardwareDebugLinkReseedRandom> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      value: this.payload.value,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkReseedRandom',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
