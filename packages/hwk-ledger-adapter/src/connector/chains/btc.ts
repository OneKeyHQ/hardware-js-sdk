import { HardwareErrorCode, stripHex } from '@onekeyfe/hwk-adapter-core';
import { Psbt } from 'bitcoinjs-lib';

import { collapseSignerInteraction, normalizePath } from './utils';
import { SignerBtc } from '../../signer/SignerBtc';
import { debugError, debugLog } from '../../utils/debugLog';

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
// Internal -- BIP-44 purpose → Ledger wallet template
// ---------------------------------------------------------------------------

/**
 * BIP-44 purpose → Ledger descriptor template. Throws on unknown —
 * silent NATIVE_SEGWIT fallback would yield wrong addresses for
 * multisig (m/48') / legacy BIP-45 accounts. DDT is injected because
 * it comes from a runtime `importLedgerKit`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _purposeToTemplate(purpose: string | undefined, DDT: any): any {
  switch (purpose) {
    case '44':
      return DDT.LEGACY;
    case '49':
      return DDT.NESTED_SEGWIT;
    case '84':
      return DDT.NATIVE_SEGWIT;
    case '86':
      return DDT.TAPROOT;
    default:
      throw Object.assign(new Error(`Unsupported BTC purpose: m/${purpose ?? '<undefined>'}'`), {
        code: HardwareErrorCode.InvalidParams,
      });
  }
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
    const purpose = path.split('/')[0]?.replace(/'/g, '');
    const template = _purposeToTemplate(purpose, DefaultDescriptorTemplate);
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
  } finally {
    ctx.clearCanceller(sessionId);
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
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function btcSignTransaction(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcSignTransactionCallParams
): Promise<{ serializedTx: string }> {
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
    const purpose = path.split('/')[0]?.replace(/'/g, '');
    const template = _purposeToTemplate(purpose, DefaultDescriptorTemplate);

    const wallet = new DefaultWallet(path, template);

    const signedTxHex = await btcSigner.signTransaction(wallet, params.psbt);

    return { serializedTx: stripHex(signedTxHex) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
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
    const purpose = path.split('/')[0]?.replace(/'/g, '');
    const template = _purposeToTemplate(purpose, DefaultDescriptorTemplate);

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
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function btcSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: BtcSignMessageCallParams
): Promise<{ signature: string; address?: string }> {
  const btcSigner = await _createBtcSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    // signMessage returns { r: HexaString, s: HexaString, v: number }
    const result = await btcSigner.signMessage(path, params.message);

    // BIP-137: signature = v(1) + r(32) + s(32); returned as hex (OneKey SDK style).
    const vHex = result.v.toString(16).padStart(2, '0');
    const rHex = stripHex(result.r).padStart(64, '0');
    const sHex = stripHex(result.s).padStart(64, '0');

    return { signature: `${vHex}${rHex}${sHex}` };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
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
  } finally {
    ctx.clearCanceller(sessionId);
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
  // DMK-specific values (sign-transaction, sign-personal-message,
  // verify-address) collapse to ConfirmOnDevice via the helper.
  signer.onInteraction = (interaction: string) => {
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };

  signer.onRegisterCanceller = (cancel: () => void) => {
    ctx.registerCanceller(sessionId, cancel);
  };

  return signer;
}

// ---------------------------------------------------------------------------
// Internal -- Apply partial signatures to PSBT
// ---------------------------------------------------------------------------

type PsbtInput = Psbt['data']['inputs'][number];

function _isTaprootInput(input: PsbtInput): boolean {
  if (
    input.tapInternalKey ||
    input.tapKeySig ||
    input.tapLeafScript ||
    input.tapMerkleRoot ||
    input.tapBip32Derivation ||
    input.tapScriptSig
  )
    return true;
  // P2TR scriptPubKey: OP_1 (0x51) + PUSH32 (0x20) + <32B x-only>
  const script = input.witnessUtxo?.script;
  return !!(script && script.length === 34 && script[0] === 0x51 && script[1] === 0x20);
}

function _isScriptPathInput(input: PsbtInput): boolean {
  return !!(input.tapLeafScript && input.tapLeafScript.length > 0);
}

/**
 * Dispatch DMK-returned signatures to the correct PSBT field using the
 * input's scriptPubKey as authoritative signal; throws on shape violations.
 */
export function _applySignaturesToPsbt(
  psbtHex: string,
  signatures: Array<{
    inputIndex: number;
    pubkey: Uint8Array;
    signature: Uint8Array;
    tapleafHash?: Uint8Array;
  }>
): string {
  const psbt = Psbt.fromHex(psbtHex);
  for (const sig of signatures) {
    const input = psbt.data.inputs[sig.inputIndex];
    if (!input) {
      throw new Error(`_applySignaturesToPsbt: no PSBT input at index ${sig.inputIndex}`);
    }
    const taproot = _isTaprootInput(input);
    const scriptPath = taproot && _isScriptPathInput(input);
    const hasLeafHash = !!(sig.tapleafHash && sig.tapleafHash.length > 0);

    if (scriptPath) {
      if (sig.pubkey.length !== 32)
        throw new Error(
          `input ${sig.inputIndex}: taproot script-path pubkey must be 32B, got ${sig.pubkey.length}`
        );
      if (!hasLeafHash)
        throw new Error(
          `input ${sig.inputIndex}: taproot script-path signature missing tapleafHash`
        );
      psbt.updateInput(sig.inputIndex, {
        tapScriptSig: [
          { pubkey: sig.pubkey, leafHash: sig.tapleafHash!, signature: sig.signature },
        ],
      });
    } else if (taproot) {
      if (sig.pubkey.length !== 32)
        throw new Error(
          `input ${sig.inputIndex}: taproot key-path pubkey must be 32B, got ${sig.pubkey.length}`
        );
      if (hasLeafHash)
        throw new Error(
          `input ${sig.inputIndex}: taproot key-path signature must not carry tapleafHash`
        );
      psbt.updateInput(sig.inputIndex, { tapKeySig: sig.signature });
    } else {
      if (sig.pubkey.length !== 33 && sig.pubkey.length !== 65)
        throw new Error(
          `input ${sig.inputIndex}: ECDSA pubkey must be 33B or 65B, got ${sig.pubkey.length}`
        );
      if (hasLeafHash)
        throw new Error(`input ${sig.inputIndex}: ECDSA signature must not carry tapleafHash`);
      psbt.updateInput(sig.inputIndex, {
        partialSig: [{ pubkey: sig.pubkey, signature: sig.signature }],
      });
    }
  }
  return psbt.toHex();
}
