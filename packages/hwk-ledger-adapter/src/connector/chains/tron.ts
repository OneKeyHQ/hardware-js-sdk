import { EConnectorInteraction, HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';
import Trx from '@ledgerhq/hw-app-trx';
import { normalizePath } from './utils';
import { withLegacyAppRetry } from './legacyAppRetry';
import { DmkTransport } from '../../transport/DmkTransport';
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
  const path = normalizePath(params.path);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async (sid) => {
    const trx = await _createTrx(ctx, sid);
    if (params.showOnDevice) {
      ctx.emit('ui-event', {
        type: EConnectorInteraction.ConfirmOnDevice,
        payload: { sessionId: sid },
      });
    }
    const result = await trx.getAddress(path, params.showOnDevice ?? false);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.InteractionComplete,
      payload: { sessionId: sid },
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

  const path = normalizePath(params.path);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async (sid) => {
    const trx = await _createTrx(ctx, sid);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.ConfirmOnDevice,
      payload: { sessionId: sid },
    });
    const signature = await trx.signTransaction(path, params.rawTxHex, []);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.InteractionComplete,
      payload: { sessionId: sid },
    });
    return { signature };
  });
}

export async function tronSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: TronSignMessageCallParams
): Promise<{ signature: string }> {
  const path = normalizePath(params.path);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async (sid) => {
    const trx = await _createTrx(ctx, sid);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.ConfirmOnDevice,
      payload: { sessionId: sid },
    });
    const signature = await trx.signPersonalMessage(path, params.messageHex);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.InteractionComplete,
      payload: { sessionId: sid },
    });
    return { signature };
  });
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function _createTrx(ctx: ConnectorContext, sessionId: string): Promise<Trx> {
  const dmk = await ctx.getOrCreateDmk();
  return new Trx(new DmkTransport(dmk, sessionId));
}
