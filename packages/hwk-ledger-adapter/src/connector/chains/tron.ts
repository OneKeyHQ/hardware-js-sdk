import { HardwareErrorCode, bytesToHex, hexToBytes } from '@onekeyfe/hwk-adapter-core';

import { collapseSignerInteraction, normalizePath } from './utils';
import { SignerTron } from '../../signer/SignerTron';
import { debugLog } from '../../utils/debugLog';

import type { ConnectorContext } from './types';

// ---------------------------------------------------------------------------
// Call param types
// ---------------------------------------------------------------------------

export interface TronGetAddressCallParams {
  path: string;
  showOnDevice?: boolean;
}

export interface TronSignTransactionCallParams {
  path: string;
  /** Protobuf-encoded raw transaction hex (no 0x prefix) */
  rawTxHex: string;
  /**
   * TRC-20 transfers are clear-signed from a firmware token table
   * (address -> ticker/decimals); tokens outside it show as a custom
   * contract. This field is the legacy `hw-app-trx` TRC-10 name/decimals
   * channel (P1 0xA0); `device-signer-kit-tron` 0.2.0 doesn't implement it.
   */
  tokenSignatures?: string[];
}

export interface TronSignMessageCallParams {
  path: string;
  /** Message hex (no 0x prefix) */
  messageHex: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function tronGetAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: TronGetAddressCallParams
): Promise<{ address: string; publicKey: string; path: string }> {
  const tronSigner = await _createTronSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const result = await tronSigner.getAddress(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    return { address: result.address, publicKey: result.publicKey, path: params.path };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function tronSignTransaction(
  ctx: ConnectorContext,
  sessionId: string,
  params: TronSignTransactionCallParams
): Promise<{ signature: string }> {
  if (!params.rawTxHex) {
    throw Object.assign(
      new Error('TRON signing requires a protobuf-encoded raw transaction hex (rawTxHex).'),
      { code: HardwareErrorCode.InvalidParams }
    );
  }

  const tronSigner = await _createTronSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const signature = await tronSigner.signTransaction(path, hexToBytes(params.rawTxHex));
    return { signature: bytesToHex(signature) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function tronSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: TronSignMessageCallParams
): Promise<{ signature: string }> {
  const tronSigner = await _createTronSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const signature = await tronSigner.signPersonalMessage(path, hexToBytes(params.messageHex));
    return { signature: bytesToHex(signature) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Internal -- TRON signer creation
// ---------------------------------------------------------------------------

async function _createTronSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerTron> {
  const dmk = await ctx.getOrCreateDmk();
  const { SignerTrxBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-tron');
  const sdkSigner = new SignerTrxBuilder({ dmk, sessionId }).build();
  const signer = new SignerTron(sdkSigner);

  signer.onInteraction = (interaction: string) => {
    debugLog('[LedgerConnector] tron.onInteraction:', interaction);
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };
  signer.onRegisterCanceller = cancel => {
    ctx.registerCanceller(sessionId, cancel);
  };
  return signer;
}
