import { ApplySettings } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

export default class DeviceSettings extends BaseMethod<ApplySettings> {
  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [
      { name: 'language', type: 'string' },
      { name: 'label', type: 'string' },
      { name: 'usePassphrase', type: 'boolean' },
      { name: 'homescreen', type: 'string' },
      { name: 'passphraseSource', type: 'number' },
      { name: 'autoLockDelayMs', type: 'number' },
      { name: 'displayRotation', type: 'number' },
      { name: 'passphraseAlwaysOnDevice', type: 'boolean' },
      { name: 'safetyChecks', type: 'object' },
      { name: 'experimentalFeatures', type: 'boolean' },
    ]);

    // init params
    this.params = {
      language: this.payload.language,
      label: this.payload.label,
      use_passphrase: this.payload.usePassphrase,
      homescreen: this.payload.homescreen,
      _passphrase_source: this.payload.passphraseSource,
      auto_lock_delay_ms: this.payload.autoLockDelayMs,
      display_rotation: this.payload.displayRotation,
      passphrase_always_on_device: this.payload.passphraseAlwaysOnDevice,
      safety_checks: this.payload.safetyChecks,
      experimental_features: this.payload.experimentalFeatures,
    };
  }

  getVersionRange() {
    if (this.payload.usePassphrase) {
      return {
        model_mini: {
          min: '2.4.0',
        },
      };
    }
    return {};
  }

  async run() {
    const res = await this.device.commands.typedCall('ApplySettings', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
