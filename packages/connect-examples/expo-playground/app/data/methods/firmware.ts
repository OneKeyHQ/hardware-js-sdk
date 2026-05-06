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
    method: 'firmwareUpdateV3',
    description: 'methodDescriptions.firmwareUpdateV3',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 one-stop update',
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
  {
    method: 'pathInfo',
    description: 'methodDescriptions.pathInfo',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 path info',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:firmware.bin',
            value: 'vol1:firmware.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'dirList',
    description: 'methodDescriptions.dirList',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 list directory',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:',
            value: 'vol1:',
          },
        ],
      },
    ],
  },
  {
    method: 'dirMake',
    description: 'methodDescriptions.dirMake',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 make directory',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:updates',
            value: 'vol1:updates',
          },
        ],
      },
    ],
  },
  {
    method: 'dirRemove',
    description: 'methodDescriptions.dirRemove',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 remove directory',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:updates',
            value: 'vol1:updates',
          },
        ],
      },
    ],
  },
  {
    method: 'fileRead',
    description: 'methodDescriptions.fileRead',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 read file chunk',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:firmware.bin',
            value: 'vol1:firmware.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: true,
            label: 'Offset',
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: true,
            label: 'Total Size',
            value: 0,
          },
          {
            name: 'chunkLen',
            type: 'number',
            required: false,
            label: 'Chunk Length',
            value: 1400,
          },
        ],
      },
    ],
  },
  {
    method: 'fileWrite',
    description: 'methodDescriptions.fileWrite',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 write file chunk',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:test.bin',
            value: 'vol1:test.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: true,
            label: 'Offset',
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: false,
            label: 'Total Size',
            description: 'Leave 0 to use the selected file size for a single chunk write.',
            value: 0,
          },
          {
            name: 'data',
            type: 'file',
            required: true,
            label: 'File Data',
            description: 'One Protocol V2 chunk. Keep it at 2048 bytes or smaller.',
            accept: '.bin,.txt,.json',
            visible: true,
            editable: true,
          },
          {
            name: 'overwrite',
            type: 'boolean',
            required: false,
            label: 'Overwrite',
            value: true,
          },
          {
            name: 'append',
            type: 'boolean',
            required: false,
            label: 'Append',
            value: false,
          },
        ],
      },
    ],
  },
  {
    method: 'fileDelete',
    description: 'methodDescriptions.fileDelete',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Protocol V2 delete file',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol1:test.bin',
            value: 'vol1:test.bin',
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
            description: 'Upload bootloader binary file (.bin). If not provided, latest will be downloaded automatically.',
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
