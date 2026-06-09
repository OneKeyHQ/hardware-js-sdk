import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'getProtoVersion',
    description: 'Get Protocol V2 protobuf version.',
    noDeviceIdReq: true,
  },
  {
    method: 'ping',
    description: 'Send Protocol V2 Ping.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Ping',
        value: {
          message: 'Hello from expo-example!',
        },
      },
    ],
  },
  {
    method: 'getDeviceInfo',
    description: 'Get standard device profile information.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'All info',
        value: {
          scope: 'full',
          includeRaw: true,
        },
      },
      {
        title: 'Versions',
        value: {
          scope: 'versions',
        },
      },
    ],
  },
  {
    method: 'deviceGetOnboardingStatus',
    description: 'Get Protocol V2 onboarding status.',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceReboot',
    description: 'Reboot Protocol V2 device.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Normal',
        value: {
          rebootType: 0,
        },
      },
      {
        title: 'Boardloader',
        value: {
          rebootType: 1,
        },
      },
      {
        title: 'Bootloader',
        value: {
          rebootType: 2,
        },
      },
    ],
  },
  {
    method: 'factoryGetDeviceInfo',
    description: 'Get factory device information.',
    noDeviceIdReq: true,
  },
  {
    method: 'factoryDeviceInfoSettings',
    description: 'Set factory device information.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Factory settings',
        value: {
          serial_no: '',
          cpu_info: '',
          pre_firmware: '',
        },
      },
    ],
  },
  {
    method: 'deviceFirmwareUpdate',
    description: 'Install Protocol V2 firmware target from device filesystem path.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Main app',
        value: {
          targetId: 3,
          path: 'vol0:firmware.bin',
        },
      },
      {
        title: 'Multiple targets',
        value: {
          targets: [
            {
              target_id: 3,
              path: 'vol0:firmware.bin',
            },
          ],
        },
      },
    ],
  },
  {
    method: 'deviceGetFirmwareUpdateStatus',
    description: 'Get Protocol V2 firmware update status.',
    noDeviceIdReq: true,
  },
  {
    method: 'filesystemFixPermission',
    description: 'Fix Protocol V2 filesystem permission.',
    noDeviceIdReq: true,
  },
  {
    method: 'filesystemFormat',
    description: 'Format Protocol V2 filesystem.',
    noDeviceIdReq: true,
  },
  {
    method: 'filesystemPathInfoQuery',
    description: 'Query Protocol V2 filesystem path info.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Path info',
        value: {
          path: 'vol0:firmware.bin',
        },
      },
    ],
  },
  {
    method: 'filesystemDirList',
    description: 'List Protocol V2 filesystem directory.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Root',
        value: {
          path: 'vol0:',
          depth: 0,
        },
      },
    ],
  },
  {
    method: 'filesystemDirMake',
    description: 'Create Protocol V2 filesystem directory.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Make dir',
        value: {
          path: 'vol0:test_dir',
        },
      },
    ],
  },
  {
    method: 'filesystemDirRemove',
    description: 'Remove Protocol V2 filesystem directory.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Remove dir',
        value: {
          path: 'vol0:test_dir',
        },
      },
    ],
  },
  {
    method: 'filesystemFileRead',
    description: 'Read a Protocol V2 filesystem file chunk.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Read chunk',
        value: {
          path: 'vol0:test.bin',
          offset: 0,
          totalSize: 0,
          chunkLen: 1400,
          uiPercentage: 0,
        },
      },
    ],
  },
  {
    method: 'filesystemFileWrite',
    description: 'Write a Protocol V2 filesystem file chunk.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Write text',
        value: {
          path: 'vol0:test.txt',
          offset: 0,
          totalSize: 23,
          data: 'Hello from expo-example',
          overwrite: true,
          append: false,
          uiPercentage: 0,
        },
      },
    ],
  },
  {
    method: 'filesystemFileDelete',
    description: 'Delete a Protocol V2 filesystem file.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Delete file',
        value: {
          path: 'vol0:test.txt',
        },
      },
    ],
  },
  {
    method: 'pathInfo',
    description: 'Query Protocol V2 filesystem path info by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Path info',
        value: {
          path: 'vol0:firmware.bin',
        },
      },
    ],
  },
  {
    method: 'dirList',
    description: 'List Protocol V2 filesystem directory by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Root',
        value: {
          path: 'vol0:',
          depth: 0,
        },
      },
    ],
  },
  {
    method: 'dirMake',
    description: 'Create Protocol V2 filesystem directory by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Make dir',
        value: {
          path: 'vol0:test_dir',
        },
      },
    ],
  },
  {
    method: 'dirRemove',
    description: 'Remove Protocol V2 filesystem directory by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Remove dir',
        value: {
          path: 'vol0:test_dir',
        },
      },
    ],
  },
  {
    method: 'fileRead',
    description: 'Read a Protocol V2 filesystem file chunk by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Read chunk',
        value: {
          path: 'vol0:test.bin',
          offset: 0,
          totalSize: 0,
          chunkLen: 1400,
          uiPercentage: 0,
        },
      },
    ],
  },
  {
    method: 'fileWrite',
    description: 'Write a Protocol V2 filesystem file chunk by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Write text',
        value: {
          path: 'vol0:test.txt',
          offset: 0,
          totalSize: 23,
          data: 'Hello from expo-example',
          overwrite: true,
          append: false,
          uiPercentage: 0,
        },
      },
    ],
  },
  {
    method: 'fileDelete',
    description: 'Delete a Protocol V2 filesystem file by short alias.',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Delete file',
        value: {
          path: 'vol0:test.txt',
        },
      },
    ],
  },
];

export default api;
