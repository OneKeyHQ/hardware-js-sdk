import {
  mapCommonSettingsToProtocolV2,
  normalizeApplySettingsToFeaturesPatch,
  normalizeDeviceSettingsToFeaturesPatch,
} from '../src/device/DeviceSettingsState';

describe('DeviceSettingsState', () => {
  it('normalizes Protocol V1 ApplySettings into common feature fields', () => {
    expect(
      normalizeApplySettingsToFeaturesPatch({
        label: 'Pro Label',
        language: 'ja-JP',
        auto_lock_delay_ms: 60_000,
        auto_shutdown_delay_ms: 300_000,
        haptic_feedback: true,
        experimental_features: false,
      })
    ).toEqual({
      label: 'Pro Label',
      language: 'ja-JP',
      autoLockDelayMs: 60_000,
      autoShutdownDelayMs: 300_000,
      hapticFeedback: true,
      experimentalFeatures: false,
    });
  });

  it('normalizes Protocol V2 DeviceSettings into common feature fields', () => {
    expect(
      normalizeDeviceSettingsToFeaturesPatch({
        label: 'Pro2 Label',
        bt_enable: true,
        language: 'en-US',
        wallpaper_path: 'vol1:/wallpaper.bin',
        brightness: 70,
        autolock_delay_ms: 90_000,
        autoshutdown_delay_ms: 600_000,
        animation_enable: false,
        tap_to_wake: true,
        haptic_feedback: true,
        device_name_display_enabled: true,
        airgap_mode: false,
        fido_enabled: true,
        experimental_features: false,
        usb_lock_enable: true,
        random_keypad: true,
      })
    ).toEqual({
      label: 'Pro2 Label',
      bleEnabled: true,
      language: 'en-US',
      wallpaperPath: 'vol1:/wallpaper.bin',
      brightness: 70,
      autoLockDelayMs: 90_000,
      autoShutdownDelayMs: 600_000,
      animationEnabled: false,
      tapToWake: true,
      hapticFeedback: true,
      deviceNameDisplayEnabled: true,
      airgapMode: false,
      fidoEnabled: true,
      experimentalFeatures: false,
      usbLockEnabled: true,
      randomKeypad: true,
    });
  });

  it('maps common high-level settings to Protocol V2 without undefined fields', () => {
    expect(
      mapCommonSettingsToProtocolV2({
        label: 'Shared Label',
        language: 'zh-CN',
        autoLockDelayMs: 30_000,
        autoShutdownDelayMs: 180_000,
        hapticFeedback: false,
        experimentalFeatures: true,
        brightness: 55,
        bluetoothEnabled: true,
        animationEnabled: false,
        tapToWake: true,
        deviceNameDisplayEnabled: true,
        fidoEnabled: true,
        usbLockEnabled: false,
        randomKeypad: true,
      })
    ).toEqual({
      label: 'Shared Label',
      language: 'zh-CN',
      autolock_delay_ms: 30_000,
      autoshutdown_delay_ms: 180_000,
      haptic_feedback: false,
      experimental_features: true,
      brightness: 55,
      bt_enable: true,
      animation_enable: false,
      tap_to_wake: true,
      device_name_display_enabled: true,
      fido_enabled: true,
      usb_lock_enable: false,
      random_keypad: true,
    });
  });
});
