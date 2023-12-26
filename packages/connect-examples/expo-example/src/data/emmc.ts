import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'emmcDirList',
    noDeviceIdReq: true,
    description: 'emmcDirList',
    presupposes: [
      {
        title: 'ListEmmcDir',
        value: {
          path: '/res',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            bootloader: {
              error: true,
            },
          },
          pro: {
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcDirMake',
    noDeviceIdReq: true,
    description: 'create emmc dir',
    presupposes: [
      {
        title: 'CreateEmmcDir',
        value: {
          path: '/res/abc',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            bootloader: {
              erro: true,
              success: true,
            },
          },
          pro: {
            bootloader: {
              erro: true,
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
          path: '/res/abc',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            bootloader: {
              success: true,
              error: true,
            },
          },
          pro: {
            bootloader: {
              success: true,
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
          path: '/res/abc/a.txt',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            bootloader: {
              error: true,
            },
          },
          pro: {
            bootloader: {
              error: true,
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
            path: '0:firmware.txt',
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
            bootloader: {
              error: true,
              success: true,
            },
          },
          pro: {
            bootloader: {
              error: true,
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
            path: '0:firmware.txt',
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
            bootloader: {
              error: true,
            },
          },
          pro: {
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'emmcFixPermission',
    noDeviceIdReq: true,
    description: 'Fix emmc permission',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      touch: {
        bootloader: {
          success: true,
        },
      },
      pro: {
        bootloader: {
          success: true,
        },
      },
    },
  },
  {
    method: 'emmcPathInfo',
    noDeviceIdReq: true,
    description: 'emmcPathInfo',
    presupposes: [
      {
        title: 'emmcPathInfo',
        value: {
          path: '/res/abc/a.txt',
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            bootloader: {
              error: true,
            },
          },
          pro: {
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
];

export default api;
