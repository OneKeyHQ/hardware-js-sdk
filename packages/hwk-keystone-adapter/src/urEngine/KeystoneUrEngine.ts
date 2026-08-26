import { generateAddressFromXpub } from '@keystonehq/bc-ur-registry-eth';
import { Curve, KeystoneSDK, QRHardwareCallVersion, UR } from '@keystonehq/keystone-sdk';
import bs58check from 'bs58check';
import * as bitcoin from 'bitcoinjs-lib';
import HDKey from 'hdkey';
import { parse as uuidParse, stringify as uuidStringify } from 'uuid';

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

function splitSignature65(hex: string): { r: string; s: string; v: string } {
  return { r: hex.slice(0, 64), s: hex.slice(64, 128), v: hex.slice(128) };
}

/**
 * Thin wrapper around `@keystonehq/keystone-sdk`. Owns every touch point with the
 * vendor SDK so the rest of the adapter never imports it directly: same UR
 * construction/parsing serves both the QR and USB channels (USB carries the
 * identical UR payloads inside EAPDU framing — see the Keystone USB SDK's
 * `sendURRequest`), so this engine has no channel awareness at all.
 *
 * Deliberately uses the bare constructor, never `KeystoneSDK.create()` — `create()`
 * fetches remote fragment-size config from keyst.one at call time, which this SDK
 * must not depend on.
 */
export class KeystoneUrEngine {
  private readonly sdk: KeystoneSDK;

  constructor(origin = 'OneKey') {
    this.sdk = new KeystoneSDK({ origin });
  }

  // --- Account sync (works for both a device-initiated QR export and a
  // wallet-initiated KeyDerivation request/response over either channel) ---

  parseMultiAccounts(ur: KeystoneUr): KeystoneParsedMultiAccounts {
    const parsed = this.sdk.parseMultiAccounts(toSdkUr(ur));
    return {
      masterFingerprint: parsed.masterFingerprint.toLowerCase(),
      device: parsed.device,
      deviceId: parsed.deviceId,
      deviceVersion: parsed.deviceVersion,
      accounts: parsed.keys.map(
        (key): KeystoneParsedAccount => ({
          chain: key.chain,
          path: key.path,
          publicKey: key.publicKey,
          extendedPublicKey: key.extendedPublicKey,
          xfp: key.xfp,
          name: key.name,
        })
      ),
    };
  }

  parseHDKey(ur: KeystoneUr): KeystoneParsedAccount {
    const key = this.sdk.parseHDKey(toSdkUr(ur));
    return {
      chain: key.chain,
      path: key.path,
      publicKey: key.publicKey,
      extendedPublicKey: key.extendedPublicKey,
      xfp: key.xfp,
      name: key.name,
    };
  }

