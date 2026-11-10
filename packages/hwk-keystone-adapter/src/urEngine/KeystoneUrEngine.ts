import { generateAddressFromXpub } from '@keystonehq/bc-ur-registry-eth';
import {
  CryptoAccount,
  CryptoHDKey,
  CryptoMultiAccounts,
  ScriptExpressions,
  extend,
} from '@keystonehq/bc-ur-registry';
import { ScriptExpression } from '@keystonehq/bc-ur-registry/dist/ScriptExpression.js';
import { Curve, KeystoneSDK, QRHardwareCallVersion, UR } from '@keystonehq/keystone-sdk';
import bs58check from 'bs58check';
import * as bitcoin from 'bitcoinjs-lib';
import HDKey from 'hdkey';
import { parse as uuidParse, stringify as uuidStringify } from 'uuid';
import {
  HardwareErrorCode,
  boundedCborFromHex,
  createHwkError,
  parseWalletMasterFingerprint,
} from '@onekeyfe/hwk-adapter-core';

import { TronSignRequest, TronSignType } from './TronSignRequest';
import { TronSignature } from './TronSignature';

import type { HwkError } from '@onekeyfe/hwk-adapter-core';
import type {
  BtcScriptType,
  KeystoneBtcSignRequestAccount,
  KeystoneBtcSignatureResult,
  KeystoneEthSignRequestInput,
  KeystoneEthSignatureResult,
  KeystoneKeyDerivationRequestInput,
  KeystoneParsedAccount,
  KeystoneParsedMultiAccounts,
  KeystoneRejectedExportPath,
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

// Every reply is untrusted: the vendor decoders behind UR parsing do not bound CBOR lengths.
function toSdkUr(ur: KeystoneUr): UR {
  return new UR(boundedCborFromHex(ur.urData), ur.urType);
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
function requireBip32MasterFingerprint(value: unknown): string {
  const fingerprint = parseWalletMasterFingerprint(value);
  if (!fingerprint) {
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

const BIP32_HARDENED_OFFSET = 0x80000000;

type RejectionReason = KeystoneRejectedExportPath['reason'];

/** The account path form a request can name: hardened first segment, every index below 2^31. */
function isExportedAccountPath(path: string): boolean {
  return (
    /^m(?:\/\d+')+(?:\/\d+)*$/.test(path) &&
    path
      .slice(2)
      .split('/')
      .every(
        segment =>
          Number(segment.endsWith("'") ? segment.slice(0, -1) : segment) < BIP32_HARDENED_OFFSET
      )
  );
}

/** One exported key: its identity when usable, otherwise why it cannot be used. */
function checkExportedKey(
  key: CryptoHDKey,
  account: KeystoneParsedAccount,
  masterFingerprint: string,
  unsupportedDescriptor: boolean
):
  | { identity: string; rejected?: undefined }
  | { identity?: undefined; rejected: RejectionReason } {
  if (unsupportedDescriptor || key.isMaster() || key.isPrivateKey()) {
    return { rejected: 'unusable-key' };
  }
  const source = key.getOrigin()?.getSourceFingerprint();
  if (source && source.toString('hex') !== masterFingerprint) {
    return { rejected: 'different-wallet' };
  }
  if (!account.extendedPublicKey) {
    return /^[0-9a-f]{64}$/i.test(account.publicKey)
      ? { identity: account.publicKey }
      : { rejected: 'unusable-key' };
  }
  try {
    const node = HDKey.fromExtendedKey(account.extendedPublicKey);
    if (
      node.privateKey ||
      !node.publicKey ||
      !node.chainCode ||
      node.publicKey.toString('hex') !== account.publicKey.toLowerCase()
    ) {
      return { rejected: 'unusable-key' };
    }
    return { identity: `${account.publicKey}:${node.chainCode.toString('hex')}` };
  } catch {
    return { rejected: 'unusable-key' };
  }
}

/**
 * The scanned code is not this request's answer: another kind of code, an unreadable one, or the
 * answer to another request. `code` keeps the failure's class; the reason tells the host so.
 */
export function unexpectedQrCodeError(
  message: string,
  code: HardwareErrorCode = HardwareErrorCode.InvalidParams
): HwkError {
  return createHwkError({ code, message, params: { reason: 'unexpected-qr-code' } });
}

/**
 * Relative derivation path in the `m/`-prefixed form the xpub helpers expect. Each segment must be
 * a plain non-hardened index: the derivation library reads `0h` or `0abc` as index 0 instead of
 * failing, which would hand back another path's address.
 */
function relativeHdPath(relativeDerivePath: string): string {
  const segments = relativeDerivePath.replace(/^m\//i, '').split('/');
  const valid = segments.every(
    segment => /^\d+$/.test(segment) && Number(segment) < BIP32_HARDENED_OFFSET
  );
  if (!valid) {
    throw createHwkError({
      code: HardwareErrorCode.InvalidParams,
      message: `Invalid change/index segments in derivation path (${relativeDerivePath})`,
    });
  }
  return `m/${segments.join('/')}`;
}

// Text a scanned export carries reaches the host UI and version gates; keep only what fits.
const FIRMWARE_VERSION = /^\d{1,4}(\.\d{1,4}){1,3}(-[0-9A-Za-z.-]{1,20})?$/;
const DEVICE_TEXT = /^[^\p{Cc}\p{Cf}]{1,64}$/u;

function deviceText(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
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
      device: deviceText(parsed.device, DEVICE_TEXT),
      deviceId: deviceText(parsed.deviceId, DEVICE_TEXT),
      deviceVersion: deviceText(parsed.deviceVersion, FIRMWARE_VERSION),
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
        chainType: schema.chainType,
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

  /**
   * Device exports are opt-in: request responses retain their existing format/path checks. An
   * export carries whatever the device syncs to other wallets, so each key is checked on its own: a
   * key that fails lands in `rejectedPaths` instead of discarding the whole export.
   */
  parseAccountExport(ur: KeystoneUr): KeystoneParsedMultiAccounts {
    let parsed: KeystoneParsedMultiAccounts;
    let keys: CryptoHDKey[];
    const unsupportedDescriptors = new Set<number>();
    try {
      const { cbor } = toSdkUr(ur);
      if (ur.urType === 'crypto-account') {
        // Extend both registry layers so existing account parsers also understand Taproot.
        if (!Object.values(ScriptExpressions).some(script => script.getTag() === 409)) {
          Object.assign(ScriptExpressions, { TAPROOT: new ScriptExpression(409, 'tr') });
        }
        extend.cbor.patchTags([409]);
        const account = CryptoAccount.fromCBOR(cbor);
        keys = account.getOutputDescriptors().map((output, index) => {
          const key = output.getHDKey();
          const path = key?.getOrigin()?.getPath();
          const script = output
            .getScriptExpressions()
            .map(item => item.getExpression())
            .join('/');
          const validScript =
            (path?.startsWith("44'/0'/") && script === 'pkh') ||
            (path?.startsWith("49'/0'/") && script === 'sh/wpkh') ||
            (path?.startsWith("84'/0'/") && script === 'wpkh') ||
            (path?.startsWith("86'/0'/") && script === 'tr');
          // Keystone's BTC export includes the receiving-branch hint on its account xpub.
          const children = key?.getChildren();
          if (!key) throw new Error('Unsupported account descriptor');
          if (!validScript || (children && children.getPath() !== '0/*')) {
            unsupportedDescriptors.add(index);
          }
          return key;
        });
        const result = this.sdk.parseAccount(toSdkUr(ur));
        parsed = {
          masterFingerprint: requireBip32MasterFingerprint(result.masterFingerprint),
          accounts: result.keys.map(toParsedAccount),
        };
      } else if (ur.urType === 'crypto-multi-accounts') {
        keys = CryptoMultiAccounts.fromCBOR(cbor).getKeys();
        parsed = this.parseMultiAccounts(ur);
      } else if (ur.urType === 'crypto-hdkey') {
        keys = [CryptoHDKey.fromCBOR(cbor)];
        parsed = this.parseAccountResponse(ur);
      } else {
        throw new Error('Unsupported account export type');
      }
      if (!keys.length || keys.length !== parsed.accounts.length) {
        throw new Error('Empty account export');
      }
    } catch {
      throw unexpectedQrCodeError(
        'Unable to read account export; scan a supported Keystone account export code'
      );
    }
    // Per path: the key read there, or why the path cannot be used. A good key does not clear a
    // different wallet or a conflicting key at its path, and an unusable key alone does not void one.
    const byPath = new Map<
      string,
      { account?: KeystoneParsedAccount; identity?: string; rejected?: RejectionReason }
    >();
    parsed.accounts.forEach((account, index) => {
      // No request names a path in any other form, so such a key is never read.
      if (!isExportedAccountPath(account.path)) return;
      const entry = byPath.get(account.path) ?? {};
      byPath.set(account.path, entry);
      const check = checkExportedKey(
        keys[index],
        account,
        parsed.masterFingerprint,
        unsupportedDescriptors.has(index)
      );
      if (check.rejected === 'different-wallet') {
        entry.rejected = check.rejected;
      } else if (check.identity === undefined) {
        entry.rejected ??= check.rejected;
      } else if (entry.identity === undefined) {
        entry.account = account;
        entry.identity = check.identity;
      } else if (entry.identity !== check.identity && entry.rejected !== 'different-wallet') {
        entry.rejected = 'conflicting-keys';
      }
    });
    const accounts: KeystoneParsedAccount[] = [];
    const rejectedPaths: KeystoneRejectedExportPath[] = [];
    byPath.forEach((entry, path) => {
      if (
        entry.account &&
        entry.rejected !== 'different-wallet' &&
        entry.rejected !== 'conflicting-keys'
      ) {
        accounts.push(entry.account);
      } else if (entry.rejected) {
        rejectedPaths.push({ path, reason: entry.rejected });
      }
    });
    return { ...parsed, accounts, rejectedPaths };
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

  /** `CryptoHDKey` always emits mainnet xpub version bytes (`0488B21E`), so `hdkey` parses it as is. */
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

  /**
   * Returns the hex-encoded (possibly still-unsigned-in-part) PSBT the device replied with. A PSBT
   * carries no request id, so the reply is bound to the request by its unsigned transaction, which
   * signing never changes (BIP-174); a scan of another PSBT's signature is refused.
   */
  parseBtcPsbt(ur: KeystoneUr, requestPsbtHex: string): string {
    const signedPsbtHex = this.sdk.btc.parsePSBT(toSdkUr(ur));
    let sameTransaction = false;
    try {
      const unsignedTx = (hex: string) =>
        Buffer.from(bitcoin.Psbt.fromHex(hex).data.globalMap.unsignedTx.toBuffer());
      sameTransaction = unsignedTx(signedPsbtHex).equals(unsignedTx(requestPsbtHex));
    } catch {
      sameTransaction = false;
    }
    if (!sameTransaction) {
      throw unexpectedQrCodeError(
        'Keystone returned a PSBT for another transaction than the one requested',
        HardwareErrorCode.DeviceMismatch
      );
    }
    return signedPsbtHex;
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
    const signature = TronSignature.fromCBOR(boundedCborFromHex(ur.urData));
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
