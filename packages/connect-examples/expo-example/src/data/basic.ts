import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'searchDevices',
    description: 'Search for devices',
    noConnIdReq: true,
    noDeviceIdReq: true,
  },
  {
    method: 'getFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'getOnekeyFeatures',
    description: 'Get onekey features of a device(For Pro)',
    noDeviceIdReq: true,
  },
  {
    method: 'getDeviceInfo',
    description: 'Get unified device info (supports V1 and V2 protocol)',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Basic',
        value: {
          scope: 'basic',
        },
      },
      {
        title: 'Versions',
        value: {
          scope: 'versions',
        },
      },
      {
        title: 'Verify',
        value: {
          scope: 'verify',
        },
      },
      {
        title: 'Full (with raw)',
        value: {
          scope: 'full',
          includeRaw: true,
        },
      },
    ],
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
  },
  {
    method: 'checkBridgeStatus',
    description: 'Check bridge status of a device',
    noConnIdReq: true,
    noDeviceIdReq: true,
  },
  {
    method: 'checkBridgeRelease',
    description: 'Check bridge release of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'getLogs',
    description: 'get logs',
    noDeviceIdReq: true,
    noConnIdReq: true,
  },
];

export default api;
