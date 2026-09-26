import { generateAddressFromXpub } from '@keystonehq/bc-ur-registry-eth';
import { Curve, KeystoneSDK, QRHardwareCallVersion, UR } from '@keystonehq/keystone-sdk';
import bs58check from 'bs58check';
import * as bitcoin from 'bitcoinjs-lib';
import HDKey from 'hdkey';
import { parse as uuidParse, stringify as uuidStringify } from 'uuid';
import { parseBip32MasterFingerprint } from '@onekeyfe/hwk-adapter-core';

import { TronSignRequest, TronSignType } from './TronSignRequest';
import { TronSignature } from './TronSignature';

import type {
  BtcScriptType,
  KeystoneBtcSignRequestAccount,
  KeystoneBtcSignatureResult,
  KeystoneEthSignRequestInput,
  KeystoneEthSignatureResult,
  KeystoneKeyDerivationRequestInput,
  KeystoneParsedAccount,
  KeystoneParsedMultiAccounts,
  KeystoneSolSignRequestInput,
  KeystoneSolSignatureResult,
  KeystoneTronSignRequestInput,
  KeystoneTronSignatureResult,
  KeystoneUr,
} from './types';

/** TRON's own address-version byte, prepended before base58check encoding. */
const TRON_ADDRESS_PREFIX = 0x41;

function stripHexPrefix(hex: string): string {
  return hex.replace(/^0x/i, '');
}

const ETH_DATA_TYPE = {
  transaction: 1,
  typedData: 2,
  personalMessage: 3,
  typedTransaction: 4,
} as const;

const DERIVATION_CURVE = {
  secp256k1: Curve.secp256k1,
  ed25519: Curve.ed25519,
} as const;

function toSdkUr(ur: KeystoneUr): UR {
  return new UR(Buffer.from(ur.urData, 'hex'), ur.urType);
}

