import { HardwareErrorCode, padHex64, stripHex } from '@onekeyfe/hwk-adapter-core';

import { collapseSignerInteraction, normalizePath } from './utils';
import { debugLog } from '../../utils/debugLog';

import type { TypedData } from '@ledgerhq/device-signer-kit-ethereum';
import type { SignerEvmSignature } from '../../types';
import type { ConnectorContext } from './types';

// ---------------------------------------------------------------------------
// Call param types
// ---------------------------------------------------------------------------

export interface EvmGetAddressCallParams {
  path: string;
  showOnDevice?: boolean;
}

export interface EvmSignTransactionCallParams {
  path: string;
  /** RLP-serialized transaction hex (0x-prefixed or plain) */
  serializedTx?: string;
}

export interface EvmSignMessageCallParams {
  path: string;
  message: string;
}

export interface EvmSignTypedDataCallParams {
  path: string;
  data: TypedData;
  mode?: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function evmGetAddress(
  ctx: ConnectorContext,
  sessionId: string,
  params: EvmGetAddressCallParams
): Promise<{ address: string; publicKey?: string }> {
  const signer = await _getEthSigner(ctx, sessionId);
  const path = normalizePath(params.path);
  const checkOnDevice = params.showOnDevice ?? false;
  debugLog('[DMK] evmGetAddress -> signer.getAddress:', { path, checkOnDevice });

  try {
    const result = await signer.getAddress(path, { checkOnDevice });
    return { address: result.address, publicKey: result.publicKey };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function evmSignTransaction(
  ctx: ConnectorContext,
  sessionId: string,
  params: EvmSignTransactionCallParams
): Promise<{ v: string; r: string; s: string }> {
  if (!params.serializedTx) {
    throw Object.assign(
      new Error(
        'Ledger requires a pre-serialized transaction (serializedTx). Provide an RLP-encoded hex string.'
      ),
      { code: HardwareErrorCode.InvalidParams }
    );
  }

  const signer = await _getEthSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const result: SignerEvmSignature = await signer.signTransaction(path, params.serializedTx);
    return {
      v: `0x${result.v.toString(16)}`,
      r: padHex64(result.r),
      s: padHex64(result.s),
    };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function evmSignMessage(
  ctx: ConnectorContext,
  sessionId: string,
  params: EvmSignMessageCallParams
): Promise<{ signature: string }> {
  const signer = await _getEthSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const result: SignerEvmSignature = await signer.signMessage(path, params.message);
    const rHex = stripHex(result.r).padStart(64, '0');
    const sHex = stripHex(result.s).padStart(64, '0');
    const vHex = result.v.toString(16).padStart(2, '0');
    return { signature: `0x${rHex}${sHex}${vHex}` };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

export async function evmSignTypedData(
  ctx: ConnectorContext,
  sessionId: string,
  params: EvmSignTypedDataCallParams
): Promise<{ signature: string }> {
  if (params.mode === 'hash') {
    throw Object.assign(
      new Error(
        'Ledger does not support hash-only EIP-712 signing. Use mode "full" with the complete typed data structure.'
      ),
      { code: HardwareErrorCode.MethodNotSupported }
    );
  }

  const signer = await _getEthSigner(ctx, sessionId);
  const path = normalizePath(params.path);

  try {
    const result: SignerEvmSignature = await signer.signTypedData(path, params.data);
    const rHex = stripHex(result.r).padStart(64, '0');
    const sHex = stripHex(result.s).padStart(64, '0');
    const vHex = result.v.toString(16).padStart(2, '0');
    return { signature: `0x${rHex}${sHex}${vHex}` };
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Internal — ETH signer creation
// ---------------------------------------------------------------------------

async function _getEthSigner(ctx: ConnectorContext, sessionId: string) {
  const signerManager = await ctx.getSignerManager();
  const signer = await signerManager.getOrCreate(sessionId);

  // Wire up interaction events (open-app, unlock, verify-address, sign, etc.)
  // DMK-specific values (verify-address, sign-transaction, sign-typed-data,
  // sign-personal-message) collapse to ConfirmOnDevice via the helper.
  signer.onInteraction = (interaction: string) => {
    debugLog('[LedgerConnector] evm.onInteraction:', interaction);
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };

  // Expose DeviceAction canceller to the connector so that cancel(sessionId)
  // can release DMK's intent queue slot and unsubscribe cleanly.
  signer.onRegisterCanceller = cancel => {
    ctx.registerCanceller(sessionId, cancel);
  };

  return signer;
}
