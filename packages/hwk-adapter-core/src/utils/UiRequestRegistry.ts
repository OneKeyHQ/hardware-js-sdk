import { UI_REQUEST, UI_RESPONSE } from '../events/ui-request';

/** 10 min — every UI request is human-in-the-loop; bias toward "wait long". */
export const UI_REQUEST_DEFAULT_TIMEOUT_MS = 600_000;

const RESPONSE_TO_REQUEST: Record<string, string> = {
  [UI_RESPONSE.RECEIVE_PIN]: UI_REQUEST.REQUEST_PIN,
  [UI_RESPONSE.RECEIVE_PASSPHRASE]: UI_REQUEST.REQUEST_PASSPHRASE,
  [UI_RESPONSE.RECEIVE_PASSPHRASE_ON_DEVICE]: UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE,
  [UI_RESPONSE.RECEIVE_SELECT_DEVICE]: UI_REQUEST.REQUEST_SELECT_DEVICE,
  [UI_RESPONSE.RECEIVE_DEVICE_CONNECT]: UI_REQUEST.REQUEST_DEVICE_CONNECT,
  [UI_RESPONSE.RECEIVE_PREEMPTION]: UI_REQUEST.REQUEST_PREEMPTION,
  // RECEIVE_QR_RESPONSE maps to QR_DISPLAY or QR_SCAN — resolved dynamically below.
};

export const UI_REQUEST_PREEMPTED_TAG = 'UiRequestPreempted';
export const UI_REQUEST_CANCELLED_TAG = 'UiRequestCancelled';
export const UI_REQUEST_TIMEOUT_TAG = 'UiRequestTimeout';

type PendingEntry = {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Per-type single-slot registry for adapter-level UI requests. A new `wait`
 * of the same type preempts (rejects) the prior one. Unknown response types
 * are dropped silently so the public `uiResponse` entry never throws.
 */
export class UiRequestRegistry {
  private pending = new Map<string, PendingEntry>();

  wait<T = unknown>(
    requestType: string,
    options?: { timeoutMs?: number }
  ): Promise<T> {
    const existing = this.pending.get(requestType);
    if (existing) {
      clearTimeout(existing.timer);
      this.pending.delete(requestType);
      existing.reject(
        Object.assign(
          new Error(`UI request '${requestType}' was superseded by a new request`),
          { _tag: UI_REQUEST_PREEMPTED_TAG }
        )
      );
    }

    const timeoutMs = options?.timeoutMs ?? UI_REQUEST_DEFAULT_TIMEOUT_MS;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.get(requestType)?.timer === timer) {
          this.pending.delete(requestType);
          reject(
            Object.assign(
              new Error(`UI request '${requestType}' timed out after ${timeoutMs}ms`),
              { _tag: UI_REQUEST_TIMEOUT_TAG }
            )
          );
        }
      }, timeoutMs);

      this.pending.set(requestType, {
        resolve: resolve as (payload: unknown) => void,
        reject,
        timer,
      });
    });
  }

  resolve(responseType: string, payload: unknown): void {
    let requestType = RESPONSE_TO_REQUEST[responseType];
    if (responseType === UI_RESPONSE.RECEIVE_QR_RESPONSE) {
      if (this.pending.has(UI_REQUEST.REQUEST_QR_DISPLAY)) {
        requestType = UI_REQUEST.REQUEST_QR_DISPLAY;
      } else if (this.pending.has(UI_REQUEST.REQUEST_QR_SCAN)) {
        requestType = UI_REQUEST.REQUEST_QR_SCAN;
      }
    }
    if (!requestType) return;

    const entry = this.pending.get(requestType);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.pending.delete(requestType);
    entry.resolve(payload);
  }

  cancel(requestType?: string): void {
    if (requestType) {
      const entry = this.pending.get(requestType);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(requestType);
      entry.reject(
        Object.assign(new Error(`UI request '${requestType}' was cancelled`), {
          _tag: UI_REQUEST_CANCELLED_TAG,
        })
      );
      return;
    }

    for (const [type, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(
        Object.assign(new Error(`UI request '${type}' was cancelled`), {
          _tag: UI_REQUEST_CANCELLED_TAG,
        })
      );
    }
    this.pending.clear();
  }

  reset(): void {
    this.cancel();
  }

  hasPending(requestType: string): boolean {
    return this.pending.has(requestType);
  }
}
