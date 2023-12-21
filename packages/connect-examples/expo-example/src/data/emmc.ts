import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'emmcDirList',
    description: 'emmcDirList',
    noDeviceIdReq: true,
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
    description: 'read emmc file',
    presupposes: [
      {
        title: 'ReadEmmcFile',
        value: {
          file: {
            path: '/res/abc/a.txt',
            offset: 0,
            length: 100,
          },
        },
      },
    ],
  },
  {
    method: 'emmcFileWrite',
    description: 'Write emmc file',
    presupposes: [
      {
        title: 'WriteEmmcFile',
        value: {
          file: {
            path: '/res/abc/a.txt',
            offset: 0,
            length: 100,
          },
          overwrite: true,
          append: true,
        },
      },
    ],
  },
  {
    method: 'emmcFixPermission',
    description: 'Fix emmc permission',
  },
  {
    method: 'emmcPathInfo',
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
