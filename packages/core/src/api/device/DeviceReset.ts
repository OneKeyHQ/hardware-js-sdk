import { ResetDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class DeviceReset extends BaseMethod<ResetDevice> {
  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [
      { name: 'displayRandom', type: 'boolean' },
      { name: 'strength', type: 'number' },
      { name: 'passphraseProtection', type: 'boolean' },
      { name: 'pinProtection', type: 'boolean' },
      { name: 'language', type: 'string' },
      { name: 'label', type: 'string' },
      { name: 'u2fCounter', type: 'number' },
      { name: 'skipBackup', type: 'boolean' },
      { name: 'noBackup', type: 'boolean' },
      { name: 'backupType' },
    ]);

    // init params
    this.params = {
      display_random: this.payload.displayRandom,
      strength: this.payload.strength || 256,
      passphrase_protection: this.payload.passphraseProtection,
      pin_protection: this.payload.pinProtection,
      language: this.payload.language,
      label: this.payload.label,
      u2f_counter: this.payload.u2fCounter || Math.floor(Date.now() / 1000),
      skip_backup: this.payload.skipBackup,
      no_backup: this.payload.noBackup,
      backup_type: this.payload.backupType,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('ResetDevice', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
