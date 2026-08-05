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
    presets: [],
  },
  {
    method: 'getPassphraseState',
    description: 'methodDescriptions.getPassphraseState',
    noDeviceIdReq: true,
    presets: [],
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
