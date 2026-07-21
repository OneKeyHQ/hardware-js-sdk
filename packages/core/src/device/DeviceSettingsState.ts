import type { DeviceSettingsParams } from '../types/api/deviceSettings';
import type { Features } from '../types';
import type { ApplySettings, DeviceSettings } from '@onekeyfe/hd-transport';

function definedEntries<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;
}

export function normalizeApplySettingsToFeaturesPatch(
  settings: ApplySettings
): Partial<Features> {
  return definedEntries({
    label: settings.label,
    language: settings.language,
    passphraseProtection: settings.use_passphrase,
    autoLockDelayMs: settings.auto_lock_delay_ms,
    autoShutdownDelayMs: settings.auto_shutdown_delay_ms,
    displayRotation: settings.display_rotation,
    passphraseAlwaysOnDevice: settings.passphrase_always_on_device,
    safetyChecks: settings.safety_checks,
    experimentalFeatures: settings.experimental_features,
    hapticFeedback: settings.haptic_feedback,
  });
}

export function normalizeDeviceSettingsToFeaturesPatch(
  settings: DeviceSettings
): Partial<Features> {
  return definedEntries({
    label: settings.label,
    bleEnabled: settings.bt_enable,
    language: settings.language,
    wallpaperPath: settings.wallpaper_path,
    passphraseProtection: settings.passphrase_enable,
    brightness: settings.brightness,
    autoLockDelayMs: settings.autolock_delay_ms,
    autoShutdownDelayMs: settings.autoshutdown_delay_ms,
    animationEnabled: settings.animation_enable,
    tapToWake: settings.tap_to_wake,
    hapticFeedback: settings.haptic_feedback,
    deviceNameDisplayEnabled: settings.device_name_display_enabled,
    airgapMode: settings.airgap_mode,
    fidoEnabled: settings.fido_enabled,
    experimentalFeatures: settings.experimental_features,
    usbLockEnabled: settings.usb_lock_enable,
    randomKeypad: settings.random_keypad,
  });
}

export function mapCommonSettingsToProtocolV2(
  settings: DeviceSettingsParams
): DeviceSettings {
  return definedEntries({
    label: settings.label,
    bt_enable: settings.bluetoothEnabled,
    language: settings.language,
    brightness: settings.brightness,
    autolock_delay_ms: settings.autoLockDelayMs,
    autoshutdown_delay_ms: settings.autoShutdownDelayMs,
    animation_enable: settings.animationEnabled,
    tap_to_wake: settings.tapToWake,
    haptic_feedback: settings.hapticFeedback,
    device_name_display_enabled: settings.deviceNameDisplayEnabled,
    fido_enabled: settings.fidoEnabled,
    experimental_features: settings.experimentalFeatures,
    usb_lock_enable: settings.usbLockEnabled,
    random_keypad: settings.randomKeypad,
  });
}
