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
    method: 'readSEPublicKey',
    description: 'readSEPublicKey',
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
    noDeviceIdReq: true,
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
  {
    method: 'deviceUnlockPath',
    description: 'UnlockPath',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'UnlockPath',
        value: {
          address_n: "m/44'/60'/0'/0/0",
          mac: '0x1234567',
        },
      },
    ],
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
    method: 'firmwareUpdateEmmcTest',
    description: 'firmwareUpdateEmmcTest',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'firmwareUpdateEmmcTest',
        value: {
          path: '0:firmware.bin',
          reboot_on_success: false,
        },
      },
    ],
  },
  {
    method: 'firmwareUploadTest',
    description: 'firmwareUploadTest',
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
  {
    method: 'selfTest',
    description: 'selfTest',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'firmwareUpdateEmmcTest',
        value: {
          payload: '0x12346',
        },
      },
    ],
  },
];

export default api;
