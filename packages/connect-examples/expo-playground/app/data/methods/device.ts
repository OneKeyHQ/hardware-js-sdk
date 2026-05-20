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
    method: 'getProtoVersion',
    description: 'methodDescriptions.getProtoVersion',
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
  // DeviceGetDeviceInfo 暂时关闭，避免页面直接调用固件侧 DeviceInfo。
  // {
  //   method: 'deviceGetDeviceInfo',
  //   description: 'methodDescriptions.deviceGetDeviceInfo',
  //   noDeviceIdReq: true,
  //   presets: [
  //     {
  //       title: 'All device info',
  //       parameters: [
  //         {
  //           name: 'targetHw',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Hardware',
  //           value: true,
  //         },
  //         {
  //           name: 'targetFw',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Firmware',
  //           value: true,
  //         },
  //         {
  //           name: 'targetBt',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Bluetooth',
  //           value: true,
  //         },
  //         {
  //           name: 'targetSe1',
  //           type: 'boolean',
  //           required: false,
  //           label: 'SE1',
  //           value: true,
  //         },
  //         {
  //           name: 'targetSe2',
  //           type: 'boolean',
  //           required: false,
  //           label: 'SE2',
  //           value: true,
  //         },
  //         {
  //           name: 'targetSe3',
  //           type: 'boolean',
  //           required: false,
  //           label: 'SE3',
  //           value: true,
  //         },
  //         {
  //           name: 'targetSe4',
  //           type: 'boolean',
  //           required: false,
  //           label: 'SE4',
  //           value: true,
  //         },
  //         {
  //           name: 'targetStatus',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Status',
  //           value: true,
  //         },
  //         {
  //           name: 'includeVersion',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Version',
  //           value: true,
  //         },
  //         {
  //           name: 'includeBuildId',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Build ID',
  //           value: true,
  //         },
  //         {
  //           name: 'includeHash',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Hash',
  //           value: false,
  //         },
  //         {
  //           name: 'includeSpecific',
  //           type: 'boolean',
  //           required: false,
  //           label: 'Specific',
  //           value: true,
  //         },
  //       ],
  //     },
  //     {
  //       title: 'Custom targets and types',
  //       parameters: [
  //         {
  //           name: 'targets',
  //           type: 'textarea',
  //           required: false,
  //           label: 'Targets',
  //           description: 'DevInfoTargets JSON',
  //           value: {
  //             hw: true,
  //             fw: true,
  //             bt: true,
  //             se1: true,
  //             se2: true,
  //             se3: true,
  //             se4: true,
  //             status: true,
  //           },
  //         },
  //         {
  //           name: 'types',
  //           type: 'textarea',
  //           required: false,
  //           label: 'Types',
  //           description: 'DevInfoTypes JSON',
  //           value: {
  //             version: true,
  //             build_id: true,
  //             hash: false,
  //             specific: true,
  //           },
  //         },
  //       ],
  //     },
  //   ],
  // },
  {
    method: 'deviceGetOnboardingStatus',
    description: 'methodDescriptions.deviceGetOnboardingStatus',
    noDeviceIdReq: true,
    presets: [],
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
              { label: 'Boardloader', value: '1' },
              { label: 'Bootloader', value: '2' },
            ],
            value: '0',
          },
        ],
      },
      {
        title: 'Reboot to boardloader',
        parameters: [
          {
            name: 'rebootType',
            type: 'select',
            required: true,
            label: 'Reboot Type',
            options: [
              { label: 'Normal', value: '0' },
              { label: 'Boardloader', value: '1' },
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
              { label: 'Boardloader', value: '1' },
              { label: 'Bootloader', value: '2' },
            ],
            value: '2',
          },
        ],
      },
    ],
  },
  {
    method: 'factoryGetDeviceInfo',
    description: 'methodDescriptions.factoryGetDeviceInfo',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'factoryDeviceInfoSettings',
    description: 'methodDescriptions.factoryDeviceInfoSettings',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Set factory device info',
        parameters: [
          {
            name: 'serial_no',
            type: 'string',
            required: false,
            label: 'Serial No',
            value: '',
          },
          {
            name: 'cpu_info',
            type: 'string',
            required: false,
            label: 'CPU Info',
            value: '',
          },
          {
            name: 'pre_firmware',
            type: 'string',
            required: false,
            label: 'Pre Firmware',
            value: '',
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
