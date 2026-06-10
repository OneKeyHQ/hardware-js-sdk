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
    method: 'deviceGetDeviceInfo',
    description:
      'Raw Protocol V2 DevGetDeviceInfo (no DeviceProfile wrapping, Pro2 only). Use the checkboxes to pick request targets/types.',
    noDeviceIdReq: true,
    checkboxGroups: [
      {
        title: 'Targets',
        fields: [
          { path: 'targets.hw', label: 'hw' },
          { path: 'targets.fw', label: 'fw' },
          { path: 'targets.bt', label: 'bt' },
          { path: 'targets.se1', label: 'se1' },
          { path: 'targets.se2', label: 'se2' },
          { path: 'targets.se3', label: 'se3' },
          { path: 'targets.se4', label: 'se4' },
          { path: 'targets.status', label: 'status' },
        ],
      },
      {
        title: 'Types',
        fields: [
          { path: 'types.version', label: 'version' },
          { path: 'types.build_id', label: 'build_id' },
          { path: 'types.hash', label: 'hash' },
          { path: 'types.specific', label: 'specific' },
        ],
      },
    ],
    presupposes: [
      {
        title: 'Basic',
        value: {
          targets: {
            hw: true,
            fw: true,
            bt: true,
            status: true,
          },
          types: {
            version: true,
            specific: true,
          },
        },
      },
      {
        title: 'Full',
        value: {
          targets: {
            hw: true,
            fw: true,
            bt: true,
            se1: true,
            se2: true,
            se3: true,
            se4: true,
            status: true,
          },
          types: {
            version: true,
            build_id: true,
            hash: true,
            specific: true,
          },
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
