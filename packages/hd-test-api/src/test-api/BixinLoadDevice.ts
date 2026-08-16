import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { BixinLoadDevice as HardwareBixinLoadDevice } from '@onekeyfe/hd-transport';

export default class BixinLoadDevice extends BaseMethod<HardwareBixinLoadDevice> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      mnemonics: this.payload.mnemonics,
      language: this.payload.language,
      label: this.payload.label,
      skip_checksum: this.payload.skip_checksum,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('BixinLoadDevice', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
