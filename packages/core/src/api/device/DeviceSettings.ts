import { HardwareErrorCode, TypedError } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';
import { validateParams } from '../helpers/paramsValidator';
import {
  mapApplySettingsToState,
  mapCommonSettingsToProtocolV2,
  mapDeviceSettingsToState,
} from '../../device/DeviceStateMapper';
import { getProtocolV2SettingsUnlockPolicy } from '../../protocols/protocol-v2/settingsUnlockPolicy';
import { LANGUAGE_LABELS } from '../../utils/deviceSettings';

import type { ApplySettings } from '@onekeyfe/hd-transport';

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
      { name: 'safetyChecks', type: 'number' },
      { name: 'experimentalFeatures', type: 'boolean' },
      { name: 'autoShutdownDelayMs', type: 'number' },
      { name: 'changeBrightness', type: 'boolean' },
      { name: 'brightness', type: 'number' },
      { name: 'hapticFeedback', type: 'boolean' },
      { name: 'bluetoothEnabled', type: 'boolean' },
      { name: 'animationEnabled', type: 'boolean' },
      { name: 'tapToWake', type: 'boolean' },
      { name: 'deviceNameDisplayEnabled', type: 'boolean' },
      { name: 'fidoEnabled', type: 'boolean' },
      { name: 'usbLockEnabled', type: 'boolean' },
      { name: 'randomKeypad', type: 'boolean' },
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
      auto_shutdown_delay_ms: this.payload.autoShutdownDelayMs,
      ...(this.payload.changeBrightness
        ? { change_brightness: this.payload.changeBrightness }
        : undefined),
      haptic_feedback: this.payload.hapticFeedback,
    };
    this.unlockPolicy = getProtocolV2SettingsUnlockPolicy(
      mapCommonSettingsToProtocolV2(this.payload)
    );
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
    try {
      if (this.device.isProtocolV2()) {
        const settings = mapCommonSettingsToProtocolV2(this.payload);
        if (Object.keys(settings).length === 0) {
          throw invalidParameter('No Protocol V2 compatible setting provided.');
        }

        const res = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', {
          settings,
        });
        this.device.updateState(mapDeviceSettingsToState(settings), 'apply-settings');
        return res.message;
      }

      const res = await this.device.commands.typedCall('ApplySettings', 'Success', {
        ...this.params,
      });
      this.device.updateState(mapApplySettingsToState(this.params), 'apply-settings');
      return res.message;
    } catch (error) {
      if (error.message?.toLowerCase().includes('no setting provided')) {
        return Promise.reject(
          TypedError(HardwareErrorCode.DeviceSettingsNotProvided, error.message)
        );
      }
      if (error.message?.includes('all support ISO_639-1 language keys include')) {
        const supportedLanguages: string[] = error.message
          ?.replace('all support ISO_639-1 language keys include', '')
          ?.trim()
          ?.split(' ');

        const errorMessage = supportedLanguages.reduce((acc, language) => {
          const label = LANGUAGE_LABELS?.[language as keyof typeof LANGUAGE_LABELS];
          if (label) {
            acc.push(label);
          }
          return acc;
        }, [] as string[]);

        return Promise.reject(
          TypedError(HardwareErrorCode.DeviceSettingsLanguageNotSupport, error.message, {
            languages: errorMessage.join(', '),
          })
        );
      }
      throw error;
    }
  }
}
