import { HardwareErrorCode, bytesToHex, hexToBytes, stripHex } from '@onekeyfe/hwk-adapter-core';

import { normalizePath } from './utils';
import { SignerBtc } from '../../signer/SignerBtc';
import { debugError, debugLog } from '../../utils/debugLog';

import type { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';
import type { ConnectorContext } from './types';

// ---------------------------------------------------------------------------
// Call param types
// ---------------------------------------------------------------------------

export interface BtcGetAddressCallParams {
  /** Account-level derivation path (3 levels, e.g. "m/86'/0'/0'") */
  path: string;
  showOnDevice?: boolean;
  /** Address index within the account (default: 0) */
  addressIndex?: number;
  /** Whether this is a change address (default: false) */
  change?: boolean;
}

export interface BtcGetPublicKeyCallParams {
  path: string;
  showOnDevice?: boolean;
}

export interface BtcSignTransactionCallParams {
  psbt?: string;
  coin: string;
  /** Account-level derivation path for wallet template determination (e.g. "84'/0'/0'"). */
  path?: string;
  /** Per-input full derivation paths (e.g. ["m/86'/0'/0'/0/0"]) for PSBT enrichment. */
  inputDerivations?: Array<{ path: string }>;
}

export interface BtcSignPsbtCallParams {
  psbt: string;
  coin?: string;
  path?: string;
}

export interface BtcSignMessageCallParams {
  path: string;
  message: string;
  coin?: string;
}

// ---------------------------------------------------------------------------
// PSBT binary helpers
// ---------------------------------------------------------------------------

/** Read a compact-size (varint) from `data` at `pos`. Returns [value, bytesConsumed]. */
function readCompactSize(data: Uint8Array, pos: number): [number, number] {
  const first = data[pos];
  if (first < 0xfd) return [first, 1];
  if (first === 0xfd) return [data[pos + 1] | (data[pos + 2] << 8), 3];
  // 0xfe/0xff cases omitted -- PSBTs won't have keys/values > 64KB
  return [0, 1];
}

/** Write a compact-size varint to `out` array. */
function writeCompactSize(out: number[], val: number): void {
  if (val < 0xfd) {
    out.push(val);
  } else {
    out.push(0xfd, val & 0xff, (val >>> 8) & 0xff);
  }
}

/** Read one PSBT key-value pair. Returns raw bytes, end position, key type, and value. */
function readKeyValue(
  data: Uint8Array,
  pos: number
): { bytes: Uint8Array; end: number; keyType: number; value: Uint8Array | null } {
  const start = pos;
  const [keyLen, keyLenSize] = readCompactSize(data, pos);
  pos += keyLenSize;
  const keyType = data[pos]; // first byte of key is the type
  pos += keyLen;
  const [valLen, valLenSize] = readCompactSize(data, pos);
  pos += valLenSize;
  const value = data.slice(pos, pos + valLen);
  pos += valLen;
  return { bytes: data.slice(start, pos), end: pos, keyType, value };
}

/** Write a PSBT key-value pair to `out` array. */
function writeKv(out: number[], key: Uint8Array, value: Uint8Array): void {
  writeCompactSize(out, key.length);
  key.forEach(b => out.push(b));
  writeCompactSize(out, value.length);
  value.forEach(b => out.push(b));
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function btcGetAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcGetAddressCallParams
): Promise<{ address: string; path: string }> {
  const btcSigner = await _createBtcSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const { DefaultWallet, DefaultDescriptorTemplate } = await ctx.importLedgerKit(
      '@ledgerhq/device-signer-kit-bitcoin'
    );
    const purpose = path.split('/')[0]?.replaceAll("'", '');
    let template = DefaultDescriptorTemplate.NATIVE_SEGWIT;
    if (purpose === '44') template = DefaultDescriptorTemplate.LEGACY;
    else if (purpose === '49') template = DefaultDescriptorTemplate.NESTED_SEGWIT;
    else if (purpose === '86') template = DefaultDescriptorTemplate.TAPROOT;
    const wallet = new DefaultWallet(path, template);

    debugLog('[LedgerConnector] btcGetAddress params:', {
      path,
      purpose,
      template,
      addressIndex: params.addressIndex,
      change: params.change,
      showOnDevice: params.showOnDevice,
    });

    const result = await btcSigner.getWalletAddress(wallet, params.addressIndex ?? 0, {
      checkOnDevice: params.showOnDevice ?? false,
      change: params.change ?? false,
    });
    return { address: result.address, path: params.path };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

export async function btcGetPublicKey(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcGetPublicKeyCallParams
): Promise<{ xpub: string; path: string }> {
  const btcSigner = await _createBtcSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  debugLog('[LedgerConnector] btcGetPublicKey called, path:', path, 'sessionId:', sessionId);
  try {
    const xpub = await btcSigner.getExtendedPublicKey(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    debugLog('[LedgerConnector] btcGetPublicKey success, xpub:', `${xpub?.substring(0, 20)}...`);
    return { xpub, path: params.path };
  } catch (err) {
    debugError('[LedgerConnector] btcGetPublicKey error, path:', path, 'err:', err);
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

export async function btcSignTransaction(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcSignTransactionCallParams
): Promise<{ signedPsbt: string }> {
  if (!params.psbt) {
    throw Object.assign(
      new Error('Ledger requires PSBT format for BTC transaction signing. Provide params.psbt.'),
      { code: HardwareErrorCode.InvalidParams }
    );
  }

  const btcSigner = await _createBtcSigner(ctx, sessionId);

  try {
    const { DefaultWallet, DefaultDescriptorTemplate } = await ctx.importLedgerKit(
      '@ledgerhq/device-signer-kit-bitcoin'
    );

    // Determine wallet template from the account-level derivation path
    const path = normalizePath(params.path || "84'/0'/0'");
    const purpose = path.split('/')[0]?.replaceAll("'", '');
    let template = DefaultDescriptorTemplate.NATIVE_SEGWIT;
    if (purpose === '44') template = DefaultDescriptorTemplate.LEGACY;
    else if (purpose === '49') template = DefaultDescriptorTemplate.NESTED_SEGWIT;
    else if (purpose === '86') template = DefaultDescriptorTemplate.TAPROOT;

    const wallet = new DefaultWallet(path, template);

    // Enrich PSBT with Taproot fields if needed (Ledger BTC App requires
    // tapInternalKey + tapBip32Derivation for Taproot inputs).
    let psbtToSign = params.psbt;
    if (purpose === '86' && params.inputDerivations?.length) {
      psbtToSign = await _enrichTaprootPsbt(btcSigner, psbtToSign, params.inputDerivations);
    }

    // signTransaction: signs the PSBT and returns the fully extracted raw tx hex
    const signedTxHex = await btcSigner.signTransaction(wallet, psbtToSign);

    return { signedPsbt: stripHex(signedTxHex) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

export async function btcSignPsbt(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcSignPsbtCallParams
): Promise<{ signedPsbt: string }> {
  if (!params.psbt) {
    throw Object.assign(new Error('btcSignPsbt requires params.psbt'), {
      code: HardwareErrorCode.InvalidParams,
    });
  }

  const btcSigner = await _createBtcSigner(ctx, sessionId);

  try {
    const { DefaultWallet, DefaultDescriptorTemplate } = await ctx.importLedgerKit(
      '@ledgerhq/device-signer-kit-bitcoin'
    );

    const path = normalizePath(params.path || "84'/0'/0'");
    const purpose = path.split('/')[0]?.replaceAll("'", '');
    let template = DefaultDescriptorTemplate.NATIVE_SEGWIT;
    if (purpose === '44') template = DefaultDescriptorTemplate.LEGACY;
    else if (purpose === '49') template = DefaultDescriptorTemplate.NESTED_SEGWIT;
    else if (purpose === '86') template = DefaultDescriptorTemplate.TAPROOT;

    const wallet = new DefaultWallet(path, template);

    const signatures = (await btcSigner.signPsbt(wallet, params.psbt)) as Array<{
      inputIndex: number;
      pubkey: Uint8Array;
      signature: Uint8Array;
      tapleafHash?: Uint8Array;
    }>;

    const signedPsbtHex = _applySignaturesToPsbt(params.psbt, signatures);
    return { signedPsbt: signedPsbtHex };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

export async function btcSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcSignMessageCallParams
): Promise<{ signature: string; address: string }> {
  const btcSigner = await _createBtcSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    // signMessage returns { r: HexaString, s: HexaString, v: number }
    const result = await btcSigner.signMessage(path, params.message);

    // BIP-137: signature = v(1) + r(32) + s(32)
    // Return as hex string (same as OneKey SDK), ProviderApiBtc converts to base64
    const vHex = result.v.toString(16).padStart(2, '0');
    const rHex = stripHex(result.r).padStart(64, '0');
    const sHex = stripHex(result.s).padStart(64, '0');

    return { signature: `${vHex}${rHex}${sHex}`, address: '' };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

export async function btcGetMasterFingerprint(
  ctx: ConnectorContext,
  sessionId: string,
  params?: { skipOpenApp?: boolean }
): Promise<{ masterFingerprint: string }> {
  const btcSigner = await _createBtcSigner(ctx, sessionId);

  try {
    const fingerprint: Uint8Array = await btcSigner.getMasterFingerprint({
      skipOpenApp: params?.skipOpenApp,
    });
    // Convert Uint8Array to hex string
    const hex = Array.from(fingerprint)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return { masterFingerprint: hex };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}

// ---------------------------------------------------------------------------
// Internal -- BTC signer creation
// ---------------------------------------------------------------------------

async function _createBtcSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerBtc> {
  const dmk = await ctx.getOrCreateDmk();
  const { SignerBtcBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-bitcoin');
  const sdkSigner = new SignerBtcBuilder({ dmk, sessionId }).build();
  const signer = new SignerBtc(sdkSigner);

  // Wire up interaction events (open-app, unlock, sign, etc.)
  signer.onInteraction = (interaction: string) => {
    ctx.emit('ui-event', {
      type: interaction as EConnectorInteraction,
      payload: { sessionId },
    });
  };

  return signer;
}

// ---------------------------------------------------------------------------
// Internal -- Apply partial signatures to PSBT
// ---------------------------------------------------------------------------

function _applySignaturesToPsbt(
  psbtHex: string,
  signatures: Array<{
    inputIndex: number;
    pubkey: Uint8Array;
    signature: Uint8Array;
    tapleafHash?: Uint8Array;
  }>
): string {
  const raw = hexToBytes(psbtHex);
  const result: number[] = [];
  let pos = 0;

  for (let i = 0; i < 5; i++) result.push(raw[pos++]);

  while (pos < raw.length && raw[pos] !== 0x00) {
    const { bytes: kv, end } = readKeyValue(raw, pos);
    kv.forEach(b => result.push(b));
    pos = end;
  }
  result.push(raw[pos++]);

  const sigsByInput = new Map<number, typeof signatures>();
  for (const sig of signatures) {
    if (!sigsByInput.has(sig.inputIndex)) sigsByInput.set(sig.inputIndex, []);
    sigsByInput.get(sig.inputIndex)!.push(sig);
  }

  for (let inputIdx = 0; pos < raw.length; inputIdx++) {
    while (pos < raw.length && raw[pos] !== 0x00) {
      const { bytes: kv, end } = readKeyValue(raw, pos);
      kv.forEach(b => result.push(b));
      pos = end;
    }

    const inputSigs = sigsByInput.get(inputIdx) || [];
    for (const sig of inputSigs) {
      if (sig.tapleafHash && sig.tapleafHash.length > 0) {
        const key = new Uint8Array(1 + 32 + 32);
        key[0] = 0x14;
        key.set(sig.pubkey.subarray(0, 32), 1);
        key.set(sig.tapleafHash, 33);
        writeKv(result, key, new Uint8Array(sig.signature));
      } else if (sig.pubkey.length === 32) {
        writeKv(result, new Uint8Array([0x13]), new Uint8Array(sig.signature));
      } else {
        const key = new Uint8Array(1 + sig.pubkey.length);
        key[0] = 0x02;
        key.set(sig.pubkey, 1);
        writeKv(result, key, new Uint8Array(sig.signature));
      }
    }

    result.push(raw[pos++]);
  }

  while (pos < raw.length) {
    result.push(raw[pos++]);
  }

  return bytesToHex(new Uint8Array(result));
}

// ---------------------------------------------------------------------------
// Internal -- Taproot PSBT enrichment
// ---------------------------------------------------------------------------

/**
 * Enrich a PSBT hex with Taproot-specific fields that the Ledger BTC App requires.
 * For each Taproot input: adds tapInternalKey and tapBip32Derivation.
 */
async function _enrichTaprootPsbt(
  btcSigner: InstanceType<typeof SignerBtc>,
  psbtHex: string,
  inputDerivations: Array<{ path: string }>
): Promise<string> {
  // Get master fingerprint from device
  const masterFp = await btcSigner.getMasterFingerprint({ skipOpenApp: true });
  const fpBytes = masterFp.length === 4 ? masterFp : new Uint8Array([0, 0, 0, 0]);

  // Parse PSBT binary
  const raw = hexToBytes(psbtHex);
  const result: number[] = [];
  let pos = 0;

  // Copy magic (5 bytes: "psbt\xff")
  for (let i = 0; i < 5; i++) result.push(raw[pos++]);

  // Copy global key-value pairs until separator (0x00)
  while (pos < raw.length && raw[pos] !== 0x00) {
    const { bytes: kv, end } = readKeyValue(raw, pos);
    kv.forEach(b => result.push(b));
    pos = end;
  }
  result.push(raw[pos++]); // global separator

  // Process each input map
  for (let inputIdx = 0; pos < raw.length; inputIdx++) {
    const inputKvs: Uint8Array[] = [];
    let witnessUtxoScript: Uint8Array | null = null;

    // Read all existing key-value pairs for this input
    while (pos < raw.length && raw[pos] !== 0x00) {
      const { bytes: kv, end, keyType, value } = readKeyValue(raw, pos);
      inputKvs.push(kv);
      // PSBT_IN_WITNESS_UTXO = 0x01
      if (keyType === 0x01 && value) {
        // value = amount(8) + scriptPubKey(varint + data)
        const scriptStart = 8; // skip amount
        const scriptLen = value[scriptStart];
        witnessUtxoScript = value.slice(scriptStart + 1, scriptStart + 1 + scriptLen);
      }
      pos = end;
    }

    // Write existing pairs
    inputKvs.forEach(kv => kv.forEach(b => result.push(b)));

    // If Taproot input (OP_1 0x20 <32-byte-key>) and we have derivation info
    if (
      witnessUtxoScript &&
      witnessUtxoScript.length === 34 &&
      witnessUtxoScript[0] === 0x51 && // OP_1
      witnessUtxoScript[1] === 0x20 && // PUSH 32
      inputDerivations[inputIdx]
    ) {
      const xOnlyKey = witnessUtxoScript.slice(2, 34);
      const fullPath = inputDerivations[inputIdx].path;

      // PSBT_IN_TAP_INTERNAL_KEY (0x17): key=0x17, value=32-byte xonly key
      writeKv(result, new Uint8Array([0x17]), xOnlyKey);

      // PSBT_IN_TAP_BIP32_DERIVATION (0x16): key=0x16+xOnlyKey, value=numLeafHashes+fingerprint+path
      const pathComponents = fullPath.replace(/^m\//, '').split('/');
      const pathBuf = new Uint8Array(1 + 4 + pathComponents.length * 4); // leafHashes(1) + fp(4) + path
      pathBuf[0] = 0x00; // 0 leaf hashes
      pathBuf.set(fpBytes, 1);
      for (let i = 0; i < pathComponents.length; i++) {
        const comp = pathComponents[i];
        const hardened = comp.endsWith("'");
        let val = parseInt(hardened ? comp.slice(0, -1) : comp, 10);
        if (hardened) val += 0x80000000;
        // little-endian 4 bytes
        const off = 5 + i * 4;
        pathBuf[off] = val & 0xff;
        pathBuf[off + 1] = (val >>> 8) & 0xff;
        pathBuf[off + 2] = (val >>> 16) & 0xff;
        pathBuf[off + 3] = (val >>> 24) & 0xff;
      }
      const tapBipKey = new Uint8Array(1 + 32);
      tapBipKey[0] = 0x16;
      tapBipKey.set(xOnlyKey, 1);
      writeKv(result, tapBipKey, pathBuf);
    }

    result.push(raw[pos++]); // input separator
  }

  // Copy remaining output maps as-is
  while (pos < raw.length) {
    result.push(raw[pos++]);
  }

  return bytesToHex(new Uint8Array(result));
}
