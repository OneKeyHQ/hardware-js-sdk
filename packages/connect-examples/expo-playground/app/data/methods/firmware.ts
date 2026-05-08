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
    method: 'devFirmwareUpdate',
    description: 'methodDescriptions.devFirmwareUpdate',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'Install one Protocol V2 target',
        parameters: [
          {
            name: 'targetId',
            type: 'select',
            required: true,
            label: 'Target',
            options: [
              { label: 'Main App', value: '0' },
              { label: 'Main Bootloader', value: '1' },
              { label: 'Bluetooth', value: '2' },
              { label: 'SE1', value: '3' },
              { label: 'SE2', value: '4' },
              { label: 'SE3', value: '5' },
              { label: 'SE4', value: '6' },
              { label: 'Resource', value: '10' },
            ],
            value: '0',
          },
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:firmware.bin',
            value: 'vol0:firmware.bin',
          },
        ],
      },
      {
        title: 'Install multiple Protocol V2 targets',
        parameters: [
          {
            name: 'targets',
            type: 'textarea',
            required: true,
            label: 'Targets',
            description: 'DevFirmwareTarget JSON array',
            value: [
              {
                target_id: 0,
                path: 'vol0:firmware.bin',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'devGetFirmwareUpdateStatus',
    description: 'methodDescriptions.devGetFirmwareUpdateStatus',
    noDeviceIdReq: true,
    presets: [],
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
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
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
            placeholder: 'vol0:',
            value: 'vol0:',
          },
          {
            name: 'depth',
            type: 'number',
            required: false,
            label: 'Depth',
            description: 'Recursive depth. 0 means unlimited.',
            value: 0,
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
            placeholder: 'vol0:updates',
            value: 'vol0:updates',
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
            placeholder: 'vol0:updates',
            value: 'vol0:updates',
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
        title: 'Protocol V2 read file',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            label: 'Start Offset',
            visible: true,
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: false,
            label: 'Read Length',
            description: '0 reads from the start offset to the end of the file.',
            visible: true,
            value: 0,
          },
          {
            name: 'chunkLen',
            type: 'number',
            required: false,
            label: 'Chunk Length',
            validation: {
              min: 64,
              max: 4096,
            },
            visible: true,
            value: 4096,
          },
          {
            name: 'uiPercentage',
            type: 'number',
            required: false,
            label: 'UI Percentage',
            visible: true,
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
        title: 'Protocol V2 upload file',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            label: 'Offset',
            visible: true,
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: false,
            label: 'Total Size',
            description: 'Auto-filled from selected file size.',
            visible: true,
            value: 0,
          },
          {
            name: 'chunkSize',
            type: 'number',
            required: false,
            label: 'Chunk Size',
            description: 'Upload chunk size. WebUSB maximum is 4096 bytes.',
            validation: {
              min: 64,
              max: 4096,
            },
            value: 4096,
          },
          {
            name: 'data',
            type: 'file',
            required: true,
            label: 'File Data',
            description: 'Select a full file. SDK splits it into Protocol V2 chunks automatically.',
            accept: '.bin,.txt,.json',
            visible: true,
            editable: true,
          },
          {
            name: 'overwrite',
            type: 'boolean',
            required: false,
            label: 'Overwrite',
            visible: true,
            value: true,
          },
          {
            name: 'append',
            type: 'boolean',
            required: false,
            label: 'Append',
            visible: true,
            value: false,
          },
          {
            name: 'uiPercentage',
            type: 'number',
            required: false,
            label: 'UI Percentage',
            visible: true,
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
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemFixPermission',
    description: 'methodDescriptions.filesystemFixPermission',
    noDeviceIdReq: true,
    presets: [],
  },
  {
    method: 'filesystemPathInfoQuery',
    description: 'methodDescriptions.filesystemPathInfoQuery',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemPathInfoQuery',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemFileRead',
    description: 'methodDescriptions.filesystemFileRead',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemFileRead',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            label: 'Start Offset',
            visible: true,
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: false,
            label: 'Read Length',
            description: '0 reads from the start offset to the end of the file.',
            visible: true,
            value: 0,
          },
          {
            name: 'chunkLen',
            type: 'number',
            required: false,
            label: 'Chunk Length',
            validation: {
              min: 64,
              max: 4096,
            },
            visible: true,
            value: 4096,
          },
          {
            name: 'uiPercentage',
            type: 'number',
            required: false,
            label: 'UI Percentage',
            visible: true,
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemFileWrite',
    description: 'methodDescriptions.filesystemFileWrite',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemFileWrite',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            label: 'Offset',
            visible: true,
            value: 0,
          },
          {
            name: 'totalSize',
            type: 'number',
            required: false,
            label: 'Total Size',
            description: 'Auto-filled from selected file size.',
            visible: true,
            value: 0,
          },
          {
            name: 'chunkSize',
            type: 'number',
            required: false,
            label: 'Chunk Size',
            description: 'Upload chunk size. WebUSB maximum is 4096 bytes.',
            validation: {
              min: 64,
              max: 4096,
            },
            value: 4096,
          },
          {
            name: 'data',
            type: 'file',
            required: true,
            label: 'File Data',
            description: 'Select a full file. SDK splits it into Protocol V2 chunks automatically.',
            accept: '.bin,.txt,.json',
            visible: true,
            editable: true,
          },
          {
            name: 'overwrite',
            type: 'boolean',
            required: false,
            label: 'Overwrite',
            visible: true,
            value: true,
          },
          {
            name: 'append',
            type: 'boolean',
            required: false,
            label: 'Append',
            visible: true,
            value: false,
          },
          {
            name: 'uiPercentage',
            type: 'number',
            required: false,
            label: 'UI Percentage',
            visible: true,
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemFileDelete',
    description: 'methodDescriptions.filesystemFileDelete',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemFileDelete',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:test.bin',
            value: 'vol0:test.bin',
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemDirList',
    description: 'methodDescriptions.filesystemDirList',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemDirList',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:',
            value: 'vol0:',
          },
          {
            name: 'depth',
            type: 'number',
            required: false,
            label: 'Depth',
            description: 'Recursive depth. 0 means unlimited.',
            value: 0,
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemDirMake',
    description: 'methodDescriptions.filesystemDirMake',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemDirMake',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:updates',
            value: 'vol0:updates',
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemDirRemove',
    description: 'methodDescriptions.filesystemDirRemove',
    noDeviceIdReq: true,
    presets: [
      {
        title: 'FilesystemDirRemove',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            placeholder: 'vol0:updates',
            value: 'vol0:updates',
          },
        ],
      },
    ],
  },
  {
    method: 'filesystemFormat',
    description: 'methodDescriptions.filesystemFormat',
    noDeviceIdReq: true,
    presets: [],
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
