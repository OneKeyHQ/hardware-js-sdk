import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'searchDevices',
    description: 'Search for devices',
    noConnIdReq: true,
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          success: true,
        },
        bootloader: {
          success: true,
        },
      },
    },
  },
  {
    method: 'getFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          success: true,
        },
        bootloader: {
          success: true,
        },
      },
    },
  },
  {
    method: 'getOnekeyFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'getPassphraseState',
    description: 'Get passphrase state of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'cancel',
    description: 'Cancel a request',
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
    method: 'checkBridgeStatus',
    description: 'Check bridge status of a device',
    noConnIdReq: true,
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
    method: 'checkBridgeRelease',
    description: 'Check bridge release of a device',
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
    method: 'getLogs',
    description: 'get logs',
    noDeviceIdReq: true,
    noConnIdReq: true,
  },
];

export default api;
