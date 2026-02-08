import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const classicPlugin: DevicePlugin = {
  deviceType: EDeviceType.Classic,
  ignoreMethod: [
    // ========== New chains (firmware not supported) ==========
    'benfenGetAddress',

    // Alephium
    'alephiumGetAddress',
    'alephiumSignTransaction',
    'alephiumSignMessage',

    // SCDO
    'scdoGetAddress',
    'scdoSignTransaction',
    'scdoSignMessage',

    // TON
    'tonGetAddress',
    'tonSignMessage',
    'tonSignProof',

    // NEO
    'neoGetAddress',
    'neoSignTransaction',

    // ========== New features (firmware version not supported) ==========
    // BTC PSBT signing
    'btcSignPsbt',

    // Aptos Sign-In Message
    'aptosSignInMessage',

    // ========== Known issues (pending fix) ==========
    // TODO: aptosSignTransaction causes USB transfer error on Classic
    // Error: "Failed to execute 'transferIn' on 'USBDevice': A transfer error has occurred."
    // Likely firmware bug, needs firmware team investigation
    // Date: 2026-02-06
    'aptosSignTransaction',

    // Tron Sign Message V2
    'tronSignMessage',

    // ========== Device-specific features ==========
    'deviceRebootToBoardloader',
  ],

  // ========== Param condition filters ==========
  ignoreMethodParams: {
    // EIP-7702: check if transaction contains authorizationList
    evmSignTransaction: params => {
      if (params?.transaction?.authorizationList) {
        return 'EIP-7702 (authorizationList) is not supported on Classic';
      }
      return false;
    },
  },

  // ========== Expected result overrides ==========
  // Classic firmware shows warning for wrong coin type, user can confirm to proceed
  // Different from Classic 1S behavior (1S rejects directly)
  expectedOverrides: {
    // Stellar: correct coin type is 148, but Classic allows 60 (ETH) after user confirmation
    stellarSignTransaction: {
      '60': true,
    },
    // NEM: correct coin type is 43, but Classic allows 60 (ETH) after user confirmation
    nemSignTransaction: {
      '60': true,
    },
    // Solana: Classic returns Invalid params with correct coin type 501
    // TODO: investigate root cause, may be firmware-specific path depth requirement
    // Date: 2026-02-06
    solSignTransaction: {
      '501': false,
    },
  },
};
