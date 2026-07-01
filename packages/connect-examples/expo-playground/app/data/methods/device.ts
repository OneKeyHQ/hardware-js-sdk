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
    method: 'getDeviceInfo',
    description: 'methodDescriptions.getDeviceInfo',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Basic',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: false,
            label: 'Scope',
            options: [
              { label: 'Basic', value: 'basic' },
              { label: 'Versions', value: 'versions' },
              { label: 'Verify', value: 'verify' },
              { label: 'Full', value: 'full' },
            ],
            value: 'basic',
          },
        ],
      },
      {
        title: 'Full with raw data',
        parameters: [
          {
            name: 'scope',
            type: 'select',
            required: false,
            label: 'Scope',
            options: [
              { label: 'Basic', value: 'basic' },
              { label: 'Versions', value: 'versions' },
              { label: 'Verify', value: 'verify' },
              { label: 'Full', value: 'full' },
            ],
            value: 'full',
          },
          {
            name: 'includeRaw',
            type: 'boolean',
            required: false,
            label: 'Include Raw',
            value: true,
          },
          {
            name: 'refresh',
            type: 'boolean',
            required: false,
            label: 'Force Refresh',
            value: true,
          },
        ],
      },
    ],
  },
  {
    method: 'deviceInfoGet',
    description: 'methodDescriptions.deviceInfoGet',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Basic',
        description: 'hw / fw / coprocessor / status with version + specific',
        parameters: [
          { name: 'targets.hw', type: 'boolean', label: 'Target: hw', value: true },
          { name: 'targets.fw', type: 'boolean', label: 'Target: fw', value: true },
          { name: 'targets.coprocessor', type: 'boolean', label: 'Target: coprocessor', value: true },
          { name: 'targets.se1', type: 'boolean', label: 'Target: se1', value: false },
          { name: 'targets.se2', type: 'boolean', label: 'Target: se2', value: false },
          { name: 'targets.se3', type: 'boolean', label: 'Target: se3', value: false },
          { name: 'targets.se4', type: 'boolean', label: 'Target: se4', value: false },
          { name: 'targets.status', type: 'boolean', label: 'Target: status', value: true },
          { name: 'types.version', type: 'boolean', label: 'Type: version', value: true },
          { name: 'types.build_id', type: 'boolean', label: 'Type: build_id', value: false },
          { name: 'types.hash', type: 'boolean', label: 'Type: hash', value: false },
          { name: 'types.specific', type: 'boolean', label: 'Type: specific', value: true },
        ],
      },
      {
        title: 'Full',
        description: 'All targets with all types (incl. SE, build_id, hash)',
        parameters: [
          { name: 'targets.hw', type: 'boolean', label: 'Target: hw', value: true },
          { name: 'targets.fw', type: 'boolean', label: 'Target: fw', value: true },
          { name: 'targets.coprocessor', type: 'boolean', label: 'Target: coprocessor', value: true },
          { name: 'targets.se1', type: 'boolean', label: 'Target: se1', value: true },
          { name: 'targets.se2', type: 'boolean', label: 'Target: se2', value: true },
          { name: 'targets.se3', type: 'boolean', label: 'Target: se3', value: true },
          { name: 'targets.se4', type: 'boolean', label: 'Target: se4', value: true },
          { name: 'targets.status', type: 'boolean', label: 'Target: status', value: true },
          { name: 'types.version', type: 'boolean', label: 'Type: version', value: true },
          { name: 'types.build_id', type: 'boolean', label: 'Type: build_id', value: true },
          { name: 'types.hash', type: 'boolean', label: 'Type: hash', value: true },
          { name: 'types.specific', type: 'boolean', label: 'Type: specific', value: true },
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
