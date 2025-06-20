import type { UnifiedMethodConfig } from '../types';

// 固件更新方法定义 - 使用统一格式
const firmwareUpdateMethods: UnifiedMethodConfig[] = [
  {
    method: 'firmwareUpdateV2',
    description: 'Update firmware or ble-firmware',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update firmware with file',
        parameters: [
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
      {
        title: 'Update BLE firmware with file',
        parameters: [
          {
            name: 'binary',
            type: 'file',
            required: true,
            label: 'BLE Firmware Binary',
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
            value: 'ble',
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
        title: 'Force update with system resources',
        parameters: [
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
            value: true,
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
        title: 'Update firmware only',
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
            accept: '.bin,.hex,.fw',
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            label: 'Force Update Resources',
            value: false,
          },
        ],
      },
      {
        title: 'Update firmware and BLE',
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
            accept: '.bin,.hex,.fw',
          },
          {
            name: 'bleBinary',
            type: 'file',
            label: 'BLE Firmware Binary',
            accept: '.bin,.hex,.fw',
          },
          {
            name: 'forcedUpdateRes',
            type: 'boolean',
            label: 'Force Update Resources',
            value: false,
          },
        ],
      },
      {
        title: 'Full update (all components)',
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
            accept: '.bin,.hex,.fw',
          },
          {
            name: 'bleBinary',
            type: 'file',
            label: 'BLE Firmware Binary',
            accept: '.bin,.hex,.fw',
          },
          {
            name: 'bootloaderBinary',
            type: 'file',
            label: 'Bootloader Binary',
            accept: '.bin,.hex',
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
            accept: '.bin,.hex',
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

// 支持的固件更新类型
export const firmwareUpdateTypes: FirmwareUpdateType[] = [
  {
    id: 'firmware',
    name: '主固件',
    description: '设备主要固件程序',
    acceptedFormats: '.bin,.hex,.fw',
    supportedDevices: ['Touch', 'Pro', 'Classic', 'Mini'],
  },
  {
    id: 'ble',
    name: 'BLE固件',
    description: '蓝牙低功耗固件',
    acceptedFormats: '.bin,.hex,.fw',
    supportedDevices: ['Touch', 'Pro'],
  },
  {
    id: 'boot',
    name: 'Bootloader',
    description: '引导程序固件',
    acceptedFormats: '.bin,.hex',
    supportedDevices: ['Pro'],
    isProOnly: true,
  },
  {
    id: 'resources',
    name: '图片资源',
    description: '设备界面图片资源包',
    acceptedFormats: '.zip',
    supportedDevices: ['Pro'],
    isProOnly: true,
  },
];

// 设备类型检测
export const deviceTypes = {
  CLASSIC: 'classic',
  MINI: 'mini',
  TOUCH: 'touch',
  PRO: 'pro',
} as const;

export type DeviceType = (typeof deviceTypes)[keyof typeof deviceTypes];

// 检查设备是否支持特定更新类型
export function isUpdateTypeSupported(deviceType: string, updateType: string): boolean {
  const updateTypeConfig = firmwareUpdateTypes.find(type => type.id === updateType);
  if (!updateTypeConfig) return false;

  return updateTypeConfig.supportedDevices.some(supportedDevice =>
    deviceType.toLowerCase().includes(supportedDevice.toLowerCase())
  );
}

// 检查是否为Pro设备
export function isProDevice(deviceType: string): boolean {
  return deviceType.toLowerCase().includes('pro');
}

// 获取设备支持的更新类型
export function getSupportedUpdateTypes(deviceType: string): FirmwareUpdateType[] {
  return firmwareUpdateTypes.filter(type => isUpdateTypeSupported(deviceType, type.id));
}

// 导出固件更新配置对象
export const firmwareUpdateConfig = {
  id: 'firmwareUpdate',
  name: 'Firmware Update',
  description: 'Device firmware update operations',
  category: 'firmware' as const,
  api: firmwareUpdateMethods,
  updateTypes: firmwareUpdateTypes,
};

export default firmwareUpdateMethods;
