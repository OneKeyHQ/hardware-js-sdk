import { HardwareErrorCode, TypedError } from '@onekeyfe/hd-shared';
import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';
import { validateParams } from '../helpers/paramsValidator';
import {
  mapApplySettingsToState,
  mapCommonSettingsToProtocolV2,
  mapDeviceSettingsToState,
} from '../../device/DeviceStateMapper';
import { getProtocolV2SettingsBehavior } from '../../protocols/protocol-v2/settingsUnlockPolicy';
import {
  DEVICE_SETTINGS_V1_ONLY_FIELDS,
  DEVICE_SETTINGS_V2_ONLY_FIELDS,
  LANGUAGE_LABELS,
  getDeviceSettingsCapabilities,
} from '../../utils/deviceSettings';

import type { ApplySettings } from '@onekeyfe/hd-transport';
import type { DeviceSettingsParams } from '../../types/api/deviceSettings';

const assertSettingsSupported = (
  payload: DeviceSettingsParams,
  unsupported: readonly (keyof DeviceSettingsParams)[],
  protocol: 'Protocol V1' | 'Protocol V2'
) => {
  const provided = unsupported.filter(key => payload[key] !== undefined);
  if (provided.length > 0) {
    throw invalidParameter(`${protocol} does not support settings: ${provided.join(', ')}.`);
  }
};

const assertProtocolV2SettingValues = (
  payload: DeviceSettingsParams,
  capabilities: ReturnType<typeof getDeviceSettingsCapabilities>
) => {
  const brightnessRange = capabilities.ranges.brightness;
  if (
    payload.brightness !== undefined &&
    brightnessRange &&
    (payload.brightness < brightnessRange.min || payload.brightness > brightnessRange.max)
  ) {
    throw invalidParameter(
      `Protocol V2 brightness must be between ${brightnessRange.min} and ${brightnessRange.max}.`
    );
  }

  const delayFields = [
    ['autoLockDelayMs', capabilities.autoLockDelayOptions],
    ['autoShutdownDelayMs', capabilities.autoShutdownDelayOptions],
  ] as const;
  delayFields.forEach(([field, options]) => {
    const value = payload[field];
    if (value !== undefined && !options.some(option => option.valueMs === value)) {
      throw invalidParameter(
        `Protocol V2 ${field} must be one of: ${options.map(option => option.valueMs).join(', ')}.`
      );
    }
  });
};

const settingsPageForPayload = (
  payload: DeviceSettingsParams
): DeviceSettingsPage.DevicePassphrase | DeviceSettingsPage.DeviceAirgap | undefined => {
  if (payload.usePassphrase !== undefined) {
    return DeviceSettingsPage.DevicePassphrase;
  }
  if (payload.airgapMode !== undefined) {
    return DeviceSettingsPage.DeviceAirgap;
  }
  return undefined;
};

