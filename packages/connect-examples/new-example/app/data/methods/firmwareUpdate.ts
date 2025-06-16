import { type PlaygroundProps } from '../components/Playground';
import type { FunctionalCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'firmwareUpdate',
  name: 'Firmware Update',
  description: 'Device firmware update operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F59E0B"/></svg>`,
  color: '#F59E0B',
  category: 'firmwareUpdate' as FunctionalCategory,
};

// 固件更新方法定义
const firmwareUpdateMethods: PlaygroundProps[] = [
  {
    method: 'firmwareUpdateV2',
    description: 'Update firmware or ble-firmware',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Update firmware with file',
        value: {
          updateType: 'firmware',
          platform: 'web',
          binary: null, // Will be set by file picker
        },
      },
      {
        title: 'Update BLE firmware with file',
        value: {
          updateType: 'ble',
          platform: 'web',
          binary: null, // Will be set by file picker
        },
      },
    ],
  },
  {
    method: 'firmwareUpdateV3',
    description: 'Advanced firmware update with multi-file selection (Pro devices only)',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Update with bootloader file',
        value: {
          platform: 'web',
          bootloaderFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with firmware file',
        value: {
          platform: 'web',
          firmwareFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with BLE firmware file',
        value: {
          platform: 'web',
          bleFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with resource package',
        value: {
          platform: 'web',
          resourceFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with multiple files (bootloader + firmware)',
        value: {
          platform: 'web',
          bootloaderFile: null, // Will be set by file picker
          firmwareFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with multiple files (firmware + BLE)',
        value: {
          platform: 'web',
          firmwareFile: null, // Will be set by file picker
          bleFile: null, // Will be set by file picker
        },
      },
      {
        title: 'Update with all files (boot + fw + ble + resources)',
        value: {
          platform: 'web',
          bootloaderFile: null, // Will be set by file picker
          firmwareFile: null, // Will be set by file picker
          bleFile: null, // Will be set by file picker
          resourceFile: null, // Will be set by file picker
        },
      },
    ],
  },
  {
    method: 'deviceUpdateBootloader',
    description: 'Update device bootloader (Pro devices & bootVersion > 4.12.0 only)',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Update bootloader with file',
        value: {
          bootloaderFile: null, // Will be set by file picker
        },
      },
    ],
  },
  {
    method: 'checkFirmwareRelease',
    description: 'Check firmware release information',
    noDeviceIdReq: true,
  },
  {
    method: 'checkBLEFirmwareRelease',
    description: 'Check BLE firmware release information',
    noDeviceIdReq: true,
  },
  {
    method: 'checkBootloaderRelease',
    description: 'Check bootloader release information',
    noDeviceIdReq: true,
  },
  {
    method: 'checkBridgeRelease',
    description: 'Check bridge release information',
    noDeviceIdReq: true,
  },
  {
    method: 'checkAllFirmwareRelease',
    description: 'Check all firmware release information',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Check all firmware releases',
        value: {
          checkBridgeRelease: true,
        },
      },
    ],
  },
  {
    method: 'deviceRebootToBoardloader',
    description: 'Reboot device to bootloader mode',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceUpdateReboot',
    description: 'Update and reboot device with file',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Update and reboot with firmware file',
        value: {
          firmwareFile: null, // Will be set by file picker
        },
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
  ...chainMeta,
  api: firmwareUpdateMethods,
  updateTypes: firmwareUpdateTypes,
};

export default firmwareUpdateMethods;
