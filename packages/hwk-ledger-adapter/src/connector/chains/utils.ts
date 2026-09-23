import { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';

import { debugLog } from '../../utils/debugLog';

import type { ConnectorContext } from './types';
import type { CancelReason } from '../../signer/deviceActionToPromise';

/**
 * Strip the "m/" prefix from BIP-44 derivation paths.
 * Ledger DMK requires paths without the "m/" prefix.
 */
export function normalizePath(path: string): string {
  return path.startsWith('m/') ? path.slice(2) : path;
}

/**
 * Collapse Ledger DMK's raw `requiredUserInteraction` strings into the
 * subset of EConnectorInteraction variants that share the simple
 * `{ sessionId }` payload shape — used by chain-signer emit sites.
 *
 * DMK emits chain-signer-specific strings like "verify-address",
 * "sign-transaction", "sign-typed-data", "sign-personal-message" — they
 * all mean "the user must act on the device screen", i.e. ConfirmOnDevice
 * per the public ConnectorUiEvent type contract. Leaking raw DMK strings
 * out of the SDK would break consumers that switch on EConnectorInteraction.
 *
 * Note: AppInstallProgress and Searching are NOT in the return type — they
 * carry richer payloads and are emitted from dedicated call sites.
 */
export type CollapsedSignerInteraction =
  | EConnectorInteraction.ConfirmOpenApp
  | EConnectorInteraction.UnlockDevice
  | EConnectorInteraction.InteractionComplete
  | EConnectorInteraction.ConfirmOnDevice;

export function collapseSignerInteraction(interaction: string): CollapsedSignerInteraction {
  switch (interaction) {
    case 'confirm-open-app':
      return EConnectorInteraction.ConfirmOpenApp;
    case 'unlock-device':
      return EConnectorInteraction.UnlockDevice;
    case 'interaction-complete':
      return EConnectorInteraction.InteractionComplete;
    default:
      return EConnectorInteraction.ConfirmOnDevice;
  }
}

interface IInteractiveSigner {
  onInteraction?: (interaction: string) => void;
  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;
}

/** Forward a signer's DMK interactions and canceller to the connector session. */
export function wireSignerToSession<T extends IInteractiveSigner>(
  ctx: ConnectorContext,
  sessionId: string,
  chain: string,
  signer: T
): T {
  signer.onInteraction = (interaction: string) => {
    debugLog(`[LedgerConnector] ${chain}.onInteraction:`, interaction);
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };
  signer.onRegisterCanceller = cancel => ctx.registerCanceller(sessionId, cancel);
  return signer;
}

/** Run a signer call; on failure invalidate the session, always clear the canceller. */
export async function runSignerCall<T>(
  ctx: ConnectorContext,
  sessionId: string,
  call: () => Promise<T>
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  } finally {
    ctx.clearCanceller(sessionId);
  }
}