function fromSdkUr(ur: UR): KeystoneUr {
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

/**
 * r(32) | s(32) | v. A legacy EIP-155 tx's v is 35 + 2 * chainId + recId, so it
 * outgrows one byte from chainId 110 on; a short answer must still fail here.
 */
function splitEvmSignature(hex: string): { r: string; s: string; v: string } {
  if (hex.length < 130 || hex.length % 2 !== 0) {
    throw new Error(
      `Keystone returned a ${hex.length / 2}-byte signature; expected at least 65 bytes (r|s|v)`
    );
  }
  return { r: hex.slice(0, 64), s: hex.slice(64, 128), v: hex.slice(128) };
}

/** Same short-answer guard as `splitEvmSignature` for chains whose signature is one fixed-length blob. */
function requireSignatureBytes(hex: string, expectedBytes: number, chain: string): string {
  if (hex.length !== expectedBytes * 2) {
    throw new Error(
      `Keystone returned a ${
        hex.length / 2
      }-byte ${chain} signature; expected ${expectedBytes} bytes`
    );
  }
  return hex;
}

// The registry decodes a missing mfp as four zero bytes; that is never a usable wallet identity.
const MISSING_MASTER_FINGERPRINT = '00000000';

function requireBip32MasterFingerprint(value: unknown): string {
  const fingerprint = parseBip32MasterFingerprint(value);
  if (!fingerprint || fingerprint === MISSING_MASTER_FINGERPRINT) {
    throw new Error('Keystone master fingerprint must be exactly 4 bytes (8 hex characters)');
  }
  return fingerprint;
}

function toParsedAccount(key: ReturnType<KeystoneSDK['parseHDKey']>): KeystoneParsedAccount {
  return {
    chain: key.chain,
    path: key.path,
    publicKey: key.publicKey,
    extendedPublicKey: key.extendedPublicKey,
    xfp: key.xfp ? requireBip32MasterFingerprint(key.xfp) : undefined,
    name: key.name,
  };
}

/** Relative derivation path in the `m/`-prefixed form the xpub helpers expect. */
function relativeHdPath(relativeDerivePath: string): string {
  return `m/${relativeDerivePath.replace(/^m\//i, '')}`;
}

/**
 * Single touch point with `@keystonehq/keystone-sdk`, shared by QR and USB. Uses the bare
 * constructor: `KeystoneSDK.create()` fetches remote config at call time.
 */
export class KeystoneUrEngine {
  private readonly sdk: KeystoneSDK;

  constructor(origin = 'OneKey') {
    this.sdk = new KeystoneSDK({ origin });
  }

  // --- Account sync (device-initiated export or KeyDerivation response) ---

  parseMultiAccounts(ur: KeystoneUr): KeystoneParsedMultiAccounts {
    const parsed = this.sdk.parseMultiAccounts(toSdkUr(ur));
    return {
      masterFingerprint: requireBip32MasterFingerprint(parsed.masterFingerprint),
      device: parsed.device,
      deviceId: parsed.deviceId,
      deviceVersion: parsed.deviceVersion,
      accounts: parsed.keys.map(toParsedAccount),
    };
  }

  parseHDKey(ur: KeystoneUr): KeystoneParsedAccount {
    return toParsedAccount(this.sdk.parseHDKey(toSdkUr(ur)));
  }

  /**
   * Builds a KeyDerivation request. `version: V1` is required: firmware validates V0 (the SDK
   * default) as Cardano-only and rejects other paths with `PRS_PARSING_ERROR`.
   */
  buildKeyDerivationRequest(input: KeystoneKeyDerivationRequestInput): KeystoneUr {
    const ur = this.sdk.generateKeyDerivationCall({
      schemas: input.schemas.map(schema => ({
        path: schema.path,
        curve: DERIVATION_CURVE[schema.curve ?? 'secp256k1'],
      })),
      origin: input.origin,
      version: QRHardwareCallVersion.V1,
    });
    return fromSdkUr(ur);
  }

  /**
   * Normalizes `crypto-multi-accounts` and the single-key `crypto-hdkey` some firmware returns. The
   * hdkey source fingerprint is the mfp only because every request here derives from the seed.
   */
  parseAccountResponse(ur: KeystoneUr): KeystoneParsedMultiAccounts {
    if (ur.urType === 'crypto-hdkey') {
      const account = this.parseHDKey(ur);
      if (!account.xfp) {
        throw new Error('Keystone crypto-hdkey response is missing its source fingerprint');
      }
      return {
        masterFingerprint: requireBip32MasterFingerprint(account.xfp),
        accounts: [account],
      };
    }
    return this.parseMultiAccounts(ur);
  }

  // --- EVM ---

  buildEthSignRequest(input: KeystoneEthSignRequestInput): KeystoneUr {
    const ur = this.sdk.eth.generateSignRequest({
      requestId: input.requestId,
      signData: input.unsignedTxHex,
      dataType: ETH_DATA_TYPE[input.dataType],
      path: input.path,
      xfp: input.xfp,
      chainId: input.chainId,
      address: input.address,
      origin: input.origin,
    });
    return fromSdkUr(ur);
  }

  parseEthSignature(ur: KeystoneUr): KeystoneEthSignatureResult {
    const signature = this.sdk.eth.parseSignature(toSdkUr(ur));
    return { requestId: signature.requestId, ...splitEvmSignature(signature.signature) };
  }

  /** Derives an EVM address offline; `relativeDerivePath` is relative to the xpub, e.g. `'0/0'`. */
  deriveEvmAddressFromXpub(xpub: string, relativeDerivePath: string): string {
    return generateAddressFromXpub(xpub, relativeHdPath(relativeDerivePath));
  }

  // --- BTC (PSBT transaction signing + plain message signing) ---

  /**
   * `CryptoHDKey` always emits mainnet xpub version bytes (`0488B21E`), so `hdkey` parses it as is.
   * `p2tr` needs an ECC lib for BIP-341 tweaking, not wired here.
   */
  deriveBtcAddressFromXpub(
    xpub: string,
    relativeDerivePath: string,
    scriptType: BtcScriptType
  ): string {
    const node = HDKey.fromExtendedKey(xpub).derive(relativeHdPath(relativeDerivePath));
    if (!node.publicKey) throw new Error('HDKey derivation did not produce a public key');
    return this.deriveBtcAddressFromPublicKey(
      Buffer.from(node.publicKey).toString('hex'),
      scriptType
    );
  }

  deriveBtcAddressFromPublicKey(publicKeyHex: string, scriptType: BtcScriptType): string {
    const pubkey = Buffer.from(stripHexPrefix(publicKeyHex), 'hex');
    const network = bitcoin.networks.bitcoin;

    switch (scriptType) {
      case 'p2pkh': {
        const { address } = bitcoin.payments.p2pkh({ pubkey, network });
        if (!address) throw new Error('Failed to derive a P2PKH address from this public key');
        return address;
      }
      case 'p2sh-p2wpkh': {
        const { address } = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({ pubkey, network }),
          network,
        });
        if (!address)
          throw new Error('Failed to derive a P2SH-P2WPKH address from this public key');
        return address;
      }
      case 'p2wpkh': {
        const { address } = bitcoin.payments.p2wpkh({ pubkey, network });
        if (!address) throw new Error('Failed to derive a P2WPKH address from this public key');
        return address;
      }
      case 'p2tr':
        throw new Error(
          'BTC P2TR (taproot) address derivation is not supported yet — needs an elliptic-curve library for BIP-341 tweaking'
        );
      default: {
        const exhaustive: never = scriptType;
        throw new Error(`Unsupported BTC script type: ${String(exhaustive)}`);
      }
    }
  }

  buildBtcPsbtRequest(unsignedPsbtHex: string): KeystoneUr {
    const ur = this.sdk.btc.generatePSBT(Buffer.from(unsignedPsbtHex, 'hex'));
    return fromSdkUr(ur);
  }

  /** Returns the hex-encoded (possibly still-unsigned-in-part) PSBT the device replied with. */
  parseBtcPsbt(ur: KeystoneUr): string {
    return this.sdk.btc.parsePSBT(toSdkUr(ur));
  }

  buildBtcMessageSignRequest(params: {
    requestId: string;
    /** Hex, no 0x prefix. */
    messageHex: string;
    accounts: KeystoneBtcSignRequestAccount[];
    origin?: string;
  }): KeystoneUr {
    const ur = this.sdk.btc.generateSignRequest({
      requestId: params.requestId,
      signData: params.messageHex,
      dataType: 1, // BtcSignRequest.DataType.message; PSBT signing never goes through this path.
      accounts: params.accounts,
      origin: params.origin,
    });
    return fromSdkUr(ur);
  }

  parseBtcSignature(ur: KeystoneUr): KeystoneBtcSignatureResult {
    const signature = this.sdk.btc.parseSignature(toSdkUr(ur));
    return {
      requestId: signature.requestId,
      publicKey: signature.publicKey,
      signature: signature.signature,
    };
  }

  // --- SOL ---

  buildSolSignRequest(input: KeystoneSolSignRequestInput): KeystoneUr {
    const ur = this.sdk.sol.generateSignRequest({
      requestId: input.requestId,
      signData: input.unsignedPayloadHex,
      dataType: input.dataType === 'transaction' ? 1 : 2,
      path: input.path,
      xfp: input.xfp,
      address: input.address,
      origin: input.origin,
    });
    return fromSdkUr(ur);
  }

  parseSolSignature(ur: KeystoneUr): KeystoneSolSignatureResult {
    const signature = this.sdk.sol.parseSignature(toSdkUr(ur));
    return {
      requestId: signature.requestId,
      signature: requireSignatureBytes(signature.signature, 64, 'SOL'),
    };
  }

  // --- TRON ---

  /**
   * Keystone's native tron-sign-request/tron-signature pair (bare signature).
   * `sdk.tron` from keystone-sdk is the older protobuf envelope; not used.
   */
  buildTronSignRequest(input: KeystoneTronSignRequestInput): KeystoneUr {
    const request = new TronSignRequest({
      requestId: Buffer.from(uuidParse(input.requestId) as Uint8Array),
      signData: Buffer.from(stripHexPrefix(input.rawTxHex), 'hex'),
      signType: input.signType ?? TronSignType.Transaction,
      derivationPath: TronSignRequest.parsePath(input.path, input.xfp),
      origin: input.origin,
    });
    return fromSdkUr(request.toUR());
  }

  parseTronSignature(ur: KeystoneUr): KeystoneTronSignatureResult {
    if (ur.urType !== 'tron-signature') {
      throw new Error(`Expected a tron-signature UR, got ${ur.urType}`);
    }
    const signature = TronSignature.fromCBOR(Buffer.from(ur.urData, 'hex'));
    const requestId = signature.getRequestId();
    return {
      requestId: requestId ? uuidStringify(requestId) : undefined,
      signature: requireSignatureBytes(signature.getSignature().toString('hex'), 65, 'TRON'),
    };
  }

  /**
   * TRON uses the same 20 address bytes as EVM (Keystone's `formatAddress()`), re-encoded as
   * base58check with the `0x41` version byte.
   */
  deriveTronAddressFromXpub(xpub: string, relativeDerivePath: string): string {
    const evmStyleHex = generateAddressFromXpub(xpub, relativeHdPath(relativeDerivePath)) as string;
    const addressBytes = Buffer.concat([
      Buffer.from([TRON_ADDRESS_PREFIX]),
      Buffer.from(stripHexPrefix(evmStyleHex), 'hex'),
    ]);
    return bs58check.encode(addressBytes);
  }

  /** Decodes an xpub's BIP-32 fields; `parentFingerprint` is the parent key's, not the mfp. */
  parseXpubMeta(xpub: string): {
    publicKey: string;
    chainCode: string;
    depth: number;
    parentFingerprint: number;
  } {
    // Decoded by hand because `@types/hdkey` lacks depth/parentFingerprint. BIP-32 layout:
    //   [0..4) version | [4] depth | [5..9) parentFingerprint
    //   [9..13) childNumber | [13..45) chainCode | [45..78) publicKey
    const raw = Buffer.from(bs58check.decode(xpub));
    if (raw.length !== 78) {
      throw new Error(`Keystone xpub did not decode to a 78-byte BIP-32 key (got ${raw.length})`);
    }
    return {
      publicKey: raw.subarray(45, 78).toString('hex'),
      chainCode: raw.subarray(13, 45).toString('hex'),
      depth: raw.readUInt8(4),
      parentFingerprint: raw.readUInt32BE(5),
    };
  }
}
