import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const classic1sPlugin: DevicePlugin = {
  deviceType: EDeviceType.Classic1s,

  ignoreMethod: [
    // DNX: not supported due to performance limitations
    'dnxGetAddress',
    'dnxSignTransaction',
  ],

  ignoreMethodPath: {
    evmGetAddress: [
      // "m/44'/60'/0'/0/2147483646", // performance limitation
      // "m/44'/60'/0'/0/2147483647", // performance limitation
      // "m/44'/61'/0'/0/2147483646", // performance limitation
      // "m/44'/61'/0'/0/2147483647", // performance limitation
    ],
  },

  // ========== Expected result overrides ==========
  expectedOverrides: {
    // Stellar: correct coin type is 148, but Classic 1S allows 60 (ETH) with safety checks off
    stellarSignTransaction: {
      '60': true,
    },
    // NEM: correct coin type is 43, but Classic 1S allows 60 (ETH) with safety checks off
    nemSignTransaction: {
      '60': true,
    },
    // Solana: Classic 1S returns Invalid params with correct coin type 501
    // TODO: investigate root cause
    solSignTransaction: {
      '501': false,
    },
  },
};
