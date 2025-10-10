import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

export const classicPurePlugin: DevicePlugin = {
  deviceType: EDeviceType.ClassicPure,

  ignoreMethod: ['dnxGetAddress'],

  ignoreMethodPath: {
    evmGetAddress: [
      // "m/44'/60'/0'/0/2147483646", // 性能限制
      // "m/44'/60'/0'/0/2147483647", // 性能限制
      // "m/44'/61'/0'/0/2147483646",
      // "m/44'/61'/0'/0/2147483647",
    ],
  },
};
