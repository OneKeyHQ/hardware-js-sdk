import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'deviceChangePin',
    description: 'Change pin of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceReset',
    description: 'Reset a device',
    noDeviceIdReq: true,
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
    method: 'deviceUpdateBootloader',
    description: 'Touch、Pro Update bootloader of a device',
    noDeviceIdReq: true,
  },
];

export default api;
