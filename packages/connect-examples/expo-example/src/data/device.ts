import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceChangePin',
    description: 'Change pin of a device',
    noDeviceIdReq: true,
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
    method: 'deviceReset',
    description: 'Reset a device',
    noDeviceIdReq: true,
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
    method: 'deviceSettings',
    description: 'Get settings of a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'Set Label',
        value: {
          label: 'My OneKey',
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
    method: 'deviceSupportFeatures',
    description: 'Check if a device supports a feature',
    noDeviceIdReq: true,
  },
  {
    method: 'checkFirmwareRelease',
    description: 'Check firmware release of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'checkBLEFirmwareRelease',
    description: 'Check BLE firmware release of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'checkTransportRelease',
    description: 'Check transport release of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'checkBootloaderRelease',
    description: 'Check bootloader release of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceUpdateReboot',
    description: 'Update and reboot a device',
    noDeviceIdReq: true,
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
      },
    ],
  },
  {
    method: 'deviceWipe',
    description: 'Wipe a device',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceBackup',
    description: 'Backup a device',
    noDeviceIdReq: true,
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
      },
    ],
  },
  {
    method: 'deviceRebootToBoardloader',
    description: 'DeviceRebootToBoardloader',
    noDeviceIdReq: true,
  },
];

export default api;
