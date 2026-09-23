import { HardwareErrorCode, bytesToHex, hexToBytes } from '@onekeyfe/hwk-adapter-core';

import { normalizePath, runSignerCall, wireSignerToSession } from './utils';
import { SignerTron } from '../../signer/SignerTron';

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
   * Legacy `hw-app-trx` TRC-10 descriptor channel (P1 0xA0), unimplemented in signer-kit-tron
   * 0.2.0. TRC-20 is clear-signed from the firmware token table instead.
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

  return runSignerCall(ctx, sessionId, async () => {
    const result = await tronSigner.getAddress(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    return { address: result.address, publicKey: result.publicKey, path: params.path };
  });
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

  return runSignerCall(ctx, sessionId, async () => {
    const signature = await tronSigner.signTransaction(path, hexToBytes(params.rawTxHex));
    return { signature: bytesToHex(signature) };
  });
}

export async function tronSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: TronSignMessageCallParams
): Promise<{ signature: string }> {
  const tronSigner = await _createTronSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  return runSignerCall(ctx, sessionId, async () => {
    const signature = await tronSigner.signPersonalMessage(path, hexToBytes(params.messageHex));
    return { signature: bytesToHex(signature) };
  });
}

// ---------------------------------------------------------------------------
// Internal -- TRON signer creation
// ---------------------------------------------------------------------------

async function _createTronSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerTron> {
  const dmk = await ctx.getOrCreateDmk();
  const { SignerTrxBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-tron');
  const sdkSigner = new SignerTrxBuilder({ dmk, sessionId }).build();
  return wireSignerToSession(ctx, sessionId, 'tron', new SignerTron(sdkSigner));
}
