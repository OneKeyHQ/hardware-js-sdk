import { DeviceActionStatus } from '@ledgerhq/device-management-kit';
import type { DeviceAction, DeviceActionState } from '../types';

/** Default timeout for non-interactive operations (e.g. getAddress without showOnDevice). */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Debug logging for DMK observable state transitions.
 * Off by default; flip manually when debugging device flows locally.
 */
const DEBUG_DMK_OBSERVABLE = false;

function debugLog(...args: unknown[]): void {
  if (DEBUG_DMK_OBSERVABLE) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
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
 * @param timeoutMs  Timeout in ms. Resets each time the Observable emits (device is alive).
 *                   Pass 0 to disable. Default: 30s.
 */
export function deviceActionToPromise<T>(
  action: DeviceAction<T>,
  onInteraction?: (interaction: string) => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let lastStep: string | undefined;
    // eslint-disable-next-line prefer-const -- assigned once after declaration, but must be declared before use in cleanup
    let sub: { unsubscribe: () => void };
    let timer: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            sub?.unsubscribe();
            reject(new Error('Device action timed out — device may be locked or disconnected'));
          }
        }, timeoutMs);
      }
    };

    // Start initial timer
    resetTimer();

    debugLog('[DMK-Observable] subscribing to action.observable...');
    sub = action.observable.subscribe({
      next: (state: DeviceActionState<T>) => {
        // Device is alive — reset timeout
        resetTimer();

        // Track last DMK step so caller can disambiguate failure contexts
        // (e.g. 0x6a80 during blindSignTransactionFallback = Blind signing disabled)
        const step = (state as { intermediateValue?: { step?: string } })?.intermediateValue?.step;
        if (step) lastStep = step;

        debugLog(
          '[DMK-Observable] state:',
          JSON.stringify({
            status: state.status,
            intermediateValue:
              state.status === DeviceActionStatus.Pending ? state.intermediateValue : undefined,
            hasOutput: state.status === DeviceActionStatus.Completed,
            hasError: state.status === DeviceActionStatus.Error,
          })
        );
        if (settled) return;
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
          rejectWithLastStep(state.error, lastStep, reject);
        } else if (state.status === DeviceActionStatus.Pending && onInteraction) {
          const interaction = state.intermediateValue?.requiredUserInteraction;
          if (interaction && interaction !== 'none') {
            onInteraction(String(interaction));
          }
        }
      },
      error: (err: unknown) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          sub?.unsubscribe();
          rejectWithLastStep(err, lastStep, reject);
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
 * Reject with the DMK error after annotating the last step observed before
 * failure. The step is attached as a non-enumerable property so it doesn't
 * pollute JSON.stringify / log output, but classifiers can still read it via
 * `(err as any)._lastStep`.
 */
function rejectWithLastStep(
  err: unknown,
  lastStep: string | undefined,
  reject: (reason: unknown) => void
): void {
  if (err && typeof err === 'object' && lastStep) {
    try {
      Object.defineProperty(err, '_lastStep', {
        value: lastStep,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    } catch {
      // Frozen error objects — give up, classifier will fall back.
    }
  }
  reject(err);
}
