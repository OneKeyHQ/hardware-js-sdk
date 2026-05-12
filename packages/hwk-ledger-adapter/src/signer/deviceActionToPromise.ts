import { DeviceActionStatus } from '@ledgerhq/device-management-kit';

import type { DeviceAction, DeviceActionState } from '../types';

/**
 * Idle watchdog: fires iff transport wedged (no DMK emission).
 * 65s > DMK's own 60s waitForDeviceUnlock — DMK fires first in normal
 * cases; we only catch the case where DMK itself is stuck.
 * Paused during interactive pending.
 */
const IDLE_WATCHDOG_MS = 65_000;

/** Optional context attached to the rejection when a canceller fires. */
export interface CancelReason {
  code?: number;
  tag?: string;
  message?: string;
}

/**
 * Convert a DMK DeviceAction (Observable-based) into a Promise.
 * Handles pending -> completed/error state transitions and interaction callbacks.
 *
 * Tracks the last DMK step observed (e.g. `signer.eth.steps.blindSignTransactionFallback`)
 * and attaches it to the rejected error as a non-enumerable `_lastStep` property,
 * so upstream error classifiers can distinguish failure contexts (e.g. Blind signing
 * disabled vs. generic Invalid data).
 *
 * @param timeoutMs  Idle watchdog ms. Re-armed on each emission, paused
 *                   during interactive pending. 0 disables. Default 65s
 *                   (covers DMK's 60s + margin; we're a backstop only).
 * @param onRegisterCanceller  Optional callback that receives a function which, when
 *                             called, unsubscribes and cancels the underlying DeviceAction
 *                             (releases DMK's IntentQueue slot). Caller is responsible
 *                             for invoking the canceller on timeout/abort scenarios.
 */
export function deviceActionToPromise<T>(
  action: DeviceAction<T>,
  onInteraction?: (interaction: string) => void,
  timeoutMs: number = IDLE_WATCHDOG_MS,
  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let lastStep: string | undefined;
    const observedSteps: string[] = [];
    // eslint-disable-next-line prefer-const -- assigned once after declaration, but must be declared before use in cleanup
    let sub: { unsubscribe: () => void };
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** Fully tear down this action: unsubscribe + release DMK intent queue slot. */
    const cancelAction = () => {
      try {
        sub?.unsubscribe();
      } catch {
        // Subscription may already be closed.
      }
      try {
        action.cancel();
      } catch {
        // DMK action may already be settled.
      }
    };

    const armIdleWatchdog = () => {
      if (timer) clearTimeout(timer);
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            cancelAction();
            reject(
              new Error(
                'Ledger transport unresponsive: no DMK state change within the watchdog window. The device may have lost connection.'
              )
            );
          }
        }, timeoutMs);
      }
    };

    armIdleWatchdog();

    // Expose a canceller for external abort. Optional reason tags the rejection.
    if (onRegisterCanceller) {
      onRegisterCanceller(reason => {
        if (settled) {
          return;
        }
        settled = true;
        if (timer) clearTimeout(timer);
        cancelAction();
        const err = new Error(reason?.message ?? 'Device action cancelled');
        if (reason?.code !== undefined) {
          (err as Error & { code?: number }).code = reason.code;
        }
        if (reason?.tag) {
          Object.defineProperty(err, '_tag', {
            value: reason.tag,
            configurable: true,
            enumerable: false,
            writable: true,
          });
        }
        reject(err);
      });
    }

    sub = action.observable.subscribe({
      next: (state: DeviceActionState<T>) => {
        // Drop post-settle emissions to avoid leaking the watchdog.
        if (settled) {
          return;
        }
        armIdleWatchdog();

        // Track last DMK step so caller can disambiguate failure contexts
        // (e.g. 0x6a80 during blindSignTransactionFallback = Blind signing disabled)
        const step = (state as { intermediateValue?: { step?: string } })?.intermediateValue?.step;
        if (step) {
          lastStep = step;
          if (observedSteps[observedSteps.length - 1] !== step) {
            observedSteps.push(step);
          }
        }

        if (state.status === DeviceActionStatus.Completed) {
          settled = true;
          if (timer) clearTimeout(timer);
          onInteraction?.('interaction-complete');
          sub?.unsubscribe();
          resolve(state.output);
        } else if (state.status === DeviceActionStatus.Error) {
          settled = true;
          if (timer) clearTimeout(timer);
          onInteraction?.('interaction-complete');
          sub?.unsubscribe();
          rejectWithStepContext(state.error, lastStep, observedSteps, reject);
        } else if (state.status === DeviceActionStatus.Pending && onInteraction) {
          const interaction = state.intermediateValue?.requiredUserInteraction;
          if (interaction && interaction !== 'none') {
            // unlock-device is DMK's own bounded poll. Other interaction
            // states keep the caller-provided watchdog so a stuck observable
            // cannot hold the queue slot forever.
            if (interaction === 'unlock-device' && timer) {
              clearTimeout(timer);
              timer = null;
            }
            onInteraction(String(interaction));
          }
        }
      },
      error: (err: unknown) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          sub?.unsubscribe();
          rejectWithStepContext(err, lastStep, observedSteps, reject);
        }
      },
      complete: () => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          reject(new Error('Device action completed without result'));
        }
      },
    });
  });
}

/**
 * Reject with the DMK error after annotating observed step context. These
 * fields are non-enumerable so they do not pollute JSON.stringify / log
 * output, but classifiers can still read them.
 */
function rejectWithStepContext(
  err: unknown,
  lastStep: string | undefined,
  observedSteps: string[],
  reject: (reason: unknown) => void
): void {
  if (err && typeof err === 'object' && (lastStep || observedSteps.length > 0)) {
    try {
      if (lastStep) {
        Object.defineProperty(err, '_lastStep', {
          value: lastStep,
          configurable: true,
          enumerable: false,
          writable: true,
        });
      }
      if (observedSteps.length > 0) {
        Object.defineProperty(err, '_deviceActionSteps', {
          value: [...observedSteps],
          configurable: true,
          enumerable: false,
          writable: true,
        });
      }
    } catch {
      // Frozen error objects — give up, classifier will fall back.
    }
  }
  reject(err);
}
