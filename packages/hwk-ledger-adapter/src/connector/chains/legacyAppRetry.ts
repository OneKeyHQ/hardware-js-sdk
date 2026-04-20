import { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';
import { isWrongAppError } from '../../errors';
import { AppManager } from '../../app/AppManager';
import type { ConnectorContext } from './types';

/**
 * Status codes that are known to come from a specific chain's app.
 * If we see one of these, the correct app IS open — don't try to switch.
 * Keyed by app name for extensibility.
 */
const KNOWN_APP_CODES: Record<string, Set<number>> = {
  Tron: new Set([
    0x6985, // user denied
    0x5515, // device locked
    0x6a8a, // invalid BIP32 path
    0x6a8b,
    0x6a8c,
    0x6a8d, // app-specific data errors
    0x6a80, // invalid data
    0x6b00, // wrong parameter
    0x6700, // wrong length
  ]),
};

/**
 * Check if an error from a legacy SDK indicates the wrong app is open.
 * Uses the shared isWrongAppError() for common codes (0x6e00, 0x6d00, 0x6a83),
 * plus per-app exclusion of known status codes.
 */
export function isLegacyWrongAppError(err: unknown, appName: string): boolean {
  if (isWrongAppError(err)) return true;
  const msg = err instanceof Error ? err.message : '';
  const match = msg.match(/0x([0-9a-fA-F]{4})/);
  if (!match) return false;
  const sw = parseInt(match[1], 16);
  const knownCodes = KNOWN_APP_CODES[appName];
  if (knownCodes?.has(sw)) return false;
  return true;
}

/**
 * Execute an action with automatic wrong-app retry for legacy SDK chains.
 *
 * 1. Try the action.
 * 2. If wrong-app error, use AppManager to switch to the target app.
 * 3. Retry once with the same session (session survives app switch).
 *
 * Works for any chain that uses a legacy hw-app-* SDK via DmkTransport.
 */
export async function withLegacyAppRetry<T>(
  ctx: ConnectorContext,
  sessionId: string,
  appName: string,
  action: (sid: string) => Promise<T>,
): Promise<T> {
  try {
    return await action(sessionId);
  } catch (err) {
    ctx.emit('ui-event', {
      type: EConnectorInteraction.InteractionComplete,
      payload: { sessionId },
    });
    if (isLegacyWrongAppError(err, appName)) {
      const dmk = await ctx.getOrCreateDmk();
      const appManager = new AppManager(dmk);
      try {
        await appManager.ensureAppOpen(sessionId, appName, () => {
          // Device is showing the confirm prompt — now it's safe to notify UI
          ctx.emit('ui-event', {
            type: EConnectorInteraction.ConfirmOpenApp,
            payload: { sessionId },
          });
        });
      } catch (switchErr) {
        ctx.emit('ui-event', {
          type: EConnectorInteraction.InteractionComplete,
          payload: { sessionId },
        });
        throw ctx.wrapError(switchErr);
      }
      ctx.clearAllSigners();
      ctx.emit('ui-event', {
        type: EConnectorInteraction.InteractionComplete,
        payload: { sessionId },
      });
      return await action(sessionId);
    }
    ctx.invalidateSession(sessionId);
    throw ctx.wrapError(err);
  }
}
