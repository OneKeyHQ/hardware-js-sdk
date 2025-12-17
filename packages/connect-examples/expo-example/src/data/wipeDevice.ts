import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceWipe',
    description: 'Wipe a device',
    noDeviceIdReq: true,
  },
  {
    method: 'firmwareEraseEx',
    description: 'firmwareEraseEx',
    noDeviceIdReq: true,
  },
  {
    method: 'firmwareErase',
    description: 'firmwareErase',
    noDeviceIdReq: true,
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
      },
      {
        title: 'Boardloader',
        value: {
          reboot_type: 1,
        },
      },
      {
        title: 'BootLoader',
        value: {
          reboot_type: 2,
        },
      },
    ],
  },
];

export default api;
