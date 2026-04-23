import { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';

import { isWrongAppError } from '../../errors';
import { AppManager } from '../../app/AppManager';

import type { ConnectorContext } from './types';

/**
 * Wrong-app detection for legacy SDKs. Wraps isWrongAppError so callers don't
 * depend on the shared function directly.
 *
 * Prior versions also treated "any 4-hex code not in a per-app allowlist" as
 * wrong-app, to catch cases where the message format hid the real status.
 * That was too aggressive: legacy hw-app-* throws TransportStatusError with a
 * numeric `statusCode` that isWrongAppError already handles via hasStatusCode,
 * so the regex path was dead weight for real errors and only fired on
 * unanticipated message shapes (random hex in logs, new firmware SWs) —
 * producing spurious app close→reopen cycles. `appName` is kept on the
 * signature for future per-app extension points.
 */
export function isLegacyWrongAppError(err: unknown, _appName: string): boolean {
  return isWrongAppError(err);
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
  action: (sid: string) => Promise<T>
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
