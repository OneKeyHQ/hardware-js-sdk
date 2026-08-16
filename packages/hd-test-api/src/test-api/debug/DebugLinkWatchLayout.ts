import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { DebugLinkWatchLayout as HardwareDebugLinkWatchLayout } from '@onekeyfe/hd-transport';

export default class DebugLinkWatchLayout extends BaseMethod<HardwareDebugLinkWatchLayout> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      watch: this.payload.watch,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkWatchLayout',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
