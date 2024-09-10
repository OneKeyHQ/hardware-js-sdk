import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceWipe',
    description: 'Wipe a device',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          skip: true,
        },
        bootloader: {
          skip: true,
        },
      },
    },
  },
  {
    method: 'firmwareEraseEx',
    description: 'firmwareEraseEx',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          success: true,
        },
        bootloader: {
          skip: true,
        },
      },
    },
  },
  {
    method: 'firmwareErase',
    description: 'firmwareErase',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
        bootloader: {
          skip: true,
        },
      },
    },
  },
  {
    method: 'reboot',
    description: 'reboot',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Normal',
        value: {
          reboot_type: 0,
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              skip: true,
            },
          },
        },
      },
      {
        title: 'Boardloader',
        value: {
          reboot_type: 1,
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              skip: true,
            },
          },
        },
      },
      {
        title: 'BootLoader',
        value: {
          reboot_type: 2,
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              skip: true,
            },
          },
        },
      },
    ],
  },
];

export default api;
