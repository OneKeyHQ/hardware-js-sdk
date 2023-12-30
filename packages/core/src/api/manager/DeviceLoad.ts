import { LoadDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceLoad extends BaseMethod<LoadDevice> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      mnemonics: this.payload.mnemonics.split(' '),
      pin: this.payload.pin,
      passphrase_protection: this.payload.passphrase_protection,
      language: this.payload.language,
      label: this.payload.label,
      skip_checksum: this.payload.skip_checksum,
      u2f_counter: this.payload.u2f_counter,
      needs_backup: this.payload.needs_backup,
      no_backup: this.payload.no_backup,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('LoadDevice', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
