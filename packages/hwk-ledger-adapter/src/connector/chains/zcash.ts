import { bytesToHex } from '@onekeyfe/hwk-adapter-core';

import { normalizePath, runSignerCall, wireSignerToSession } from './utils';
import { SignerZcash } from '../../signer/SignerZcash';

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

  return runSignerCall(ctx, sessionId, async () => {
    const result = await signer.getFullViewingKey(path, { mode });
    if (result.mode === 'ufvk') {
      return { path: params.path, mode, ufvk: result.fullViewingKey };
    }
    return { path: params.path, mode, orchardFvk: bytesToHex(result.fullViewingKey) };
  });
}

export async function zcashGetShieldedAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: ZcashGetShieldedAddressCallParams
): Promise<{ address: string; path: string }> {
  const signer = await _createZcashSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  return runSignerCall(ctx, sessionId, async () => {
    const result = await signer.getShieldedAddress(path, {
      checkOnDevice: params.showOnDevice ?? false,
    });
    return { address: result.address, path: params.path };
  });
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function _createZcashSigner(ctx: ConnectorContext, sessionId: string): Promise<SignerZcash> {
  const dmk = await ctx.getOrCreateDmk();
  const { SignerZcashBuilder } = await ctx.importLedgerKit('@ledgerhq/device-signer-kit-zcash');
  const sdkSigner = new SignerZcashBuilder({ dmk, sessionId }).build();
  return wireSignerToSession(ctx, sessionId, 'zcash', new SignerZcash(sdkSigner));
}
