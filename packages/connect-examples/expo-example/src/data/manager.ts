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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          mini: {
            normal: {
              error: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'deviceGetInfo',
    description: 'get device info',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      mini: {
        normal: {
          success: true,
        },
      },
    },
  },
  {
    method: 'readSEPublicKey',
    description: 'readSEPublicKey',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      mini: {
        normal: {
          success: true,
        },
      },
    },
  },
  {
    method: 'deviceReadSEPublicCert',
    description: 'read se public cert',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      touch: {
        normal: {
          requestPin: true,
        },
      },
      pro: {
        normal: {
          requestPin: true,
        },
      },
      mini: {
        normal: {
          success: true,
        },
      },
    },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          mini: {
            normal: {
              error: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
          mini: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              success: true,
            },
            bootloader: {
              success: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'deviceRebootToBootloader',
    description: 'reboot to bootloader',
    expect: {
      common: {
        normal: {
          requestButton: true,
        },
      },
      touch: {
        normal: {
          requestPin: true,
        },
      },
      pro: {
        normal: {
          requestPin: true,
        },
      },
    },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              requestButton: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'deviceDoPreauthorized',
    description: 'DoPreauthorized',
    expect: {
      common: {
        normal: {
          error: true,
        },
      },
    },
  },
  {
    method: 'deviceCancelAuthorization',
    description: 'CancelAuthorization',
    expect: {
      common: {
        normal: {
          success: true,
        },
      },
      touch: {
        normal: {
          requestPin: true,
        },
      },
      pro: {
        normal: {
          requestPin: true,
        },
      },
    },
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
        expect: {
          classic: {
            normal: {
              skip: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'firmwareUploadTest',
    description: 'firmwareUploadTest',
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
            bootloader: {
              error: true,
            },
          },
        },
      },
    ],
  },
];

export default api;
