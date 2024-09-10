import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceChangePin',
    description: 'Change pin of a device',
    noDeviceIdReq: true,
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
        expect: {
          common: {
            normal: {
              skip: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'deviceReset',
    description: 'Reset a device',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          requestPin: true,
        },
      },
      touch: {
        normal: {
          unknownMessage: true,
        },
      },
      classic1s: {
        normal: {
          unknownMessage: true,
        },
      },
      pro: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'deviceCancel',
    description: 'cancel device',
    expect: {
      common: {
        bootloader: {
          skip: true,
        },
      },
      classic1s: {
        normal: {
          skip: true,
        },
      },
    },
  },
  {
    method: 'deviceLock',
    description: 'lock device',
    expect: {
      common: {
        normal: {
          success: true,
        },
      },
    },
  },
  {
    method: 'deviceSettings',
    description: 'Get settings of a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Set Label',
        value: {
          label: 'My OneKey',
        },
        expect: {
          common: {
            normal: {
              requestPin: true,
            },
            bootloader: {
              unknownMessage: true,
            },
          },
        },
      },
      {
        title: 'Enable Passphrase',
        value: {
          usePassphrase: true,
        },
      },
      {
        title: 'Disable Passphrase',
        value: {
          usePassphrase: false,
        },
      },
      {
        title: 'Set PassphraseAlwaysOnDevice',
        value: {
          passphraseAlwaysOnDevice: true,
        },
      },
      {
        title: 'Set English language',
        value: {
          language: 'en_UK',
        },
      },
      {
        title: 'Set Chinese language',
        value: {
          language: 'zh_CN',
        },
      },
      {
        title: 'Set safetyChecks',
        value: {
          safetyChecks: 0,
        },
      },
    ],
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
        expect: {
          common: {
            normal: {
              requestPin: true,
            },
          },
          classic1s: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              unknownMessage: true,
            },
          },
          pro: {
            normal: {
              unknownMessage: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'deviceEndSession',
    description: 'end session',
    expect: {
      common: {
        normal: {
          success: true,
        },
      },
    },
  },
  {
    method: 'deviceSupportFeatures',
    description: 'Check if a device supports a feature',
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
    method: 'checkFirmwareRelease',
    description: 'Check firmware release of a device',
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
    method: 'checkBLEFirmwareRelease',
    description: 'Check BLE firmware release of a device',
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
    method: 'checkTransportRelease',
    description: 'Check transport release of a device',
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
    method: 'checkBootloaderRelease',
    description: 'Check bootloader release of a device',
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
    method: 'deviceUpdateReboot',
    description: 'Update and reboot a device',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          requestPin: true,
        },
        bootloader: {
          unknownMessage: true,
        },
      },
      mini: {
        normal: {
          skip: true,
        },
      },
      classic: {
        normal: {
          requestButton: true,
        },
      },
      classic1s: {
        normal: {
          requestButton: true,
        },
      },
    },
  },
  {
    method: 'deviceVerify',
    description: 'Verify a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Verify device',
        value: {
          dataHex: '0x1234567890',
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
    method: 'deviceWipe',
    description: 'Wipe a device',
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
    method: 'deviceBackup',
    description: 'Backup a device',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          requestPin: true,
        },
      },
      classic1s: {
        normal: {
          unknownMessage: true,
        },
      },
      touch: {
        normal: {
          unknownMessage: true,
        },
      },
      pro: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'deviceGetFirmwareHash',
    description: 'Get Firmware Hash',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'GetFirmwareHash',
        value: {
          challenge: '0x12345',
        },
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
    ],
  },
  {
    method: 'deviceUploadResource',
    description: 'deviceUploadResource',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'GetFirmwareHash',
        value: {
          suffix: 'png',
          dataHex: '010203',
          thumbnailDataHex: '010203',
          resType: 0,
          nftMetaData: '010203',
        },
        expect: {
          common: {
            normal: {
              skip: true,
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
    method: 'deviceRebootToBoardloader',
    description: 'DeviceRebootToBoardloader',
    noDeviceIdReq: true,
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
  {
    method: 'deviceUpdateBootloader',
    description: 'Touch、Pro Update bootloader of a device',
    noDeviceIdReq: true,
    expect: {
      mini: {
        normal: {
          success: true,
        },
        bootloader: {
          success: true,
        },
      },
      classic: {
        normal: {
          success: true,
        },
        bootloader: {
          success: true,
        },
      },
      classic1s: {
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
    method: 'firmwareUpdateV2',
    description: 'Update firmware of a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Update firmware',
        value: {
          updateType: 'firmware',
          platform: 'web',
        },
      },
      {
        title: 'Update ble firmware',
        value: {
          updateType: 'ble',
          platform: 'web',
        },
      },
    ],
    expect: {
      common: {
        normal: {
          requestPin: true,
        },
        bootloader: {
          skip: true,
        },
      },
      mini: {
        normal: {
          // You need to manually enter boot
          error: HardwareErrorCode.FirmwareUpdateManuallyEnterBoot,
        },
        bootloader: {
          skip: true,
        },
      },
      classic: {
        normal: {
          requestButton: true,
        },
      },
      classic1s: {
        normal: {
          requestButton: true,
        },
      },
    },
  },
  {
    method: 'checkAllFirmwareRelease',
    description: 'Check all firmware release of a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'checkAllFirmwareRelease',
        value: {
          platform: 'web',
        },
      },
    ],
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
    noDeviceIdReq: true,
  },
];

export default api;
