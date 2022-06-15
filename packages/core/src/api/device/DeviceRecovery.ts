import { RecoveryDevice } from '@onekeyfe/hd-transport/src/types/messages';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class DeviceRecovery extends BaseMethod<RecoveryDevice> {
  init() {
    // check payload
    validateParams(this.payload, [
      { name: 'wordCount', type: 'number' },
      { name: 'passphraseProtection', type: 'boolean' },
      { name: 'pinProtection', type: 'boolean' },
      { name: 'language', type: 'string' },
      { name: 'label', type: 'string' },
      { name: 'enforceWordlist', type: 'boolean' },
      { name: 'type', type: 'object' },
      { name: 'u2fCounter', type: 'number' },
      { name: 'dryRun', type: 'boolean' },
    ]);

    // init params
    this.params = {
      word_count: this.payload.wordCount,
      passphrase_protection: this.payload.passphraseProtection,
      pin_protection: this.payload.pinProtection,
      language: this.payload.language,
      label: this.payload.label,
      enforce_wordlist: this.payload.enforceWordlist,
      type: this.payload.type,
      u2f_counter: this.payload.u2fCounter || Math.floor(Date.now() / 1000),
      dry_run: this.payload.dryRun,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('RecoveryDevice', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
