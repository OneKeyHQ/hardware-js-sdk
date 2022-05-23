export const UI_REQUEST = {
  BOOTLOADER: 'ui-device_bootloader_mode',
  NOT_IN_BOOTLOADER: 'ui-device_not_in_bootloader_mode',
  REQUIRE_MODE: 'ui-device_require_mode',
  INITIALIZE: 'ui-device_not_initialized',
  SEEDLESS: 'ui-device_seedless',
  FIRMWARE_OLD: 'ui-device_firmware_old',
  FIRMWARE_NOT_SUPPORTED: 'ui-device_firmware_unsupported',
  FIRMWARE_NOT_COMPATIBLE: 'ui-device_firmware_not_compatible',
  FIRMWARE_NOT_INSTALLED: 'ui-device_firmware_not_installed',
  NOT_USE_ONEKEY_DEVICE: 'ui-device_please_use_onekey_device',
} as const;
