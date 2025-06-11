import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "device",
  name: "Device",
  description: "Device management operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#10B981"/></svg>`,
  color: "#10B981",
  category: "device" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'deviceChangePin',
    description: 'Change pin of a device',
    noDeviceIdReq: true,
  },
  // {
  //   method: 'deviceReset',
  //   description: 'Reset a device',
  //   noDeviceIdReq: true,
  // },
  // {
  //   method: 'deviceSettings',
  //   description: 'Get settings of a device',
  //   noDeviceIdReq: true,
  //   presupposes: [
  //     {
  //       title: 'Set Label',
  //       value: {
  //         label: 'My OneKey',
  //       },
  //     },
  //     {
  //       title: 'Enable Passphrase',
  //       value: {
  //         usePassphrase: true,
  //       },
  //     },
  //     {
  //       title: 'Disable Passphrase',
  //       value: {
  //         usePassphrase: false,
  //       },
  //     },
  //     {
  //       title: 'Set PassphraseAlwaysOnDevice',
  //       value: {
  //         passphraseAlwaysOnDevice: true,
  //       },
  //     },
  //     {
  //       title: 'Set English language',
  //       value: {
  //         language: 'en_UK',
  //       },
  //     },
  //     {
  //       title: 'Set Chinese language',
  //       value: {
  //         language: 'zh_CN',
  //       },
  //     },
  //     {
  //       title: 'Set safetyChecks',
  //       value: {
  //         safetyChecks: 0,
  //       },
  //     },
  //   ],
  // },
  {
    method: 'deviceCancel',
    description: 'cancel device',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceLock',
    description: 'lock device',
    noDeviceIdReq: true,
  },
  // {
  //   method: 'deviceSupportFeatures',
  //   description: 'Check if a device supports a feature',
  //   noDeviceIdReq: true,
  // },
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
    method: 'checkBridgeRelease',
    description: 'Check bridge release of a device',
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
  // {
  //   method: 'deviceVerify',
  //   description: 'Verify a device',
  //   noDeviceIdReq: true,
  //   presupposes: [
  //     {
  //       title: 'Verify device',
  //       value: {
  //         dataHex: '0x1234567890',
  //       },
  //     },
  //   ],
  // },
  // {
  //   method: 'deviceWipe',
  //   description: 'Wipe a device',
  //   noDeviceIdReq: true,
  // },
  {
    method: 'deviceRebootToBoardloader',
    description: 'DeviceRebootToBoardloader',
    noDeviceIdReq: true,
  },
  {
    method: 'deviceUpdateBootloader',
    description: 'Touch、Pro Update bootloader of a device',
    noDeviceIdReq: true,
  },
  // {
  //   method: 'firmwareUpdateV2',
  //   description: 'Update firmware of a device',
  //   noDeviceIdReq: true,
  //   presupposes: [
  //     {
  //       title: 'Update firmware',
  //       value: {
  //         updateType: 'firmware',
  //         platform: 'web',
  //       },
  //     },
  //     {
  //       title: 'Update ble firmware',
  //       value: {
  //         updateType: 'ble',
  //         platform: 'web',
  //       },
  //     },
  //   ],
  // },
  {
    method: 'checkAllFirmwareRelease',
    description: 'Check all firmware release of a device',
    noDeviceIdReq: true,
    presupposes: [
      {
        title: 'checkAllFirmwareRelease',
        value: {
          checkBridgeRelease: true,
        },
      },
    ],
  },
  // {
  //   method: 'setU2FCounter',
  //   description: 'setU2FCounter',
  //   noDeviceIdReq: true,
  //   presupposes: [
  //     {
  //       title: 'setU2FCounter',
  //       value: {
  //         u2f_counter: 1,
  //       },
  //     },
  //   ],
  // },
  // {
  //   method: 'getNextU2FCounter',
  //   description: 'getNextU2FCounter',
  //   noDeviceIdReq: true,
  // },
  {
    method: 'deviceGetInfo',
    description: 'get device info',
  },
  // {
  //   method: 'deviceInfoSettings',
  //   noDeviceIdReq: true,
  //   description: 'get device info settings',
  //   presupposes: [
  //     {
  //       title: 'read to spi flash',
  //       value: {
  //         serial_no: 'MI05W01202110111148040000078',
  //       },
  //     },
  //   ],
  // },
  // {
  //   method: 'deviceReadSEPublicCert',
  //   description: 'read se public cert',
  // },
  // {
  //   method: 'deviceWriteSEPrivateKey',
  //   noDeviceIdReq: true,
  //   description: 'write se private key',
  //   presupposes: [
  //     {
  //       title: 'write se private key',
  //       value: {
  //         private_key: '013568656419313e64d4352f640cc2ff9f89d45d9dd8ab9229789714e4481245',
  //       },
  //     },
  //   ],
  // },
  // {
  //   method: 'deviceWriteSEPublicCert',
  //   noDeviceIdReq: true,
  //   description: 'write se public cert',
  //   presupposes: [
  //     {
  //       title: 'write se public cert',
  //       value: {
  //         public_cert:
  //           '308201693082010ea003020102020103300a06082a8648ce3d0403023065310b3009060355040613025553310e300c06035504080c055374617465310d300b06035504070c044369747931153013060355040a0c0c4f7267616e697a6174696f6e310d300b060355040b0c04556e69743111300f06035504030c086661632d74657374301e170d3234313032313037313034315a170d3434313031363037313034315a30163114301206035504030c0b50524234334a30303033413059301306072a8648ce3d020106082a8648ce3d03010703420004d909a201f985455e38bc703e1adf4347a521892f99d52e95b783b2aeaaa6a4ba5068a33557cdbb63990ef695331178832c347af7845b0088e2c45e3395d6eac9300a06082a8648ce3d0403020349003046022100f913025f6b0ffb855c7a044e83a9f9050b8a5381afaa2293ca25aa422ac11525022100fd3de51cc26ae84e4bf65f463b1f3a881206c42db9bb25027ce9426aec48a064',
  //       },
  //     },
  //   ],
  // },
  // {
  //   method: 'deviceSESignMessage',
  //   noDeviceIdReq: true,
  //   description: 'se sign message',
  //   presupposes: [
  //     {
  //       title: 'se sign message',
  //       value: {
  //         message: '0x1234567890',
  //       },
  //     },
  //   ],
  // },
];


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
