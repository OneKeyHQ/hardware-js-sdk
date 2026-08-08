import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';
import { getDeviceSettingsCapabilities } from '@onekeyfe/hd-core';
import { EDeviceType } from '@onekeyfe/hd-shared';

const PRO_SETTINGS_CAPABILITIES = getDeviceSettingsCapabilities(EDeviceType.Pro, 'V1');
const PRO2_SETTINGS_CAPABILITIES = getDeviceSettingsCapabilities(EDeviceType.Pro2, 'V2');
const toSelectOptions = (options: ReadonlyArray<{ label: string; valueMs: number }>) =>
  options.map(option => ({ label: option.label, value: option.valueMs }));

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
    method: 'promptWebDeviceAccess',
    description: 'Request browser permission for a WebUSB device',
    noConnIdReq: true,
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Request any OneKey device',
        parameters: [],
      },
      {
        title: 'Request device by serial number',
        parameters: [
          {
            name: 'deviceSerialNumberFromUI',
            type: 'string',
            required: false,
            label: 'Device Serial Number',
            value: '',
          },
        ],
      },
    ],
  },
  {
    method: 'getFeatures',
    description: 'methodDescriptions.getFeatures',
    noDeviceIdReq: true,
    deprecated: true,
    tags: ['Legacy', 'Protocol V1'],
    presets: [],
  },
  {
    method: 'detectDeviceConnectProtocol',
    description: 'methodDescriptions.detectDeviceConnectProtocol',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getDeviceState',
    description: 'methodDescriptions.getDeviceState',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Runtime state',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: true,
            label: 'Refresh Scope',
            options: ['runtime', 'settings', 'firmware'],
            value: 'runtime',
          },
        ],
      },
      {
        title: 'Firmware state',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: true,
            label: 'Refresh Scope',
            options: ['runtime', 'settings', 'firmware'],
            value: 'firmware',
          },
        ],
      },
    ],
  },
  {
    method: 'getOnekeyFeatures',
    description: 'methodDescriptions.getOnekeyFeatures',
    noDeviceIdReq: true,
    deprecated: true,
    tags: ['Legacy', 'Protocol V1'],
    presets: [],
  },
  {
    method: 'getPassphraseState',
    description:
      'Read the current wallet state through the Legacy Protocol V1 compatibility API. New flows should use openWalletSession.',
    noDeviceIdReq: true,
    tags: ['Legacy', 'Protocol V1'],
    presets: [{ title: 'Get current wallet state (Legacy V1)', parameters: [] }],
  },
  {
    method: 'openWalletSession',
    description: 'methodDescriptions.openWalletSession',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Open standard wallet',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Mode',
            options: ['standard', 'select-hidden', 'resume-hidden'],
            value: 'standard',
          },
        ],
      },
      {
        title: 'Select hidden wallet',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Mode',
            options: ['standard', 'select-hidden', 'resume-hidden'],
            value: 'select-hidden',
          },
        ],
      },
      {
        title: 'Resume hidden wallet',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Mode',
            options: ['standard', 'select-hidden', 'resume-hidden'],
            value: 'resume-hidden',
          },
          {
            name: 'deviceId',
            type: 'string',
            required: true,
            label: 'Wallet Device ID',
          },
          {
            name: 'passphraseState',
            type: 'string',
            required: true,
            label: 'Passphrase State',
          },
        ],
      },
    ],
  },
  {
    method: 'clearSessionCache',
    description: 'Clear the SDK-managed wallet session cache without sending a device command',
    noConnIdReq: true,
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Clear all cached sessions',
        parameters: [],
      },
      {
        title: 'Clear one device session',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: false,
            label: 'Device ID',
            value: '',
          },
        ],
      },
      {
        title: 'Clear one wallet session',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
            label: 'Device ID',
            value: '',
          },
          {
            name: 'passphraseState',
            type: 'string',
            required: true,
            label: 'Passphrase State',
            value: '',
          },
        ],
      },
    ],
  },
  {
    method: 'testInitializeDeviceDuration',
    description: 'Measure device initialization duration',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'preInitialize',
    description: 'Warm up a device connection before the next call',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Pre-initialize with a new session',
        parameters: [
          {
            name: 'initSession',
            type: 'boolean',
            required: false,
            label: 'Initialize Session',
            value: true,
          },
        ],
      },
    ],
  },
  {
    method: 'deviceUnlock',
    description: 'methodDescriptions.deviceUnlock',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'testProtocolV2Ping',
    description: 'methodDescriptions.testProtocolV2Ping',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [
      {
        title: 'Protocol V2 ping',
        parameters: [
          {
            name: 'message',
            type: 'string',
            required: false,
            label: 'Message',
            value: 'expo-playground',
          },
        ],
      },
    ],
  },
  {
    method: 'deviceGetOnboardingStatus',
    description: 'methodDescriptions.deviceGetOnboardingStatus',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [],
  },
  {
    method: 'deviceReboot',
    description: 'methodDescriptions.deviceReboot',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [
      {
        title: 'Reboot device',
        parameters: [
          {
            name: 'rebootType',
            type: 'select',
            required: true,
            label: 'Reboot Target',
            options: ['normal', 'bootloader', 'romloader'],
            value: 'normal',
          },
        ],
      },
    ],
  },

  // === 设备管理 ===
  {
    method: 'deviceBackup',
    description: 'Start the device backup flow',
    noDeviceIdReq: true,
    tags: ['Protocol V1'],
    presets: [],
  },
  {
    method: 'deviceReset',
    description: 'Initialize a device with a newly generated recovery phrase',
    noDeviceIdReq: true,
    tags: ['Destructive', 'Protocol V1'],
    presets: [
      {
        title: '12-word recovery phrase',
        description: 'Destructive: initialize the device and generate a new 12-word wallet.',
        parameters: [
          { name: 'strength', type: 'number', label: 'Strength', value: 128 },
          { name: 'pinProtection', type: 'boolean', label: 'PIN Protection', value: true },
          {
            name: 'passphraseProtection',
            type: 'boolean',
            label: 'Passphrase Protection',
            value: false,
          },
          { name: 'skipBackup', type: 'boolean', label: 'Skip Backup', value: false },
          { name: 'label', type: 'string', label: 'Device Label', value: 'My OneKey' },
        ],
      },
      {
        title: '24-word recovery phrase',
        description: 'Destructive: initialize the device and generate a new 24-word wallet.',
        parameters: [
          { name: 'strength', type: 'number', label: 'Strength', value: 256 },
          { name: 'pinProtection', type: 'boolean', label: 'PIN Protection', value: true },
          {
            name: 'passphraseProtection',
            type: 'boolean',
            label: 'Passphrase Protection',
            value: false,
          },
          { name: 'skipBackup', type: 'boolean', label: 'Skip Backup', value: false },
          { name: 'label', type: 'string', label: 'Device Label', value: 'My OneKey' },
        ],
      },
    ],
  },
  {
    method: 'deviceRecovery',
    description: 'Recover a device from an existing recovery phrase',
    noDeviceIdReq: true,
    tags: ['Destructive', 'Protocol V1'],
    presets: [
      {
        title: 'Recover a 12-word wallet',
        description: 'Destructive: erases current device data before recovery.',
        parameters: [
          { name: 'wordCount', type: 'number', label: 'Word Count', value: 12 },
          { name: 'pinProtection', type: 'boolean', label: 'PIN Protection', value: true },
          {
            name: 'passphraseProtection',
            type: 'boolean',
            label: 'Passphrase Protection',
            value: false,
          },
          { name: 'enforceWordlist', type: 'boolean', label: 'Enforce Wordlist', value: true },
          { name: 'dryRun', type: 'boolean', label: 'Dry Run', value: false },
          { name: 'label', type: 'string', label: 'Device Label', value: 'My OneKey' },
        ],
      },
    ],
  },
  {
    method: 'deviceFlags',
    description: 'Set Protocol V1 device feature flags',
    noDeviceIdReq: true,
    tags: ['Protocol V1'],
    presets: [
      {
        title: 'Set flags',
        parameters: [
          {
            name: 'flags',
            type: 'number',
            required: true,
            label: 'Flags',
            value: 0,
          },
        ],
      },
    ],
  },
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
        title: 'Set PassphraseAlwaysOnDevice (Protocol V1)',
        parameters: [
          {
            name: 'passphraseAlwaysOnDevice',
            type: 'boolean',
            required: true,
            label: 'Passphrase Always On Device',
            description: 'Protocol V1 only. Always enter passphrase on device.',
            value: true,
          },
        ],
      },
      {
        title: 'Set English language (shared)',
        parameters: [
          {
            name: 'language',
            type: 'string',
            required: true,
            label: 'Language',
            description: 'Device display language',
            value: 'en',
          },
        ],
      },
      {
        title: 'Set Simplified Chinese language (shared)',
        parameters: [
          {
            name: 'language',
            type: 'string',
            required: true,
            label: 'Language',
            description: 'Device display language',
            value: 'zh_cn',
          },
        ],
      },
      {
        title: 'Set safetyChecks (Protocol V1)',
        parameters: [
          {
            name: 'safetyChecks',
            type: 'select',
            required: true,
            label: 'Safety Checks',
            description: 'Protocol V1 only. Uses the firmware safety-check enum.',
            value: PRO_SETTINGS_CAPABILITIES.safetyCheckOptions[0]?.value,
            options: [...PRO_SETTINGS_CAPABILITIES.safetyCheckOptions],
          },
        ],
      },
      {
        title: 'Enable Air-gap Mode (Protocol V2)',
        parameters: [
          {
            name: 'airgapMode',
            type: 'boolean',
            required: true,
            label: 'Air-gap Mode',
            description:
              'Pro2 opens the device page, waits for confirmation, and verifies the result.',
            value: true,
          },
        ],
      },
      {
        title: 'Disable Air-gap Mode (Protocol V2)',
        parameters: [
          {
            name: 'airgapMode',
            type: 'boolean',
            required: true,
            label: 'Air-gap Mode',
            description:
              'Pro2 opens the device page, waits for confirmation, and verifies the result.',
            value: false,
          },
        ],
      },
      {
        title: 'Set Homescreen (Protocol V1)',
        parameters: [
          {
            name: 'homescreen',
            type: 'textarea',
            required: true,
            label: 'Homescreen Hex',
            description: 'Protocol V1 only. Provide a device-compatible homescreen hex payload.',
            value: '',
          },
        ],
      },
      {
        title: 'Set Passphrase Source (Protocol V1)',
        parameters: [
          {
            name: 'passphraseSource',
            type: 'number',
            required: true,
            label: 'Passphrase Source',
            description: 'Protocol V1 only.',
            value: 0,
          },
        ],
      },
      {
        title: 'Set Display Rotation (Protocol V1)',
        parameters: [
          {
            name: 'displayRotation',
            type: 'select',
            required: true,
            label: 'Display Rotation',
            description: 'Protocol V1 only.',
            value: 0,
            options: [
              { label: '0°', value: 0 },
              { label: '90°', value: 90 },
              { label: '180°', value: 180 },
              { label: '270°', value: 270 },
            ],
          },
        ],
      },
      {
        title: 'Set language',
        parameters: [
          {
            name: 'language',
            type: 'select',
            required: true,
            label: 'Language',
            description: 'Shared Pro/Pro2 language keys mapped by the SDK.',
            value: 'en',
            options: PRO_SETTINGS_CAPABILITIES.languageOptions.map(option => ({
              label: option.label,
              value: option.code,
            })),
          },
        ],
      },
      {
        title: 'Set Pro2-only language (Protocol V2)',
        parameters: [
          {
            name: 'language',
            type: 'select',
            required: true,
            label: 'Pro2 Language',
            value: 'zh-Hant-TW',
            options: PRO2_SETTINGS_CAPABILITIES.languageOptions
              .filter(
                option =>
                  !PRO_SETTINGS_CAPABILITIES.languageOptions.some(
                    shared => shared.code === option.code
                  )
              )
              .map(option => ({ label: option.label, value: option.code })),
          },
        ],
      },
      {
        title: 'Set Auto-lock Delay (Protocol V1)',
        parameters: [
          {
            name: 'autoLockDelayMs',
            type: 'select',
            required: true,
            label: 'Auto-lock Delay',
            value: 60000,
            options: toSelectOptions(PRO_SETTINGS_CAPABILITIES.autoLockDelayOptions),
          },
        ],
      },
      {
        title: 'Set Auto-lock Delay (Protocol V2)',
        parameters: [
          {
            name: 'autoLockDelayMs',
            type: 'select',
            required: true,
            label: 'Auto-lock Delay',
            value: 60000,
            options: toSelectOptions(PRO2_SETTINGS_CAPABILITIES.autoLockDelayOptions),
          },
        ],
      },
      {
        title: 'Set Auto-shutdown Delay (Protocol V1)',
        parameters: [
          {
            name: 'autoShutdownDelayMs',
            type: 'select',
            required: true,
            label: 'Auto-shutdown Delay',
            value: 300000,
            options: toSelectOptions(PRO_SETTINGS_CAPABILITIES.autoShutdownDelayOptions),
          },
        ],
      },
      {
        title: 'Set Auto-shutdown Delay (Protocol V2)',
        parameters: [
          {
            name: 'autoShutdownDelayMs',
            type: 'select',
            required: true,
            label: 'Auto-shutdown Delay',
            value: 300000,
            options: toSelectOptions(PRO2_SETTINGS_CAPABILITIES.autoShutdownDelayOptions),
          },
        ],
      },
      {
        title: 'Set Haptic Feedback',
        parameters: [
          {
            name: 'hapticFeedback',
            type: 'boolean',
            required: true,
            label: 'Haptic Feedback',
            value: true,
          },
        ],
      },
      {
        title: 'Set Bluetooth Enabled',
        parameters: [
          {
            name: 'bluetoothEnabled',
            type: 'boolean',
            required: true,
            label: 'Bluetooth Enabled',
            value: true,
          },
        ],
      },
      {
        title: 'Set Experimental Features (Protocol V1)',
        parameters: [
          {
            name: 'experimentalFeatures',
            type: 'boolean',
            required: true,
            label: 'Experimental Features',
            value: true,
          },
        ],
      },
      {
        title: 'Open Brightness Setting (Protocol V1)',
        parameters: [
          {
            name: 'changeBrightness',
            type: 'boolean',
            required: true,
            label: 'Change Brightness',
            value: true,
          },
        ],
      },
      {
        title: 'Set Brightness (Protocol V2)',
        parameters: [
          {
            name: 'brightness',
            type: 'number',
            required: true,
            label: 'Brightness (10-100)',
            value: 80,
            validation: PRO2_SETTINGS_CAPABILITIES.ranges.brightness,
          },
        ],
      },
      {
        title: 'Set Display and Interaction (Protocol V2)',
        parameters: [
          {
            name: 'animationEnabled',
            type: 'boolean',
            required: true,
            label: 'Animations',
            value: true,
          },
          {
            name: 'tapToWake',
            type: 'boolean',
            required: true,
            label: 'Tap to Wake',
            value: true,
          },
          {
            name: 'deviceNameDisplayEnabled',
            type: 'boolean',
            required: true,
            label: 'Show Device Name',
            value: true,
          },
        ],
      },
      {
        title: 'Set Security Preferences (Protocol V2)',
        parameters: [
          {
            name: 'fidoEnabled',
            type: 'boolean',
            required: true,
            label: 'FIDO Enabled',
            value: true,
          },
          {
            name: 'usbLockEnabled',
            type: 'boolean',
            required: true,
            label: 'USB Lock Enabled',
            value: false,
          },
          {
            name: 'randomKeypad',
            type: 'boolean',
            required: true,
            label: 'Random Keypad',
            value: true,
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
    tags: ['Destructive'],
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
