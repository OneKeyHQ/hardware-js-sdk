import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';
import type { HardwareApiMethod } from '../../services/hardwareService';
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
    presets: [],
  },
  {
    method: 'getOnekeyFeatures',
    description: 'methodDescriptions.getOnekeyFeatures',
    noDeviceIdReq: true,
    deprecated: true,
    presets: [],
  },
  {
    method: 'getPassphraseState',
    description:
      'Read the current wallet state through the Legacy Protocol V1 compatibility API. New flows must use openWalletSession.',
    noDeviceIdReq: true,
    tags: ['Legacy', 'Protocol V1'],
    presets: [
      {
        title: 'Get current wallet state (Legacy V1)',
        parameters: [],
      },
    ],
  },
  {
    method: 'openWalletSession',
    description:
      'Open or resume a standard, hidden, or Attach-to-PIN wallet through the unified Protocol V1/V2 flow.',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Open standard wallet',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Session Mode',
            value: 'standard',
            options: [{ label: 'Standard', value: 'standard' }],
          },
        ],
      },
      {
        title: 'Open hidden wallet',
        description: 'Choose a Passphrase hidden wallet or an Attach-to-PIN wallet.',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Session Mode',
            value: 'hidden',
            options: [{ label: 'Hidden', value: 'hidden' }],
          },
          {
            name: 'access',
            type: 'select',
            required: true,
            label: 'Hidden Wallet Access',
            value: 'passphrase',
            options: [
              { label: 'Passphrase Hidden Wallet', value: 'passphrase' },
              { label: 'Attach-to-PIN Wallet', value: 'attach-pin' },
            ],
          },
        ],
      },
      {
        title: 'Resume hidden wallet',
        description: 'Resume a known hidden wallet from the SDK-managed session cache.',
        parameters: [
          {
            name: 'mode',
            type: 'select',
            required: true,
            label: 'Wallet Session Mode',
            value: 'resume-hidden',
            options: [{ label: 'Resume Hidden', value: 'resume-hidden' }],
          },
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
    method: 'clearSessionCache',
    description: 'Clear the SDK-managed wallet session cache',
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
    description: 'Pre-initialize a device connection, primarily for BLE testing',
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
    method: 'deviceGetOnboardingStatus',
    description: 'methodDescriptions.deviceGetOnboardingStatus',
    noDeviceIdReq: true,
    supportedDevices: ['Pro2'],
    presets: [],
  },
  {
    method: 'uploadPortfolio',
    description: 'Upload and apply a Pro2 portfolio package',
    noDeviceIdReq: true,
    supportedDevices: ['Pro2'],
    presets: [
      {
        title: 'Upload Pro2 portfolio package',
        parameters: [
          {
            name: 'packageBytes',
            type: 'file',
            required: true,
            label: 'Portfolio Package',
            description: 'Select a .okpkg portfolio package to stage and apply on Pro2.',
            accept: '.okpkg',
          },
          {
            name: 'timeoutMs',
            type: 'number',
            required: false,
            label: 'Response Timeout (ms)',
            value: 5000,
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
        title: 'Live runtime status',
        parameters: [],
      },
      {
        title: 'Runtime and settings',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: true,
            label: 'Scope',
            value: 'settings',
            options: [{ label: 'Settings', value: 'settings' }],
          },
        ],
      },
      {
        title: 'Runtime and firmware metadata',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: true,
            label: 'Scope',
            value: 'firmware',
            options: [{ label: 'Firmware', value: 'firmware' }],
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
        title: 'Enable Air-gap Mode (Protocol V2)',
        parameters: [
          {
            name: 'airgapMode',
            type: 'boolean',
            required: true,
            label: 'Air-gap Mode',
            description:
              'Target state. Pro2 opens the device page, waits for confirmation, and verifies the result.',
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
              'Target state. Pro2 opens the device page, waits for confirmation, and verifies the result.',
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
            description:
              'Shared Pro/Pro2 language keys. The SDK maps them to the protocol-specific value.',
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
            description:
              'Protocol V2 only. Languages without a historical SDK key use their full BCP-47 tag.',
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
            label: 'Auto-lock Delay (ms)',
            description: 'Protocol V1 values, including 0 for Never.',
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
            label: 'Auto-lock Delay (ms)',
            description: 'Protocol V2 values, including 0x10000000 for Never.',
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
            label: 'Auto-shutdown Delay (ms)',
            description: 'Protocol V1 values, including 0 for Never.',
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
            label: 'Auto-shutdown Delay (ms)',
            description: 'Protocol V2 values, including 0x10000000 for Never.',
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
            description: 'Shared Pro/Pro2 setting.',
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
            description: 'Shared Pro/Pro2 setting.',
            value: true,
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
            description: 'Protocol V1 only. Uses the numeric protobuf enum.',
            value: PRO_SETTINGS_CAPABILITIES.safetyCheckOptions[0]?.value,
            options: [...PRO_SETTINGS_CAPABILITIES.safetyCheckOptions],
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
            description: 'Protocol V1 only; the current Protocol V2 schema has no matching field.',
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
            description: 'Protocol V1 only. Opens the device-side brightness setting flow.',
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
            description: 'Protocol V2 only.',
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
    method: 'deviceBackup',
    description: 'Start the device backup flow',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceReset',
    description: 'Initialize a device with a newly generated recovery phrase',
    noDeviceIdReq: true,
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
    description: 'Set device feature flags',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Set flags',
        parameters: [
          {
            name: 'flags',
            type: 'number',
            required: false,
            label: 'Flags',
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

const DEVELOPMENT_DEVICE_METHODS = new Set<HardwareApiMethod>([
  'protocolInfoRequest',
  'ping',
  'deviceFactoryInfoSet',
  'deviceFactoryInfoGet',
]);

export const deviceDebugApi: UnifiedMethodConfig[] = api
  .filter(item => DEVELOPMENT_DEVICE_METHODS.has(item.method as HardwareApiMethod))
  .map(item => ({ ...item, deprecated: undefined, debugOnly: true }));

// 导出链配置对象
export const device: {
  api: UnifiedMethodConfig[];
  id: DeviceMethodCategory;
} = {
  id: 'device',
  api: api.filter(item => !DEVELOPMENT_DEVICE_METHODS.has(item.method as HardwareApiMethod)),
};
