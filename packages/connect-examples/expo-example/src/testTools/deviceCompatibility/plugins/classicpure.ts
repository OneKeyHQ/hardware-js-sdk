import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const classicPurePlugin: DevicePlugin = {
  deviceType: EDeviceType.ClassicPure,

  ignoreMethod: [
    // DNX: not supported due to performance limitations
    'dnxGetAddress',
    'dnxSignTransaction',
  ],

  ignoreMethodPath: {
    evmGetAddress: [
      // "m/44'/60'/0'/0/2147483646", // performance limitation
      // "m/44'/60'/0'/0/2147483647", // performance limitation
      // "m/44'/61'/0'/0/2147483646",
      // "m/44'/61'/0'/0/2147483647",
    ],
  },

  // ========== Expected result overrides ==========
  // Same firmware as Classic 1S
  expectedOverrides: {
    stellarSignTransaction: {
      '60': true,
    },
    nemSignTransaction: {
      '60': true,
    },
    solSignTransaction: {
      '501': false,
    },
  },
};
