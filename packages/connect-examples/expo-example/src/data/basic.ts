import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'searchDevices',
    description: 'Search for devices',
    noConnIdReq: true,
    noDeviceIdReq: true,
  },
  {
    method: 'getDeviceState',
    description: 'Get canonical device state (supports V1 and V2 protocol)',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Cached state',
        value: {},
      },
      {
        title: 'Refresh versions',
        value: {
          refresh: ['identity', 'versions'],
        },
      },
      {
        title: 'Refresh verification',
        value: {
          refresh: ['identity', 'versions', 'verification'],
        },
      },
      {
        title: 'Explicit status refresh',
        value: {
          refresh: ['status'],
        },
      },
    ],
  },
  {
    method: 'getFeatures',
    description: 'Get legacy Features (Protocol V1 compatibility only)',
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
