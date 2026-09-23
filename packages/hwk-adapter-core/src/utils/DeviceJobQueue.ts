/**
 * Serializes every device call and gives callers one handle to cancel them. Ordering is already
 * guaranteed by awaiting callers, so what this adds is an AbortController per job, a busy check
 * that rejects double-submits, and generation tracking so a job queued before a teardown doesn't
 * start after it; these races exist even for a sequential caller because cleanup is async.
 *
 * Interrupt-or-ask policy belongs to the caller; `getActiveJob()` is synchronous so a UI handler
 * can look, decide, and submit in one turn without racing an in-flight enqueue.
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

interface CancelScope {
  deviceId: string;
  abortController: AbortController;
}

export interface CancelScopeHandle {
  signal: AbortSignal;
  release: () => void;
}

export class DeviceJobQueue {
  private _tail: Promise<unknown> = Promise.resolve();

  private _active: ActiveJob | null = null;

  private readonly _jobs = new Map<object, ActiveJob>();

  private readonly _cancelScopes = new Map<object, CancelScope>();

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
    this._jobs.set(jobToken, activeJob);

    const next = prev
      .catch(() => {})
      .then(async () => {
        if (this._generation !== gen) {
          throw (
            this._generationCancelReasons.get(gen) ?? new Error('Job cancelled: queue was cleared')
          );
        }
        if (ac.signal.aborted) throw ac.signal.reason;
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

  /**
   * Holds a cancel across the gaps between a bundle's per-item jobs, when the queue is empty.
   * Callers must `release()` when the bundle ends.
   */
  createCancelScope(deviceId: string): CancelScopeHandle {
    const scopeToken = {};
    const abortController = new AbortController();
    this._cancelScopes.set(scopeToken, { deviceId, abortController });
    return {
      signal: abortController.signal,
      release: () => {
        this._cancelScopes.delete(scopeToken);
      },
    };
  }

  /**
   * Cancels the running job only; `reason` becomes signal.reason. Adapters use
   * `cancelActiveAndPending`; this stays for a connector layer that stops only what is on the wire.
   */
  cancelActive(deviceId?: string, reason?: Error): boolean {
    if (!this._active) return false;
    if (deviceId && this._active.deviceId !== deviceId) return false;
    this._active.abortController.abort(reason ?? new Error('Cancelled'));
    return true;
  }

  /**
   * Cancels the active job and unstarted queued jobs; returns whether anything was reached. Only
   * `undefined` means everything: an empty key matches nothing instead of tearing the queue down.
   */
  cancelActiveAndPending(deviceId?: string, reason?: Error): boolean {
    const cancelReason = reason ?? new Error('Cancelled by cancelActiveAndPending');
    if (deviceId !== undefined) {
      let cancelled = false;
      const targets: Map<object, CancelScope>[] = [this._jobs, this._cancelScopes];
      for (const map of targets) {
        for (const target of map.values()) {
          if (target.deviceId !== deviceId) continue;
          target.abortController.abort(cancelReason);
          cancelled = true;
        }
      }
      return cancelled;
    }
    const reached = this._active !== null || this._jobs.size > 0 || this._cancelScopes.size > 0;
    this.clear(cancelReason);
    return reached;
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
    for (const scope of this._cancelScopes.values()) {
      scope.abortController.abort(cancelReason);
    }
  }
}
