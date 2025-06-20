import type { UnifiedMethodConfig } from '../types';
const chainMeta = {
  id: 'firmware',
};

// 固件更新方法定义 - 使用统一格式
const api: UnifiedMethodConfig[] = [
  {
    method: 'firmwareUpdateV2',
    description: 'Update firmware or ble-firmware',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update Single firmware with file',
        parameters: [
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
            required: true,
            label: 'Firmware Binary',
            accept: '.bin,.hex,.fw',
          },
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
    ],
  },
  {
    method: 'firmwareUpdateV3',
    description: 'Update firmware using V3 protocol',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update multiple firmware with file',
        parameters: [
          {
            name: 'platform',
            type: 'select',
            required: true,
            label: 'Platform',
            options: [
              { label: 'Web', value: 'web' },
              { label: 'Desktop', value: 'desktop' },
              { label: 'Mobile', value: 'mobile' },
            ],
            value: 'web',
          },
          {
            name: 'firmwareBinary',
            type: 'file',
            label: 'Firmware Binary',
            accept: '.bin',
          },
          {
            name: 'bleBinary',
            type: 'file',
            label: 'BLE Firmware Binary',
            accept: '.bin',
          },
          {
            name: 'bootloaderBinary',
            type: 'file',
            label: 'Bootloader Binary',
            accept: '.bin',
          },
          {
            name: 'resourceBinary',
            type: 'file',
            label: 'System Resources',
            accept: '.zip',
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            label: 'Force Update Resources',
            value: true,
          },
        ],
      },
    ],
  },
  {
    method: 'deviceUpdateBootloader',
    description: 'Update device bootloader',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update bootloader with file',
        parameters: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            label: 'Bootloader Binary',
            accept: '.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'checkFirmwareRelease',
    description: 'Check firmware release information',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Check latest firmware release',
        parameters: [],
      },
    ],
  },
  {
    method: 'checkBLEFirmwareRelease',
    description: 'Check BLE firmware release information',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Check latest BLE firmware release',
        parameters: [],
      },
    ],
  },
  {
    method: 'checkBootloaderRelease',
    description: 'Check bootloader release information',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Check latest bootloader release',
        parameters: [],
      },
    ],
  },
  {
    method: 'deviceRebootToBootloader',
    description: 'Reboot device to bootloader mode',
    presets: [
      {
        title: 'Reboot to bootloader',
        parameters: [],
      },
    ],
  },
];

// 固件更新类型定义
export interface FirmwareUpdateType {
  id: string;
  name: string;
  description: string;
  acceptedFormats: string;
  supportedDevices: string[];
  isProOnly?: boolean;
}

export const firmware = {
  ...chainMeta,
  api,
};
