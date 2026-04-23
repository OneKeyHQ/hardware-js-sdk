import { bytesToHex, hexToBytes } from '@onekeyfe/hwk-adapter-core';

import { collapseSignerInteraction, normalizePath } from './utils';
import { SignerSol } from '../../signer/SignerSol';

import type { ConnectorContext } from './types';

// ---------------------------------------------------------------------------
// Call param types
// ---------------------------------------------------------------------------

export interface SolGetAddressCallParams {
  path: string;
  showOnDevice?: boolean;
}

export interface SolSignTransactionCallParams {
  path: string;
  /** Hex-encoded serialized transaction bytes (no 0x prefix) */
  serializedTx: string;
}

export interface SolSignMessageCallParams {
  path: string;
  /** Message bytes as hex string (no 0x prefix) */
  message: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function solGetAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: SolGetAddressCallParams
): Promise<{ address: string; path: string }> {
  const solSigner = await _createSolSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    // Ledger Solana signer returns a base58-encoded Ed25519 public key (= Solana address)
    const publicKey = await solSigner.getAddress(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    return { address: publicKey, path: params.path };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function solSignTransaction(
  ctx: ConnectorContext,
  sessionId: string,
  params: SolSignTransactionCallParams
): Promise<{ signature: string }> {
  const solSigner = await _createSolSigner(ctx, sessionId);
  const path = normalizePath(params.path);
  const txBytes = hexToBytes(params.serializedTx);

  try {
    const result = await solSigner.signTransaction(path, txBytes);
    return { signature: bytesToHex(result) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function solSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: SolSignMessageCallParams
): Promise<{ signature: string }> {
  const solSigner = await _createSolSigner(ctx, sessionId);
  const path = normalizePath(params.path);
  const messageBytes = hexToBytes(params.message);

  try {
    // DMK signMessage returns { signature: string }, not raw Uint8Array
    const result = await solSigner.signMessage(path, messageBytes);
    return { signature: result.signature };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Internal -- SOL signer creation
// ---------------------------------------------------------------------------

async function _createSolSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerSol> {
  const dmk = await ctx.getOrCreateDmk();
  const { ContextModuleBuilder } = await ctx.importLedgerKit('@ledgerhq/context-module');
  const { SignerSolanaBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-solana');
  const contextModule = new ContextModuleBuilder({}).removeDefaultLoaders().build();
  const sdkSigner = new SignerSolanaBuilder({ dmk, sessionId })
    .withContextModule(contextModule)
    .build();
  const signer = new SignerSol(sdkSigner);

  // Wire up interaction events (verify-address, sign, etc.)
  // DMK-specific values (verify-address, sign-transaction, sign-personal-message)
  // collapse to ConfirmOnDevice via the helper.
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
