import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  // === 基础操作 ===
  {
    method: 'searchDevices',
    description: 'methodDescriptions.searchDevices',
    noConnIdReq: true,
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getFeatures',
    description: 'methodDescriptions.getFeatures',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getOnekeyFeatures',
    description: 'methodDescriptions.getOnekeyFeatures',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getPassphraseState',
    description: 'methodDescriptions.getPassphraseState',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceGetOnboardingStatus',
    description: 'methodDescriptions.deviceGetOnboardingStatus',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceSessionOpen',
    description: 'methodDescriptions.deviceSessionOpen',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Open hidden wallet on device',
        description: 'Ask the device to open a hidden wallet with passphrase input on device.',
        parameters: [
          {
            name: 'select',
            type: 'textarea',
            required: true,
            label: 'Wallet selection',
            value: { passphrase_on_device: {} },
          },
        ],
      },
      {
        title: 'Resume wallet session',
        description: 'Resume a previously opened wallet session by session ID.',
        parameters: [
          {
            name: 'resume',
            type: 'textarea',
            required: true,
            label: 'Session resume request',
            value: { session_id: '' },
          },
        ],
      },
    ],
  },
  {
    method: 'protocolInfoRequest',
    description: 'methodDescriptions.protocolInfoRequest',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'ping',
    description: 'methodDescriptions.ping',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 ping',
        parameters: [
          {
            name: 'message',
            type: 'string',
            required: false,
            label: 'Message',
            description: 'Message echoed in the Success response',
            value: 'Hello from WebUSB!',
          },
        ],
      },
    ],
  },
  {
    method: 'getDeviceState',
    description: 'methodDescriptions.getDeviceState',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Cached state',
        parameters: [],
      },
      {
        title: 'Refresh versions and verification',
        parameters: [
          {
            name: 'refresh',
            type: 'textarea',
            required: false,
            label: 'Sections',
            value: ['identity', 'versions', 'verification'],
          },
        ],
      },
    ],
  },
  {
    method: 'deviceReboot',
    description: 'methodDescriptions.deviceReboot',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Normal reboot',
        parameters: [
          {
            name: 'rebootType',
            type: 'select',
            required: true,
            label: 'Reboot Type',
            options: [
              { label: 'Normal', value: '0' },
              { label: 'Romloader', value: '1' },
              { label: 'Bootloader', value: '2' },
            ],
            value: '0',
          },
        ],
      },
      {
        title: 'Reboot to romloader',
        parameters: [
          {
            name: 'rebootType',
            type: 'select',
            required: true,
            label: 'Reboot Type',
            options: [
              { label: 'Normal', value: '0' },
              { label: 'Romloader', value: '1' },
              { label: 'Bootloader', value: '2' },
            ],
            value: '1',
          },
        ],
      },
      {
        title: 'Reboot to bootloader',
        parameters: [
          {
            name: 'rebootType',
            type: 'select',
            required: true,
            label: 'Reboot Type',
            options: [
              { label: 'Normal', value: '0' },
              { label: 'Romloader', value: '1' },
              { label: 'Bootloader', value: '2' },
            ],
            value: '2',
          },
        ],
      },
    ],
  },
  {
    method: 'deviceFactoryInfoGet',
    description: 'methodDescriptions.deviceFactoryInfoGet',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceFactoryInfoSet',
    description: 'methodDescriptions.deviceFactoryInfoSet',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Set factory device info',
        parameters: [
          {
            name: 'version',
            type: 'number',
            required: false,
            label: 'Factory Info Version',
            value: 1,
          },
          {
            name: 'serial_number',
            type: 'string',
            required: false,
            label: 'Serial Number',
            value: '',
          },
          {
            name: 'burn_in_completed',
            type: 'boolean',
            required: false,
            label: 'Burn-in Completed',
            value: false,
          },
          {
            name: 'factory_test_completed',
            type: 'boolean',
            required: false,
            label: 'Factory Test Completed',
            value: false,
          },
        ],
      },
    ],
  },
  {
    method: 'deviceSettingsSet',
    description: 'Set Protocol V2 device settings',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Display and interaction',
        parameters: [
          { name: 'settings.brightness', type: 'number', label: 'Brightness (10-100)', value: 80 },
          { name: 'settings.animation_enable', type: 'boolean', label: 'Animations', value: true },
          { name: 'settings.tap_to_wake', type: 'boolean', label: 'Tap to wake', value: true },
          {
            name: 'settings.haptic_feedback',
            type: 'boolean',
            label: 'Haptic feedback',
            value: true,
          },
        ],
      },
      {
        title: 'Language and label',
        parameters: [
          { name: 'settings.label', type: 'string', label: 'Device label', value: 'My OneKey' },
          {
            name: 'settings.language',
            type: 'select',
            label: 'Language',
            options: [
              { label: 'English', value: 'en-Latn-US' },
              { label: '简体中文', value: 'zh-Hans-CN' },
              { label: '繁體中文（香港）', value: 'zh-Hant-HK' },
              { label: '繁體中文（台灣）', value: 'zh-Hant-TW' },
              { label: '日本語', value: 'ja-Jpan-JP' },
              { label: '한국어', value: 'ko-Kore-KR' },
              { label: 'Français', value: 'fr-Latn-FR' },
              { label: 'Deutsch', value: 'de-Latn-DE' },
              { label: 'Русский', value: 'ru-Cyrl-RU' },
              { label: 'Español', value: 'es-Latn-ES' },
              { label: 'Italiano', value: 'it-Latn-IT' },
              { label: 'Portuguese (Brazil)', value: 'pt-Latn-BR' },
              { label: 'Tiếng Việt', value: 'vi-Latn-VN' },
              { label: 'Türkçe', value: 'tr-Latn-TR' },
              { label: 'Bahasa Indonesia', value: 'id-Latn-ID' },
              { label: 'Filipino', value: 'fil-Latn-PH' },
              { label: 'Українська', value: 'uk-Cyrl-UA' },
            ],
            value: 'en-Latn-US',
          },
          {
            name: 'settings.device_name_display_enabled',
            type: 'boolean',
            label: 'Show device name',
            value: true,
          },
        ],
      },
      {
        title: 'Timeouts',
        parameters: [
          {
            name: 'settings.autolock_delay_ms',
            type: 'number',
            label: 'Auto-lock delay (ms)',
            value: 60000,
          },
          {
            name: 'settings.autoshutdown_delay_ms',
            type: 'number',
            label: 'Auto-shutdown delay (ms)',
            value: 300000,
          },
        ],
      },
      {
        title: 'Security',
        parameters: [
          { name: 'settings.fido_enabled', type: 'boolean', label: 'FIDO enabled', value: true },
          { name: 'settings.usb_lock_enable', type: 'boolean', label: 'USB lock', value: false },
          { name: 'settings.random_keypad', type: 'boolean', label: 'Random keypad', value: true },
        ],
      },
    ],
  },
  {
    method: 'deviceSettingsPageShow',
    description: 'Open a Protocol V2 settings page on device',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Reset device',
        parameters: [
          {
            name: 'page',
            type: 'select',
            required: true,
            label: 'Settings page',
            options: [
              { label: 'Reset device', value: 'DeviceReset' },
              { label: 'Change PIN', value: 'DevicePinChange' },
              { label: 'Passphrase', value: 'DevicePassphrase' },
              { label: 'Air-gap mode', value: 'DeviceAirgap' },
            ],
            value: 'DeviceReset',
          },
        ],
      },
      {
        title: 'Change PIN',
        parameters: [
          {
            name: 'page',
            type: 'string',
            required: true,
            label: 'Settings page',
            value: 'DevicePinChange',
          },
        ],
      },
      {
        title: 'Air-gap mode',
        parameters: [
          {
            name: 'page',
            type: 'string',
            required: true,
            label: 'Settings page',
            value: 'DeviceAirgap',
          },
          { name: 'fieldName', type: 'string', label: 'Field name', value: 'airgap_mode' },
        ],
      },
      {
        title: 'Passphrase',
        parameters: [
          {
            name: 'page',
            type: 'string',
            required: true,
            label: 'Settings page',
            value: 'DevicePassphrase',
          },
        ],
      },
    ],
  },
  {
    method: 'deviceUploadWallpaper',
    description: 'Convert RGBA pixels, upload the file, and activate the Pro2 lock wallpaper',
    noDeviceIdReq: true,
    presets: [],
  },

  // === 设备管理 ===
  {
    method: 'deviceSettings',
    description: 'methodDescriptions.deviceSettings',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Set Label',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            label: 'Device Label',
            description: 'Custom label for the device',
            value: 'My OneKey',
          },
        ],
      },
      {
        title: 'Enable Passphrase',
        parameters: [
          {
            name: 'usePassphrase',
            type: 'boolean',
            required: true,
            label: 'Use Passphrase',
            description: 'Enable passphrase protection',
            value: true,
          },
        ],
      },
      {
        title: 'Disable Passphrase',
        parameters: [
          {
            name: 'usePassphrase',
            type: 'boolean',
            required: true,
            label: 'Use Passphrase',
            description: 'Disable passphrase protection',
            value: false,
          },
        ],
      },
      {
        title: 'Set PassphraseAlwaysOnDevice',
        parameters: [
          {
            name: 'passphraseAlwaysOnDevice',
            type: 'boolean',
            required: true,
            label: 'Passphrase Always On Device',
            description: 'Always enter passphrase on device',
            value: true,
          },
        ],
      },
      {
        title: 'Set English language',
        parameters: [
          {
            name: 'language',
            type: 'string',
            required: true,
            label: 'Language',
            description: 'Device display language',
            value: 'en_UK',
          },
        ],
      },
      {
        title: 'Set Chinese language',
        parameters: [
          {
            name: 'language',
            type: 'string',
            required: true,
            label: 'Language',
            description: 'Device display language',
            value: 'zh_CN',
          },
        ],
      },
      {
        title: 'Set safetyChecks',
        parameters: [
          {
            name: 'safetyChecks',
            type: 'number',
            required: true,
            label: 'Safety Checks',
            description: 'Safety check level (0=disabled, 1=prompt, 2=strict)',
            value: 0,
          },
        ],
      },
    ],
  },
  {
    method: 'deviceChangePin',
    description: 'methodDescriptions.deviceChangePin',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceLock',
    description: 'methodDescriptions.deviceLock',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceUnlock',
    description: 'methodDescriptions.deviceUnlock',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceCancel',
    description: 'methodDescriptions.deviceCancel',
    noDeviceIdReq: true,
    presets: [],
  },

  // === 高级功能 ===
  {
    method: 'deviceSupportFeatures',
    description: 'methodDescriptions.deviceSupportFeatures',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceVerify',
    description: 'methodDescriptions.deviceVerify',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Verify device',
        parameters: [
          {
            name: 'dataHex',
            type: 'string',
            required: true,
            label: 'Data Hex',
            description: 'Hex data for verification',
            value: '0x1234567890',
          },
        ],
      },
    ],
  },
  {
    method: 'getLogs',
    description: 'methodDescriptions.getLogs',
    noDeviceIdReq: true,
    presets: [],
  },

  // === U2F 功能 ===
  {
    method: 'setU2FCounter',
    description: 'methodDescriptions.setU2FCounter',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Set U2F counter',
        parameters: [
          {
            name: 'u2f_counter',
            type: 'number',
            required: true,
            label: 'U2F Counter',
            description: 'U2F counter value to set',
            value: 1,
          },
        ],
      },
    ],
  },
  {
    method: 'getNextU2FCounter',
    description: 'methodDescriptions.getNextU2FCounter',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceWipe',
    description: 'methodDescriptions.deviceWipe',
    noDeviceIdReq: true,
    presets: [],
  },
];

// 导出链配置对象
export const device: {
  api: UnifiedMethodConfig[];
  id: DeviceMethodCategory;
} = {
  id: 'device',
  api,
};
