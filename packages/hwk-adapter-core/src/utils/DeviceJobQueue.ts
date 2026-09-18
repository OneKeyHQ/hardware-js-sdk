/**
 * Serializes every device call and gives callers one handle to cancel them.
 *
 * Ordering is the lesser half of the job: calls already await each other, and
 * nothing in the app issues two device operations at once. What this buys is
 * the rest — an AbortController per job so a cancel has something to pull, a
 * busy check so a double-submit is refused rather than queued, and generation
 * tracking so a job that was queued before a teardown does not start after it.
 * Those races exist in a perfectly sequential caller, because cleanup is async.
 *
 * The queue never decides whether to interrupt or ask the user; the caller owns
 * that. `getActiveJob()` reads synchronously so a UI handler can look, decide,
 * and submit in one turn without racing an in-flight enqueue.
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
   * Open a cancellation scope that outlives the individual jobs under it.
   *
   * A bundle (all-network) does not enqueue itself — it enqueues one job per
   * item. Between two items the queue is empty, so a cancel landing in that
   * gap finds nothing to abort and the next item goes to the device anyway.
   * The scope holds the cancel across those gaps; the bundle checks its
   * signal before each item. Callers must `release()` when the bundle ends.
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
   * Cancel the running job. `reason` becomes signal.reason.
   *
   * No caller today: every adapter cancel wants the queued work invalidated
   * too and uses `cancelActiveAndPending`. Kept for a connector layer that
   * needs to stop only what is on the wire and leave the queue behind it.
   */
  cancelActive(deviceId?: string, reason?: Error): boolean {
    if (!this._active) return false;
    if (deviceId && this._active.deviceId !== deviceId) return false;
    this._active.abortController.abort(reason ?? new Error('Cancelled'));
    return true;
  }

  /**
   * Cancel the active job and invalidate queued jobs that have not started.
   *
   * Only `undefined` means "everything". An empty string is a queue key that
   * derived to nothing, so it matches nothing and reports `false` rather than
   * silently tearing the whole queue down.
   *
   * Returns what the cancel actually reached, not whether it was accepted.
   */
  cancelActiveAndPending(deviceId?: string, reason?: Error): boolean {
    const cancelReason = reason ?? new Error('Cancelled by cancelActiveAndPending');
    if (deviceId !== undefined) {
      let cancelled = false;
      for (const job of this._jobs.values()) {
        if (job.deviceId === deviceId) {
          job.abortController.abort(cancelReason);
          cancelled = true;
        }
      }
      for (const scope of this._cancelScopes.values()) {
        if (scope.deviceId === deviceId) {
          scope.abortController.abort(cancelReason);
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
