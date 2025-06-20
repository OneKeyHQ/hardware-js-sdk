import type { UnifiedMethodConfig, FunctionalCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'device',
  name: 'Device',
  description: 'Device management and basic operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#10B981"/></svg>`,
  color: '#10B981',
  category: 'device' as FunctionalCategory,
};

const api: UnifiedMethodConfig[] = [
  // Basic Operations
  {
    method: 'searchDevices',
    description: 'Search for devices',
    noConnIdReq: true,
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getOnekeyFeatures',
    description: 'Get OneKey specific features of a device',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'getPassphraseState',
    description: 'Get passphrase state of a device',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'cancel',
    description: 'Cancel a request',
    noDeviceIdReq: true,
    presets: [],
  },

  // Device Management Operations
  {
    method: 'deviceChangePin',
    description: 'Change pin of a device',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceCancel',
    description: 'Cancel device operation',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceLock',
    description: 'Lock device',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceSettings',
    description: 'Get settings of a device',
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
];

// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
