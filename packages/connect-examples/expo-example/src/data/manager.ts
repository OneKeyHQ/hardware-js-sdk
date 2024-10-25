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
    method: 'deviceWriteSEPrivateKey',
    noDeviceIdReq: true,
    description: 'write se private key',
    presupposes: [
      {
        title: 'write se private key',
        value: {
          private_key: '013568656419313e64d4352f640cc2ff9f89d45d9dd8ab9229789714e4481245',
        },
      },
    ],
  },
  {
    method: 'deviceWriteSEPublicCert',
    noDeviceIdReq: true,
    description: 'write se public cert',
    presupposes: [
      {
        title: 'write se public cert',
        value: {
          public_cert:
            '308201693082010ea003020102020103300a06082a8648ce3d0403023065310b3009060355040613025553310e300c06035504080c055374617465310d300b06035504070c044369747931153013060355040a0c0c4f7267616e697a6174696f6e310d300b060355040b0c04556e69743111300f06035504030c086661632d74657374301e170d3234313032313037313034315a170d3434313031363037313034315a30163114301206035504030c0b50524234334a30303033413059301306072a8648ce3d020106082a8648ce3d03010703420004d909a201f985455e38bc703e1adf4347a521892f99d52e95b783b2aeaaa6a4ba5068a33557cdbb63990ef695331178832c347af7845b0088e2c45e3395d6eac9300a06082a8648ce3d0403020349003046022100f913025f6b0ffb855c7a044e83a9f9050b8a5381afaa2293ca25aa422ac11525022100fd3de51cc26ae84e4bf65f463b1f3a881206c42db9bb25027ce9426aec48a064',
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
