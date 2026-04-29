import { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';

import { isWrongAppError } from '../../errors';
import { AppManager } from '../../app/AppManager';
import { debugLog } from '../../utils/debugLog';

import type { ConnectorContext } from './types';

export interface LegacyChainCallOptions {
  /** Target Ledger app name, e.g. 'Tron' / 'XRP' / 'Cardano'. */
  appName: string;
  /**
   * Whether the action triggers an on-device confirm prompt (sign, verify).
   * Controls the ConfirmOnDevice / InteractionComplete pair around `action`.
   * `false` for silent ops like getAddress(showOnDevice=false).
   */
  needsConfirmation: boolean;
}

/** `appName` reserved for future per-app extension. */
export function isLegacyWrongAppError(err: unknown, _appName: string): boolean {
  return isWrongAppError(err);
}

/**
 * Run a legacy-SDK device call (TRON et al. that lack `@ledgerhq/device-signer-kit-*`):
 *   1. ensureAppOpen pre-flight (legacy hw-app-* bypasses DMK DeviceAction).
 *   2. Emit ConfirmOnDevice when `needsConfirmation`.
 *   3. action().
 *   4. Always close any prompt with InteractionComplete (symmetric on success/failure).
 *   5. Retry once on wrong-app: re-ensure + clear signers + rerun action.
 */
export async function withLegacyChainCall<T>(
  ctx: ConnectorContext,
  sessionId: string,
  options: LegacyChainCallOptions,
  action: (sid: string) => Promise<T>
): Promise<T> {
  const { appName, needsConfirmation } = options;

  // wrapError calls below pass `{ defaultAppName: appName }` explicitly even
  // though LedgerConnectorBase.dispatcher already injects it via _ctxForMethod.
  // Reason: this utility receives `appName` as an own parameter — it is the
  // source of truth for which app it's calling, so it must not silently rely
  // on whatever wrapError happens to be on the ctx passed in. If a future
  // caller invokes withLegacyChainCall outside the dispatcher, behavior stays
  // correct.

  // Tracks whether ensureAppOpen showed ConfirmOpenApp; if so the UI atom is
  // `openApp` and we owe a matching InteractionComplete.
  let openAppPromptShown = false;
  const onAppOpenPrompt = () => {
    openAppPromptShown = true;
    ctx.emit('ui-event', {
      type: EConnectorInteraction.ConfirmOpenApp,
      payload: { sessionId },
    });
  };

  // For bail-out paths that skip runOnce's finally (e.g. ensureAppOpen throws).
  const closeOpenAppUiIfShown = () => {
    if (openAppPromptShown) {
      ctx.emit('ui-event', {
        type: EConnectorInteraction.InteractionComplete,
        payload: { sessionId },
      });
      openAppPromptShown = false;
    }
  };

  // ① Pre-flight ensureAppOpen.
  try {
    await _ensureAppOpen(ctx, sessionId, appName, onAppOpenPrompt);
  } catch (err) {
    debugLog(
      '[LegacyChainCall] pre-flight ensureAppOpen failed:',
      appName,
      (err as Error)?.message
    );
    closeOpenAppUiIfShown();
    throw ctx.wrapError(err, { defaultAppName: appName });
  }

  const runOnce = async (): Promise<T> => {
    let confirmEmitted = false;
    if (needsConfirmation) {
      ctx.emit('ui-event', {
        type: EConnectorInteraction.ConfirmOnDevice,
        payload: { sessionId },
      });
      confirmEmitted = true;
    }

    try {
      return await action(sessionId);
    } finally {
      // Symmetry: any prompt we showed (ConfirmOpenApp or ConfirmOnDevice)
      // is closed here, on both success and failure. If neither was shown,
      // we don't fire a stray Complete (the UI atom was already undefined).
      if (confirmEmitted || openAppPromptShown) {
        ctx.emit('ui-event', {
          type: EConnectorInteraction.InteractionComplete,
          payload: { sessionId },
        });
        openAppPromptShown = false;
      }
    }
  };

  try {
    return await runOnce();
  } catch (err) {
    if (!isLegacyWrongAppError(err, appName)) {
      debugLog('[LegacyChainCall] non-wrong-app failure:', appName, (err as Error)?.message);
      ctx.invalidateSession(sessionId);
      throw ctx.wrapError(err, { defaultAppName: appName });
    }

    // ② Wrong-app fallback: user may have switched app between ① and the
    //    action, or some edge state slipped through. Re-ensure and retry once.
    debugLog('[LegacyChainCall] wrong-app detected, retrying:', appName);
    try {
      await _ensureAppOpen(ctx, sessionId, appName, onAppOpenPrompt);
    } catch (switchErr) {
      debugLog(
        '[LegacyChainCall] retry ensureAppOpen failed:',
        appName,
        (switchErr as Error)?.message
      );
      closeOpenAppUiIfShown();
      throw ctx.wrapError(switchErr, { defaultAppName: appName });
    }
    ctx.clearAllSigners();

    const result = await runOnce();
    debugLog('[LegacyChainCall] retry succeeded:', appName);
    return result;
  }
}

async function _ensureAppOpen(
  ctx: ConnectorContext,
  sessionId: string,
  appName: string,
  onPrompt: () => void
): Promise<void> {
  const dmk = await ctx.getOrCreateDmk();
  const appManager = new AppManager(dmk);
  await appManager.ensureAppOpen(sessionId, appName, onPrompt);
}
