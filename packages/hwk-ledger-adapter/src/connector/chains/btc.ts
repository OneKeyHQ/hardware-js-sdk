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
    const purpose = path.split('/')[0]?.replaceAll("'", '');
    let template = DefaultDescriptorTemplate.NATIVE_SEGWIT;
    if (purpose === '44') template = DefaultDescriptorTemplate.LEGACY;
    else if (purpose === '49') template = DefaultDescriptorTemplate.NESTED_SEGWIT;
    else if (purpose === '86') template = DefaultDescriptorTemplate.TAPROOT;

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
  } finally {
    ctx.clearCanceller(sessionId);
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

function _applySignaturesToPsbt(
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
    if (sig.tapleafHash && sig.tapleafHash.length > 0) {
      psbt.updateInput(sig.inputIndex, {
        tapScriptSig: [
          {
            pubkey: sig.pubkey.length === 32 ? sig.pubkey : sig.pubkey.subarray(0, 32),
            leafHash: sig.tapleafHash,
            signature: sig.signature,
          },
        ],
      });
    } else if (sig.pubkey.length === 32) {
      psbt.updateInput(sig.inputIndex, { tapKeySig: sig.signature });
    } else {
      psbt.updateInput(sig.inputIndex, {
        partialSig: [{ pubkey: sig.pubkey, signature: sig.signature }],
      });
    }
  }
  return psbt.toHex();
}
