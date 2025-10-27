import { airGapUrUtils, getAirGapSdk } from '../../sdk';
import { OneKeyRequestDeviceQR } from '../../sdk/OneKeyRequestDeviceQR';
import { AirGapEthSignRequestEvm, EAirGapDataTypeEvm } from '../../sdk/types';

import type {
  IAirGapAccount,
  IAirGapMultiAccounts,
  IAirGapSignatureBtc,
  IAirGapSignatureEvm,
  IAirGapSignatureSol,
} from '../../sdk/types';
import type { IOneKeyRequestDeviceQRData } from '../../sdk/OneKeyRequestDeviceQR';
import type { AirGapUR, IAirGapUrJson } from '../../sdk/AirGapUR';

export type AirGapParsedResult =
  | {
      kind: 'onekey-app-call-device';
      data: IOneKeyRequestDeviceQRData;
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'crypto-hdkey';
      account: IAirGapAccount;
      derivedAddresses: string[];
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'crypto-multi-accounts';
      accounts: IAirGapMultiAccounts;
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'eth-sign-request';
      request: {
        path: string;
        xfp: string;
        requestId?: string;
        origin?: string;
        dataType: EAirGapDataTypeEvm;
        rawHex: string;
      };
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'eth-signature';
      signature: (IAirGapSignatureEvm & { address?: string }) & {
        r: string;
        s: string;
        v: string;
      };
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'crypto-psbt';
      psbtHex: string;
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'btc-signature';
      signature: IAirGapSignatureBtc;
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'sol-signature';
      signature: IAirGapSignatureSol;
      urJson: IAirGapUrJson;
    }
  | {
      kind: 'unknown';
      urType: string;
      urJson: IAirGapUrJson;
      rawHex: string;
    };

function deriveEthAddressesFromAccount(account: IAirGapAccount): string[] {
  const sdk = getAirGapSdk();
  const addresses: string[] = [];
  if (!account.extendedPublicKey) {
    return addresses;
  }
  try {
    for (let i = 0; i < 3; i += 1) {
      const derivePath = `m/0/${i}`;
      const address = sdk.eth.generateAddressFromXpub({
        xpub: account.extendedPublicKey,
        derivePath,
      });
      addresses.push(address);
    }
  } catch (error) {
    console.warn('deriveEthAddressesFromAccount failed', error);
  }
  return addresses;
}

export function parseAirGapUr(ur: AirGapUR): AirGapParsedResult {
  const sdk = getAirGapSdk();
  const urJson = airGapUrUtils.urToJson({ ur });
  const normalizedType = ur.type.toLowerCase();

  const UR_TYPES = {
    onekeyCallDevice: 'onekey-app-call-device',
    cryptoHdKey: 'crypto-hdkey',
    cryptoMultiAccounts: 'crypto-multi-accounts',
    ethSignRequest: 'eth-sign-request',
    ethSignature: 'eth-signature',
    cryptoPsbt: 'crypto-psbt',
    btcSignature: 'btc-signature',
    solSignature: 'sol-signature',
  } as const;

  try {
    if (normalizedType === UR_TYPES.onekeyCallDevice) {
      const request = OneKeyRequestDeviceQR.fromUR(ur);
      return {
        kind: 'onekey-app-call-device',
        data: request.data,
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.cryptoHdKey) {
      const account = sdk.parseHDKey(ur);
      return {
        kind: 'crypto-hdkey',
        account,
        derivedAddresses: deriveEthAddressesFromAccount(account),
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.cryptoMultiAccounts) {
      const accounts = sdk.parseMultiAccounts(ur);
      return {
        kind: 'crypto-multi-accounts',
        accounts,
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.ethSignRequest) {
      const request = AirGapEthSignRequestEvm.fromCBOR(ur.cbor);
      return {
        kind: 'eth-sign-request',
        request: {
          path: request.getDerivationPath(),
          xfp: request.getSourceFingerprint().toString('hex'),
          requestId: request.getRequestId()?.toString('hex'),
          origin: request.getOrigin(),
          dataType: request.getDataType(),
          rawHex: request.getSignData().toString('hex'),
        },
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.ethSignature) {
      const signature = sdk.eth.parseSignature(ur) as IAirGapSignatureEvm & { address?: string };
      const signatureHex = signature.signature;
      return {
        kind: 'eth-signature',
        signature: {
          ...signature,
          r: signatureHex.slice(0, 64),
          s: signatureHex.slice(64, 128),
          v: signatureHex.slice(128),
        },
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.cryptoPsbt) {
      const psbtHex = sdk.btc.parsePSBT(ur);
      return {
        kind: 'crypto-psbt',
        psbtHex,
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.btcSignature) {
      const signature = sdk.btc.parseSignature(ur);
      return {
        kind: 'btc-signature',
        signature,
        urJson,
      };
    }

    if (normalizedType === UR_TYPES.solSignature) {
      const signature = sdk.sol.parseSignature(ur);
      return {
        kind: 'sol-signature',
        signature,
        urJson,
      };
    }
  } catch (error) {
    console.warn('parseAirGapUr error', error);
  }

  return {
    kind: 'unknown',
    urType: ur.type,
    urJson,
    rawHex: ur.cbor.toString('hex'),
  };
}
