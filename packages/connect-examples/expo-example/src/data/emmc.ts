import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'emmcDirMake',
    noDeviceIdReq: true,
    description: 'create emmc dir',
    presupposes: [
      {
        title: 'CreateEmmcDir',
        value: {
          path: '0:test/',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcDirList',
    noDeviceIdReq: true,
    description: 'emmcDirList',
    presupposes: [
      {
        title: 'ListEmmcDir',
        value: {
          path: '0:test/',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcDirRemove',
    noDeviceIdReq: true,
    description: 'remove emmc dir',
    presupposes: [
      {
        title: 'RemoveEmmcDir',
        value: {
          path: '0:test/',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcFileWrite',
    noDeviceIdReq: true,
    description: 'Write emmc file',
    presupposes: [
      {
        title: 'WriteEmmcFile',
        value: {
          file: {
            path: '0:test.txt',
            offset: 0,
            len: 100,
            data: '1234567890',
          },
          overwrite: true,
          append: true,
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcFileRead',
    noDeviceIdReq: true,
    description: 'read emmc file',
    presupposes: [
      {
        title: 'ReadEmmcFile',
        value: {
          file: {
            path: '0:test.txt',
            offset: 0,
            len: 100,
          },
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcPathInfo',
    noDeviceIdReq: true,
    description: 'emmcPathInfo',
    presupposes: [
      {
        title: 'emmcPathInfo',
        value: {
          path: '0:test.txt',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              error: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcFileDelete',
    noDeviceIdReq: true,
    description: 'remove emmc file',
    presupposes: [
      {
        title: 'RemoveEmmcFile',
        value: {
          path: '0:test.txt',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              success: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcFixPermission',
    noDeviceIdReq: true,
    description: 'Fix emmc permission,（Cause emmc error, remember to restart device）',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      touch: {
        normal: {
          unknownMessage: true,
        },
        bootloader: {
          success: true,
        },
      },
      pro: {
        normal: {
          unknownMessage: true,
        },
        bootloader: {
          success: true,
        },
      },
    },
  },
];

export default api;
