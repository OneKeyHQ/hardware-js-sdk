/**
 * Pure FIFO job queue. Every enqueue chains onto the tail; jobs run one at
 * a time across all devices. The queue is intentionally passive — it does
 * NOT decide whether to interrupt or ask the user. Those are application-
 * layer concerns owned by the caller (e.g. a UI button handler that wants
 * to ask "device is busy, interrupt current?" before submitting). The
 * queue exposes inspection (`getActiveJob`) and explicit cancellation
 * (`cancelActive` / `cancelAll`) so callers can implement those policies
 * synchronously, without racing against in-flight enqueues.
 */

export interface JobOptions {
  label?: string;
  rejectIfBusy?: boolean;
  busyError?: Error;
}

export interface ActiveJobInfo {
  deviceId: string;
  label?: string;
  startedAt: number;
}

interface ActiveJob {
  deviceId: string;
  label?: string;
  abortController: AbortController;
  startedAt: number;
}

export class DeviceJobQueue {
  private _tail: Promise<unknown> = Promise.resolve();

  private _active: ActiveJob | null = null;

  private readonly _jobs = new Map<object, { deviceId: string }>();

  /** Incremented on clear() so queued-but-not-yet-running jobs detect invalidation. */
  private _generation = 0;

  private readonly _generationCancelReasons = new Map<number, Error>();

  /**
   * Enqueue a job. Runs after every previously-enqueued job has settled.
   * `deviceId` is a label only — used by inspection / cancellation routing.
   */
  async enqueue<T>(
    deviceId: string,
    job: (signal: AbortSignal) => Promise<T>,
    options: JobOptions = {}
  ): Promise<T> {
    if (options.rejectIfBusy && this._jobs.size > 0) {
      throw options.busyError ?? new Error('Device is busy');
    }

    const ac = new AbortController();
    const gen = this._generation;
    const prev = this._tail;
    const jobToken = {};
    const activeJob: ActiveJob = {
      deviceId,
      label: options.label,
      abortController: ac,
      startedAt: Date.now(),
    };
    this._jobs.set(jobToken, { deviceId });

    const next = prev
      .catch(() => {})
      .then(async () => {
        if (this._generation !== gen) {
          throw (
            this._generationCancelReasons.get(gen) ?? new Error('Job cancelled: queue was cleared')
          );
        }
        this._active = activeJob;
        try {
          return await job(ac.signal);
        } finally {
          // Identity guard: a previous job's deferred finally must not
          // null out a successor's `_active`.
          if (this._active === activeJob) {
            this._active = null;
          }
        }
      })
      .finally(() => {
        this._jobs.delete(jobToken);
      });

    this._tail = next.catch(() => {});
    return next;
  }

  /** Cancel the active job. If `deviceId` is given, only cancels when it matches. */
  cancelActive(deviceId?: string): boolean {
    if (!this._active) return false;
    if (deviceId && this._active.deviceId !== deviceId) return false;
    this._active.abortController.abort(new Error('Manually cancelled'));
    return true;
  }

  /** Force cancel the active job. `reason` becomes signal.reason. */
  forceCancelActive(deviceId?: string, reason?: Error): boolean {
    if (!this._active) return false;
    if (deviceId && this._active.deviceId !== deviceId) return false;
    this._active.abortController.abort(reason ?? new Error('Force cancelled for recovery'));
    return true;
  }

  /** Cancel the active job (alias for callers that previously needed multi-device cancel). */
  cancelAllActive(reason?: Error): void {
    if (!this._active) return;
    this._active.abortController.abort(reason ?? new Error('Cancelled by cancelAllActive'));
  }

  /** Cancel the active job and invalidate queued jobs that have not started. */
  cancelActiveAndPending(deviceId?: string, reason?: Error): boolean {
    if (deviceId && this._active && this._active.deviceId !== deviceId) {
      return false;
    }
    this.clear(reason ?? new Error('Cancelled by cancelActiveAndPending'));
    return true;
  }

  /** Get info about the currently active job, or null if idle. */
  getActiveJob(deviceId?: string): ActiveJobInfo | null {
    if (!this._active) return null;
    if (deviceId && this._active.deviceId !== deviceId) return null;
    return {
      deviceId: this._active.deviceId,
      label: this._active.label,
      startedAt: this._active.startedAt,
    };
  }

  /** True if any job is currently running. */
  isBusy(): boolean {
    return this._jobs.size > 0;
  }

  clear(reason?: Error): void {
    const cancelledGeneration = this._generation;
    this._generation++;
    const cancelReason = reason ?? new Error('Job cancelled: queue was cleared');
    this._generationCancelReasons.set(cancelledGeneration, cancelReason);
    for (const generation of this._generationCancelReasons.keys()) {
      if (generation < this._generation - 10) {
        this._generationCancelReasons.delete(generation);
      }
    }
    if (this._active) {
      this._active.abortController.abort(cancelReason);
    }
  }
}
