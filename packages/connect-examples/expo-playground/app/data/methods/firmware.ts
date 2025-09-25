import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'firmwareUpdateV2',
    description: 'methodDescriptions.firmwareUpdateV2',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update firmware',
        parameters: [
          {
            name: 'updateType',
            type: 'select',
            required: true,
            label: 'Update Type',
            options: [
              { label: 'Firmware', value: 'firmware' },
              { label: 'BLE Firmware', value: 'ble' },
            ],
            value: 'firmware',
          },
          {
            name: 'platform',
            type: 'select',
            required: true,
            label: 'Platform',
            options: [
              { label: 'Web', value: 'web' },
              { label: 'Desktop', value: 'desktop' },
            ],
            value: 'web',
          },
          {
            name: 'binary',
            type: 'file',
            required: false,
            label: 'Firmware Binary',
            description: 'Upload firmware binary file (.bin)',
            accept: '.bin',
            visible: true,
            editable: true,
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            required: false,
            label: 'Force Update Resources',
            value: false,
          },
          {
            name: 'isUpdateBootloader',
            type: 'boolean',
            required: false,
            label: 'Update Bootloader',
            value: false,
          },
        ],
      },
      {
        title: 'Update ble firmware',
        parameters: [
          {
            name: 'updateType',
            type: 'select',
            required: true,
            label: 'Update Type',
            options: [
              { label: 'Firmware', value: 'firmware' },
              { label: 'BLE Firmware', value: 'ble' },
            ],
            value: 'ble',
          },
          {
            name: 'platform',
            type: 'select',
            required: true,
            label: 'Platform',
            options: [
              { label: 'Web', value: 'web' },
              // { label: 'Desktop', value: 'desktop' },
              // { label: 'Mobile', value: 'mobile' },
            ],
            value: 'web',
          },
          {
            name: 'binary',
            type: 'file',
            required: false,
            label: 'BLE Binary',
            description: 'Upload BLE firmware binary file (.bin)',
            accept: '.bin',
            visible: true,
            editable: true,
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            required: false,
            label: 'Force Update Resources',
            value: false,
          },
        ],
      },
    ],
  },
  {
    method: 'emmcFileWrite',
    description: 'methodDescriptions.emmcFileWrite',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'EMMC write file',
        parameters: [
          {
            name: 'filePath',
            type: 'string',
            required: true,
            label: 'EMMC Path',
            placeholder: '0:boot/bootloader.bin',
            value: '0:boot/bootloader.bin',
          },
          {
            name: 'payload',
            type: 'file',
            required: true,
            label: 'Binary',
            description: 'Upload binary file (.bin) to write into EMMC',
            accept: '.bin',
            visible: true,
            editable: true,
          },
        ],
      },
    ],
  },
  {
    method: 'firmwareUpdateV3',
    description: 'methodDescriptions.firmwareUpdateV3',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update multiple firmware',
        parameters: [
          {
            name: 'platform',
            type: 'select',
            required: true,
            label: 'Platform',
            options: [
              { label: 'Web', value: 'web' },
              // { label: 'Desktop', value: 'desktop' },
              // { label: 'Mobile', value: 'mobile' },
            ],
            value: 'web',
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            required: false,
            label: 'Force Update Resources',
            value: true,
          },
          {
            name: 'firmwareBinary',
            type: 'file',
            required: false,
            label: 'Firmware Binary',
            description: 'Upload firmware binary file (.bin)',
            accept: '.bin',
            visible: true,
            editable: true,
          },
          {
            name: 'bleBinary',
            type: 'file',
            required: false,
            label: 'BLE Binary',
            description: 'Upload BLE firmware binary file (.bin)',
            accept: '.bin',
            visible: true,
            editable: true,
          },
          {
            name: 'bootloaderBinary',
            type: 'file',
            required: false,
            label: 'Bootloader Binary',
            description: 'Upload bootloader binary file (.bin)',
            accept: '.bin',
            visible: true,
            editable: true,
          },
          {
            name: 'resourceBinary',
            type: 'file',
            required: false,
            label: 'Resource Binary',
            description: 'Upload resource binary file (.zip)',
            accept: '.zip',
            visible: true,
            editable: true,
          },
        ],
      },
    ],
  },
  // === 固件信息检查 ===
  {
    method: 'checkFirmwareRelease',
    description: 'methodDescriptions.checkFirmwareRelease',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'checkBLEFirmwareRelease',
    description: 'methodDescriptions.checkBLEFirmwareRelease',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'checkBootloaderRelease',
    description: 'methodDescriptions.checkBootloaderRelease',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'checkAllFirmwareRelease',
    description: 'methodDescriptions.checkAllFirmwareRelease',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Check all firmware releases',
        parameters: [
          {
            name: 'checkBridgeRelease',
            type: 'boolean',
            required: false,
            label: 'Check Bridge Release',
            description: 'Include bridge release in check',
            value: true,
          },
        ],
      },
    ],
  },
  {
    method: 'checkBridgeRelease',
    description: 'methodDescriptions.checkBridgeRelease',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'checkBridgeStatus',
    description: 'methodDescriptions.checkBridgeStatus',
    noDeviceIdReq: true,
    presets: [],
  },

  // === 固件更新 ===

  {
    method: 'deviceUpdateBootloader',
    description: 'methodDescriptions.deviceUpdateBootloader',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceRebootToBootloader',
    description: 'methodDescriptions.deviceRebootToBootloader',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'deviceRebootToBoardloader',
    description: 'methodDescriptions.deviceRebootToBoardloader',
    noDeviceIdReq: true,
    presets: [],
  },
];

// 导出链配置对象
export const firmware: {
  api: UnifiedMethodConfig[];
  id: DeviceMethodCategory;
} = {
  id: 'firmware',
  api,
};
