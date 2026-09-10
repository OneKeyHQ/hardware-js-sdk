import { bytesToHex } from '@onekeyfe/hwk-adapter-core';

import { collapseSignerInteraction, normalizePath } from './utils';
import { SignerZcash } from '../../signer/SignerZcash';
import { debugLog } from '../../utils/debugLog';

import type { ConnectorContext } from './types';
import type { ZcashFullViewingKeyMode } from '@onekeyfe/hwk-adapter-core';

// ---------------------------------------------------------------------------
// Call param types
// ---------------------------------------------------------------------------

export interface ZcashGetFullViewingKeyCallParams {
  path: string;
  mode?: ZcashFullViewingKeyMode;
}

export interface ZcashGetShieldedAddressCallParams {
  path: string;
  showOnDevice?: boolean;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function zcashGetFullViewingKey(
  ctx: ConnectorContext,
  sessionId: string,
  params: ZcashGetFullViewingKeyCallParams
): Promise<{ path: string; mode: ZcashFullViewingKeyMode; ufvk?: string; orchardFvk?: string }> {
  const signer = await _createZcashSigner(ctx, sessionId);
  const path = normalizePath(params.path);
  const mode = params.mode ?? 'ufvk';

  try {
    const result = await signer.getFullViewingKey(path, { mode });
    if (result.mode === 'ufvk') {
      return { path: params.path, mode, ufvk: result.fullViewingKey };
    }
    return { path: params.path, mode, orchardFvk: bytesToHex(result.fullViewingKey) };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function zcashGetShieldedAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: ZcashGetShieldedAddressCallParams
): Promise<{ address: string; path: string }> {
  const signer = await _createZcashSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const result = await signer.getShieldedAddress(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    return { address: result.address, path: params.path };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function _createZcashSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerZcash> {
  const dmk = await ctx.getOrCreateDmk();
  const { SignerZcashBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-zcash');
  const sdkSigner = new SignerZcashBuilder({ dmk, sessionId }).build();
  const signer = new SignerZcash(sdkSigner);

  signer.onInteraction = (interaction: string) => {
    debugLog('[LedgerConnector] zcash.onInteraction:', interaction);
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };
  signer.onRegisterCanceller = cancel => ctx.registerCanceller(sessionId, cancel);
  return signer;
}
