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
      },
    ],
  },
  {
    method: 'emmcFixPermission',
    noDeviceIdReq: true,
    description: 'Fix emmc permission',
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
      },
    ],
  },
];

export default api;
