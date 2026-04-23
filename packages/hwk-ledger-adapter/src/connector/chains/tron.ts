import { EConnectorInteraction, HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';
import Trx from '@ledgerhq/hw-app-trx';

import { normalizePath } from './utils';
import { withLegacyAppRetry } from './legacyAppRetry';
import { AppManager } from '../../app/AppManager';
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
  /**
   * TRC token metadata for Ledger clear-signing. Omit → TRC-20 transfers
   * fall back to blind-signing (user sees only raw bytes on-device).
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
  const path = normalizePath(params.path);
  await _ensureTronAppOpen(ctx, sessionId);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async sid => {
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
  await _ensureTronAppOpen(ctx, sessionId);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async sid => {
    const trx = await _createTrx(ctx, sid);
    ctx.emit('ui-event', {
      type: EConnectorInteraction.ConfirmOnDevice,
      payload: { sessionId: sid },
    });
    const signature = await trx.signTransaction(
      path,
      params.rawTxHex,
      params.tokenSignatures ?? []
    );
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
  await _ensureTronAppOpen(ctx, sessionId);
  return withLegacyAppRetry(ctx, sessionId, 'Tron', async sid => {
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

/**
 * Proactively switch to the Tron app before sending a TRX APDU.
 *
 * Official DMK Signer kits (SignerEth / SignerBtc / SignerSol) get this for
 * free via DMK's DeviceAction pipeline — it calls `getDeviceStatus` + emits
 * `confirm-open-app` before sending any chain command. TRON can't use that
 * pipeline yet because `@ledgerhq/device-signer-kit-tron` doesn't exist; we
 * bridge `@ledgerhq/hw-app-trx` straight to `DmkTransport.exchange`, which
 * bypasses the pre-flight check.
 *
 * Without this, a TRX APDU fired while e.g. the Ethereum app is still open
 * gets answered by Ethereum (same CLA/INS, different data layout) with an
 * app-specific SW like 0x6A15. That SW is not in `WRONG_APP_CODES`, so
 * `withLegacyAppRetry` never triggers the auto-switch path and the user
 * sees "UNKNOWN_ERROR (0x6a15)".
 *
 * Remove this once Ledger ships `device-signer-kit-tron` and we can route
 * TRON through the same SignerManager DeviceAction flow as the other chains.
 */
async function _ensureTronAppOpen(ctx: ConnectorContext, sessionId: string): Promise<void> {
  const dmk = await ctx.getOrCreateDmk();
  const appManager = new AppManager(dmk);
  await appManager.ensureAppOpen(sessionId, 'Tron', () => {
    ctx.emit('ui-event', {
      type: EConnectorInteraction.ConfirmOpenApp,
      payload: { sessionId },
    });
  });
}
