/**
 * Per-device serial job queue with preemption support and stuck recovery.
 * Ensures that only one operation runs at a time per device, with intelligent
 * handling of conflicting operations.
 *
 * The 'confirm' level uses the standard UI request/response flow:
 * emits REQUEST_PREEMPTION → waits for RECEIVE_PREEMPTION via UiRequestRegistry.
 */

import { UI_REQUEST } from '../events/ui-request';
import type { UiRequestRegistry } from './UiRequestRegistry';

export type Interruptibility = 'none' | 'safe' | 'confirm';

export type PreemptionDecision = 'cancel-current' | 'wait' | 'reject-new';

export interface JobOptions {
  interruptibility?: Interruptibility;
  label?: string;
}

export interface ActiveJobInfo {
  label?: string;
  interruptibility: Interruptibility;
  startedAt: number;
}

export interface PreemptionEvent {
  deviceId: string;
  currentJob: ActiveJobInfo;
  newJob: { label?: string; interruptibility: Interruptibility };
}

interface ActiveJob {
  options: Required<Pick<JobOptions, 'interruptibility'>> & Pick<JobOptions, 'label'>;
  abortController: AbortController;
  startedAt: number;
}

export interface DeviceJobQueueDeps {
  /** Emit a UI request event to the frontend. */
  emit: (event: string, data: unknown) => void;
  /** Registry for waiting on UI responses. */
  uiRegistry: UiRequestRegistry;
}

export class DeviceJobQueue {
  private readonly _queues = new Map<string, Promise<unknown>>();
  private readonly _active = new Map<string, ActiveJob>();
  private readonly _deps: DeviceJobQueueDeps | null;

  constructor(deps?: DeviceJobQueueDeps) {
    this._deps = deps ?? null;
  }

  /**
   * Enqueue a job for a specific device.
   * If a job is already running for this device, behavior depends on interruptibility:
   * - 'none': new job queues silently (no preemption possible)
   * - 'safe': current job is auto-cancelled, new job runs immediately after
   * - 'confirm': emits REQUEST_PREEMPTION and waits for UI response
   */
  async enqueue<T>(
    deviceId: string,
    job: (signal: AbortSignal) => Promise<T>,
    options: JobOptions = {}
  ): Promise<T> {
    const interruptibility = options.interruptibility ?? 'confirm';
    const active = this._active.get(deviceId);

    if (active) {
      switch (active.options.interruptibility) {
        case 'none':
          // Cannot interrupt, just queue behind
          break;
        case 'safe':
          // Auto-cancel current safe operation
          active.abortController.abort(new Error('Preempted by new operation'));
          break;
        case 'confirm': {
          // If a preemption dialog is already pending, reject immediately.
          // The user is already deciding for a previous request — don't
          // overwrite the UiRequestRegistry slot (single-slot per type).
          if (this._deps?.uiRegistry.hasPending(UI_REQUEST.REQUEST_PREEMPTION)) {
            throw Object.assign(
              new Error(`Device busy: a preemption decision is already pending`),
              { hardwareErrorCode: 'DEVICE_BUSY' }
            );
          }
          const decision = await this._requestPreemptionDecision(deviceId, active, {
            label: options.label,
            interruptibility,
          });
          switch (decision) {
            case 'cancel-current':
              active.abortController.abort(new Error('Cancelled by user via preemption'));
              break;
            case 'reject-new':
              throw Object.assign(
                new Error(`Device busy: ${active.options.label ?? 'unknown operation'}`),
                { hardwareErrorCode: 'DEVICE_BUSY' }
              );
            case 'wait':
              break;
          }
          break;
        }
      }
    }

    const ac = new AbortController();
    const prev = this._queues.get(deviceId) ?? Promise.resolve();

    const next = prev
      .catch(() => {})
      .then(async () => {
        this._active.set(deviceId, {
          options: { interruptibility, label: options.label },
          abortController: ac,
          startedAt: Date.now(),
        });
        try {
          return await job(ac.signal);
        } finally {
          this._active.delete(deviceId);
        }
      });

    const tail = next.catch(() => {});
    this._queues.set(deviceId, tail);
    tail.then(() => {
      if (this._queues.get(deviceId) === tail) {
        this._queues.delete(deviceId);
      }
    });
    return next;
  }

  /** Manually cancel the active job on a device. Returns false if job is non-interruptible. */
  cancelActive(deviceId: string): boolean {
    const active = this._active.get(deviceId);
    if (!active) return false;
    if (active.options.interruptibility === 'none') return false;
    active.abortController.abort(new Error('Manually cancelled'));
    return true;
  }

  /** Force cancel regardless of interruptibility. Use for device stuck recovery. */
  forceCancelActive(deviceId: string): boolean {
    const active = this._active.get(deviceId);
    if (!active) return false;
    active.abortController.abort(new Error('Force cancelled for recovery'));
    return true;
  }

  /** Get info about the currently active job for a device, or null if idle. */
  getActiveJob(deviceId: string): ActiveJobInfo | null {
    const active = this._active.get(deviceId);
    if (!active) return null;
    return {
      label: active.options.label,
      interruptibility: active.options.interruptibility,
      startedAt: active.startedAt,
    };
  }

  clear(): void {
    for (const active of this._active.values()) {
      active.abortController.abort(new Error('Queue cleared'));
    }
    this._active.clear();
    this._queues.clear();
  }

  /**
   * Request preemption decision via UI request/response flow.
   * Falls back to 'wait' if deps are not provided.
   */
  private async _requestPreemptionDecision(
    deviceId: string,
    active: ActiveJob,
    newJob: { label?: string; interruptibility: Interruptibility }
  ): Promise<PreemptionDecision> {
    if (!this._deps) return 'wait';

    const { emit, uiRegistry } = this._deps;

    emit(UI_REQUEST.REQUEST_PREEMPTION, {
      type: UI_REQUEST.REQUEST_PREEMPTION,
      payload: {
        deviceId,
        currentJob: {
          label: active.options.label,
          interruptibility: active.options.interruptibility,
          startedAt: active.startedAt,
        },
        newJob,
      },
    });

    const response = await uiRegistry.wait<{ decision: PreemptionDecision }>(
      UI_REQUEST.REQUEST_PREEMPTION
    );

    return response?.decision ?? 'wait';
  }
}
