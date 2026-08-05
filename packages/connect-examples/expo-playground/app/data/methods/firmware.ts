import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'deviceUploadWallpaper',
    description: 'methodDescriptions.deviceUploadWallpaper',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [
      {
        title: 'Upload Pro2 wallpaper',
        description: 'Upload a 604x1024 raw RGBA8888 file and apply it as the wallpaper.',
        parameters: [
          {
            name: 'width',
            type: 'number',
            required: true,
            label: 'Width',
            value: 604,
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            label: 'Height',
            value: 1024,
          },
          {
            name: 'rgba',
            type: 'file',
            required: true,
            label: 'Raw RGBA File',
            accept: '.rgba,.bin',
          },
          {
            name: 'fileName',
            type: 'string',
            required: false,
            label: 'Device File Name',
            value: 'playground-wallpaper.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'deviceUploadNft',
    description: 'methodDescriptions.deviceUploadNft',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [
      {
        title: 'Upload Pro2 NFT',
        description: 'Upload raw RGBA8888 image and thumbnail files with NFT metadata.',
        parameters: [
          {
            name: 'imageWidth',
            type: 'number',
            required: true,
            label: 'Image Width',
          },
          {
            name: 'imageHeight',
            type: 'number',
            required: true,
            label: 'Image Height',
          },
          {
            name: 'imageRgba',
            type: 'file',
            required: true,
            label: 'Image RGBA File',
            accept: '.rgba,.bin',
          },
          {
            name: 'thumbnailWidth',
            type: 'number',
            required: true,
            label: 'Thumbnail Width',
          },
          {
            name: 'thumbnailHeight',
            type: 'number',
            required: true,
            label: 'Thumbnail Height',
          },
          {
            name: 'thumbnailRgba',
            type: 'file',
            required: true,
            label: 'Thumbnail RGBA File',
            accept: '.rgba,.bin',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            label: 'Title',
          },
          {
            name: 'subtitle',
            type: 'string',
            required: true,
            label: 'Subtitle',
          },
        ],
      },
    ],
  },
  {
    method: 'uploadPortfolio',
    description: 'methodDescriptions.uploadPortfolio',
    noDeviceIdReq: true,
    supportedDevices: ['pro2'],
    presets: [
      {
        title: 'Upload Pro2 portfolio package',
        parameters: [
          {
            name: 'packageBytes',
            type: 'file',
            required: true,
            label: 'Portfolio Package',
            accept: '.zip,.bin',
          },
        ],
      },
    ],
  },
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
        parameters: [],
      },
    ],
  },

  // === 固件更新 ===

  {
    method: 'deviceUpdateBootloader',
    description: 'methodDescriptions.deviceUpdateBootloader',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Update bootloader',
        parameters: [
          {
            name: 'binary',
            type: 'file',
            required: false,
            label: 'Bootloader Binary',
            description:
              'Upload bootloader binary file (.bin). If not provided, latest will be downloaded automatically.',
            accept: '.bin',
            visible: true,
            editable: true,
          },
        ],
      },
    ],
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