export default class DeviceSettings extends BaseMethod<ApplySettings> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

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
      { name: 'airgapMode', type: 'boolean' },
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
      use_ble: this.payload.bluetoothEnabled,
      ...(this.payload.changeBrightness
        ? { change_brightness: this.payload.changeBrightness }
        : undefined),
      haptic_feedback: this.payload.hapticFeedback,
    };
    const page = settingsPageForPayload(this.payload);
    const directSettings = mapCommonSettingsToProtocolV2(this.payload);
    const hasConflictingPages =
      this.payload.usePassphrase !== undefined && this.payload.airgapMode !== undefined;
    const combinesPageWithDirectSettings =
      page !== undefined && Object.keys(directSettings).length > 0;
    if (hasConflictingPages || combinesPageWithDirectSettings) {
      // V1 may still accept passphrase plus direct settings. Suppress only the
      // Protocol V2 pre-run interaction; run() returns the protocol-specific error.
      this.unlockPolicy = 'none';
      this.protocolV2UiInteraction = undefined;
      return;
    }
    const behavior =
      page === undefined
        ? getProtocolV2SettingsBehavior({
            kind: 'direct',
            settings: directSettings,
          })
        : getProtocolV2SettingsBehavior({ kind: 'page', page });
    this.unlockPolicy = behavior.unlockPolicy;
    this.protocolV2UiInteraction = behavior.uiInteraction;
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
        assertSettingsSupported(this.payload, DEVICE_SETTINGS_V1_ONLY_FIELDS, 'Protocol V2');
        const capabilities = getDeviceSettingsCapabilities(
          this.device.getCurrentDeviceType(),
          'V2'
        );
        assertProtocolV2SettingValues(this.payload, capabilities);
        const settings = mapCommonSettingsToProtocolV2(this.payload);
        const requestedPassphrase = this.payload.usePassphrase;
        const requestedAirgap = this.payload.airgapMode;
        const hasPassphrasePage = requestedPassphrase !== undefined;
        const hasAirgapPage = requestedAirgap !== undefined;

        if (hasPassphrasePage && hasAirgapPage) {
          throw invalidParameter(
            'Protocol V2 passphrase and air-gap settings must be changed in separate calls.'
          );
        }
        if ((hasPassphrasePage || hasAirgapPage) && Object.keys(settings).length > 0) {
          throw invalidParameter(
            'Protocol V2 on-device settings must not be combined with direct settings.'
          );
        }
        if (requestedPassphrase !== undefined) {
          const current = await this.device.getDeviceState({ refreshSections: ['status'] });
          if (current.status.passphraseProtection === requestedPassphrase) {
            return { message: 'Settings already match requested value.' };
          }

          const res = await this.device.commands.typedCall('DeviceSettingsPageShow', 'Success', {
            page: DeviceSettingsPage.DevicePassphrase,
          });
          const updated = await this.device.getDeviceState({ refreshSections: ['status'] });
          if (updated.status.passphraseProtection !== requestedPassphrase) {
            throw TypedError(
              HardwareErrorCode.RuntimeError,
              'Protocol V2 passphrase setting did not reach the requested value.'
            );
          }
          return res.message;
        }
        if (requestedAirgap !== undefined) {
          const current = await this.device.getDeviceState({ refreshSections: ['settings'] });
          if (current.settings.airgapMode === requestedAirgap) {
            return { message: 'Settings already match requested value.' };
          }

          const res = await this.device.commands.typedCall('DeviceSettingsPageShow', 'Success', {
            page: DeviceSettingsPage.DeviceAirgap,
          });
          const updated = await this.device.getDeviceState({ refreshSections: ['settings'] });
          if (updated.settings.airgapMode !== requestedAirgap) {
            throw TypedError(
              HardwareErrorCode.RuntimeError,
              'Protocol V2 air-gap setting did not reach the requested value.'
            );
          }
          return res.message;
        }
        if (Object.keys(settings).length === 0) {
          throw invalidParameter('No Protocol V2 compatible setting provided.');
        }

        const res = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', {
          settings,
        });
        this.device.updateState(mapDeviceSettingsToState(settings), 'settings-write');
        return res.message;
      }

      assertSettingsSupported(this.payload, DEVICE_SETTINGS_V2_ONLY_FIELDS, 'Protocol V1');
      const capabilities = getDeviceSettingsCapabilities(this.device.getCurrentDeviceType(), 'V1');
      if (
        this.payload.safetyChecks !== undefined &&
        !capabilities.safetyCheckOptions.some(option => option.value === this.payload.safetyChecks)
      ) {
        throw invalidParameter(
          `Protocol V1 safetyChecks must be one of: ${capabilities.safetyCheckOptions
            .map(option => option.value)
            .join(', ')}.`
        );
      }

      const res = await this.device.commands.typedCall('ApplySettings', 'Success', {
        ...this.params,
      });
      this.device.updateState(mapApplySettingsToState(this.params), 'settings-write');
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
