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
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
    method: 'deviceLoad',
    noDeviceIdReq: true,
    description: 'load device',
    presupposes: [
      {
        title: 'load',
        value: {
          mnemonics: 'all all all all all all all all all all all all',
          pin: '1111',
        },
      },
    ],
  },
  {
    method: 'deviceCancel',
    description: 'cancel device',
  },
  {
    method: 'deviceLock',
    description: 'lock device',
  },
  {
    method: 'deviceFlags',
    noDeviceIdReq: true,
    description: 'device set flags',
    presupposes: [
      {
        title: 'set flags',
        value: {
          flags: 1,
        },
      },
    ],
  },
  {
    method: 'deviceRecovery',
    noDeviceIdReq: true,
    description: 'device recovery',
    presupposes: [
      {
        title: 'set flags',
        value: {
          word_count: 12,
          pin_protection: true,
        },
      },
    ],
  },
  {
    method: 'deviceEndSession',
    description: 'end session',
  },
  {
    method: 'deviceRebootToBootloader',
    description: 'reboot to bootloader',
  },
  {
    method: 'deviceGetEntropy',
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
    noDeviceIdReq: true,
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
