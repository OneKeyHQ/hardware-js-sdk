import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceSpiFlashWrite',
    description: 'write to spi flash',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'write to spi flash',
        value: {
          address: 0,
          data: '0x1234567890',
        },
      },
    ],
  },
  {
    method: 'deviceSpiFlashRead',
    description: 'read from spi flash',
    presupposes: [
      {
        title: 'read to spi flash',
        value: {
          address: 0,
          len: 100,
        },
      },
    ],
  },
  {
    method: 'deviceInfoSettings',
    description: 'get device info settings',
    presupposes: [
      {
        title: 'read to spi flash',
        value: {
          serial_no: 'MI05W01202110111148040000078',
        },
      },
    ],
  },
  {
    method: 'deviceGetInfo',
    description: 'get device info',
  },
  {
    method: 'deviceReadSEPublicCert',
    description: 'read se public cert',
  },
  {
    method: 'deviceWriteSEPublicCert',
    description: 'write se public cert',
    presupposes: [
      {
        title: 'write se public cert',
        value: {
          public_cert: '1234567890',
        },
      },
    ],
  },
  {
    method: 'deviceSESignMessage',
    description: 'se sign message',
    presupposes: [
      {
        title: 'se sign message',
        value: {
          message: '0x1234567890',
        },
      },
    ],
  },
  {
    method: 'devicePing',
    description: 'ping device',
    presupposes: [
      {
        title: 'ping',
        value: {
          message: '0x1234567890',
          button_protection: false,
        },
      },
    ],
  },
  {
    method: 'deviceGetEntropy',
    description: 'device get entropy',
    presupposes: [
      {
        title: 'GetEntropy',
        value: {
          size: 12,
        },
      },
    ],
  },
  {
    method: 'deviceSdProtect',
    description: 'set sd protect',
    presupposes: [
      {
        title: 'setSdProtect',
        value: {
          operation: 1,
        },
      },
    ],
  },
  {
    method: 'deviceChangeWipeCode',
    description: 'Change Wipe Code',
    presupposes: [
      {
        title: 'ChangeWipeCode',
        value: {
          remove: true,
        },
      },
    ],
  },
  {
    method: 'deviceDoPreauthorized',
    description: 'DoPreauthorized',
  },
  {
    method: 'deviceCancelAuthorization',
    description: 'CancelAuthorization',
  },
  {
    method: 'setU2FCounter',
    description: 'setU2FCounter',
    presupposes: [
      {
        title: 'setU2FCounter',
        value: {
          u2f_counter: 1,
        },
      },
    ],
  },
  {
    method: 'getNextU2FCounter',
    description: 'getNextU2FCounter',
  },
];

export default api;