  /**
   * Build a `qr-hardware-call` (KeyDerivation) request: the host asks for
   * specific paths instead of waiting for whatever the device happens to be
   * showing. The device replies with a `crypto-multi-accounts` UR — parse it
   * with `parseMultiAccounts`. Used for the implicit "sync this wallet's xfp
   * before the first sign" round trip as well as an explicit account import.
   *
   * `version: V1` is required — verified against real Keystone hardware and
   * `keystone3-firmware`'s `CheckHardwareCallRequestIsLegal` source: an
   * unversioned/V0 request is validated as a legacy Cardano-only request
   * (`m/1852'/1815'/...`) and firmware rejects every other chain's path with
   * `PRS_PARSING_ERROR` (device-shown message: "路径不受支持" / "path not
   * supported"), regardless of the path's shape. V1 is what actually enables
   * the general per-chain path whitelist (includes `m/44'/60'` for ETH, the
   * standard BTC purposes, etc.). The SDK itself defaults to V0 unless a
   * truthy `version` is passed — omitting this silently produces a request
   * every non-Cardano device rejects.
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
   * Parse the response to a KeyDerivation request (or a device-initiated
   * account export): `crypto-multi-accounts` for a multi-schema request,
   * `crypto-hdkey` for a single-key response some firmware paths use instead.
   * Both are normalized to the same `KeystoneParsedMultiAccounts` shape — a
   * single `crypto-hdkey` becomes a one-entry account list, with its own
   * `origin.sourceFingerprint` promoted to `masterFingerprint` (correct for a
   * key derived directly from the seed, which every request this engine
   * builds asks for).
   */
  parseAccountResponse(ur: KeystoneUr): KeystoneParsedMultiAccounts {
    if (ur.urType === 'crypto-hdkey') {
      const account = this.parseHDKey(ur);
      if (!account.xfp) {
        throw new Error('Keystone crypto-hdkey response is missing its source fingerprint');
      }
      return { masterFingerprint: account.xfp.toLowerCase(), accounts: [account] };
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
    return { requestId: signature.requestId, ...splitSignature65(signature.signature) };
  }

  /**
   * Derive one EVM address offline from an already-synced account xpub —
   * verified against the same `@keystonehq/bc-ur-registry-eth` helper the
   * Keystone-based OneKey air-gap demo uses in production
   * (`generateAddressFromXpub`), so no unverified assumption about what a
   * leaf-path KeyDerivation request would return. `relativeDerivePath` is
   * relative to the xpub's own depth, e.g. `'0/0'` for an account xpub.
   */
  deriveEvmAddressFromXpub(xpub: string, relativeDerivePath: string): string {
    return generateAddressFromXpub(xpub, `m/${relativeDerivePath.replace(/^m\//i, '')}`);
  }

  // --- BTC (PSBT transaction signing + plain message signing) ---

  /**
   * Derive one BTC address offline from an already-synced account xpub, the
   * same way `deriveEvmAddressFromXpub` does. Keystone's `CryptoHDKey`
   * always emits standard mainnet-xpub version bytes (`0488B21E`) regardless
   * of the account's purpose/script type (verified against
   * `@keystonehq/bc-ur-registry`'s `CryptoHDKey.getBip32Key`, which hardcodes
   * that version rather than switching to a SLIP-132 ypub/zpub prefix per
   * script type) — so `hdkey.fromExtendedKey` parses it correctly for every
   * `scriptType` without needing custom version bytes configured.
   *
   * `p2tr` is deliberately not handled: taproot output-key tweaking (BIP-341)
   * needs an elliptic-curve library wired via bitcoinjs-lib's `initEccLib`,
   * which this package doesn't set up yet — every other payment function
   * here needs no such library.
   */
  deriveBtcAddressFromXpub(
    xpub: string,
    relativeDerivePath: string,
    scriptType: BtcScriptType
  ): string {
    const node = HDKey.fromExtendedKey(xpub).derive(`m/${relativeDerivePath.replace(/^m\//i, '')}`);
    if (!node.publicKey) throw new Error('HDKey derivation did not produce a public key');
    const pubkey = Buffer.from(node.publicKey);
    const network = bitcoin.networks.bitcoin;

    switch (scriptType) {
      case 'p2pkh': {
        const { address } = bitcoin.payments.p2pkh({ pubkey, network });
        if (!address) throw new Error('Failed to derive a P2PKH address from this xpub');
        return address;
      }
      case 'p2sh-p2wpkh': {
        const { address } = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({ pubkey, network }),
          network,
        });
        if (!address) throw new Error('Failed to derive a P2SH-P2WPKH address from this xpub');
        return address;
      }
      case 'p2wpkh': {
        const { address } = bitcoin.payments.p2wpkh({ pubkey, network });
        if (!address) throw new Error('Failed to derive a P2WPKH address from this xpub');
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
      dataType: 1, // BtcSignRequest.DataType.message — PSBT signing never goes through this path.
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
    return { requestId: signature.requestId, signature: signature.signature };
  }

  // --- TRON ---

  /**
   * `@keystonehq/keystone-sdk`'s own bundled `sdk.tron` module is
   * deliberately NOT used here — see `TronSignRequest.ts`'s doc comment for
   * why: it's a different (gzip/protobuf) protocol with response semantics
   * this package has no way to verify, whereas `TronSignRequest`/
   * `TronSignature` are a direct port of OneKey's own already-proven
   * production QR-wallet TRON implementation (a plain CBOR-native
   * sign-request/signature pair, same shape as eth/sol). The device decodes
   * `rawTxHex` itself — no client-side contract-type pre-parsing or
   * `tokenInfo` needed, unlike the public SDK's module.
   */
  buildTronSignRequest(input: KeystoneTronSignRequestInput): KeystoneUr {
    const request = new TronSignRequest({
      requestId: Buffer.from(uuidParse(input.requestId) as Uint8Array),
      signData: Buffer.from(stripHexPrefix(input.rawTxHex), 'hex'),
      signType: TronSignType.Transaction,
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
      signature: signature.getSignature().toString('hex'),
    };
  }

  /**
   * Derive one TRON address offline from an already-synced account xpub.
   * TRON reuses EVM's exact secp256k1-pubkey → keccak256 → last-20-bytes
   * derivation (verified against Keystone's own `formatAddress()` in
   * `keystone-sdk`'s TRON chain source) — only the final text encoding
   * differs (base58check with a `0x41` version byte, not checksummed hex).
   * Reusing `generateAddressFromXpub` here means no new hashing dependency:
   * strip its "0x" and re-encode the same 20 bytes.
   */
  deriveTronAddressFromXpub(xpub: string, relativeDerivePath: string): string {
    const evmStyleHex = generateAddressFromXpub(
      xpub,
      `m/${relativeDerivePath.replace(/^m\//i, '')}`
    ) as string;
    const addressBytes = Buffer.concat([
      Buffer.from([TRON_ADDRESS_PREFIX]),
      Buffer.from(evmStyleHex.replace(/^0x/i, ''), 'hex'),
    ]);
    return bs58check.encode(addressBytes);
  }
}
