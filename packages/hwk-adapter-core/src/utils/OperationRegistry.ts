import { HardwareErrorCode, createHwkError } from '../types/errors';
import { createHardwareOperationId } from './hardwareRuntimeId';

import type { ConnectionType, DeviceInfo, VendorType } from '../types/device';

export const OPERATION_DEFAULT_TTL_MS = 600_000;

export type OperationEndReason = 'explicit' | 'disconnect' | 'timeout' | 'runtime-reset';

export type HardwareOperation = {
  operationId: string;
  connectId: string;
  device: DeviceInfo;
  /**
   * The channel this operation actually runs on. Required on `create` and
   * `rebind` so it comes from whichever adapter picked the channel, rather
   * than being read back off `device`, whose snapshot a combined connector
   * fills with a nominal value.
   */
  connectionType: ConnectionType;
  connectionKeys: string[];
  createdAt: number;
  lastActiveAt: number;
};

type EndedOperation = {
  reason: OperationEndReason;
  operation: HardwareOperation;
};

type OperationRegistryOptions = {
  vendor: VendorType;
  ttlMs?: number;
  onEnded?: (operation: HardwareOperation, reason: OperationEndReason) => void;
};

/** Runtime-only association between a public operation id and one live target. */
export class OperationRegistry {
  private readonly _vendor: VendorType;

  private readonly _ttlMs: number;

  private readonly _onEnded?: OperationRegistryOptions['onEnded'];

  private readonly _active = new Map<
    string,
    HardwareOperation & {
      timer: ReturnType<typeof setTimeout> | undefined;
      retainCount: number;
    }
  >();

  private readonly _ended = new Map<string, EndedOperation>();

  constructor(options: OperationRegistryOptions) {
    this._vendor = options.vendor;
    this._ttlMs = options.ttlMs ?? OPERATION_DEFAULT_TTL_MS;
    this._onEnded = options.onEnded;
  }

  create(params: {
    searchTargetId: string;
    connectId: string;
    device: DeviceInfo;
    connectionType: ConnectionType;
    connectionKeys?: string[];
  }): HardwareOperation {
    const now = Date.now();
    const operationId = createHardwareOperationId(this._vendor);
    const operation: HardwareOperation = {
      operationId,
      connectId: params.connectId,
      device: params.device,
      connectionType: params.connectionType,
      connectionKeys: Array.from(
        new Set(
          [params.searchTargetId, params.connectId, ...(params.connectionKeys ?? [])].filter(
            Boolean
          )
        )
      ),
      createdAt: now,
      lastActiveAt: now,
    };
    const timer = this._createTimer(operationId);
    this._active.set(operationId, { ...operation, timer, retainCount: 0 });
    return operation;
  }

  resolve(operationId: string): HardwareOperation {
    const active = this._active.get(operationId);
    if (!active) {
      const ended = this._ended.get(operationId);
      if (ended) {
        throw createHwkError({
          code: HardwareErrorCode.OperationEnded,
          message: `Hardware operation has ended (${ended.reason})`,
          params: { operationId, reason: ended.reason },
        });
      }
      throw createHwkError({
        code: HardwareErrorCode.OperationNotFound,
        message: 'Hardware operation was not found',
        params: { operationId },
      });
    }

    if (active.timer) clearTimeout(active.timer);
    active.lastActiveAt = Date.now();
    active.timer = active.retainCount === 0 ? this._createTimer(operationId) : undefined;
    return active;
  }

  /** Keep an operation alive while one device job is actively using it. */
  retain(operationId: string): () => void {
    const active = this.resolve(operationId) as HardwareOperation & {
      timer: ReturnType<typeof setTimeout> | undefined;
      retainCount: number;
    };
    if (active.timer) clearTimeout(active.timer);
    active.timer = undefined;
    active.retainCount += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this._active.get(operationId);
      if (!current) return;
      current.retainCount = Math.max(0, current.retainCount - 1);
      current.lastActiveAt = Date.now();
      if (current.retainCount === 0) {
        current.timer = this._createTimer(operationId);
      }
    };
  }

  /** Return active or tombstoned binding data without refreshing its TTL. */
  find(operationId: string): HardwareOperation | undefined {
    return this._active.get(operationId) ?? this._ended.get(operationId)?.operation;
  }

  findActiveByConnectionKey(connectionKey: string): HardwareOperation | undefined {
    if (!connectionKey) return undefined;
    return [...this._active.values()].find(operation =>
      operation.connectionKeys.includes(connectionKey)
    );
  }

  /** Replace the live transport binding after the same target was reconnected. */
  rebind(
    operationId: string,
    params: {
      connectId: string;
      device: DeviceInfo;
      connectionType: ConnectionType;
      connectionKeys?: string[];
    }
  ): HardwareOperation {
    const active = this._active.get(operationId);
    if (!active) {
      this.resolve(operationId);
      throw new Error('Unreachable operation rebind');
    }
    if (active.timer) clearTimeout(active.timer);
    active.connectId = params.connectId;
    active.device = params.device;
    active.connectionType = params.connectionType;
    active.connectionKeys = Array.from(
      new Set([params.connectId, ...(params.connectionKeys ?? [])].filter(Boolean))
    );
    active.lastActiveAt = Date.now();
    active.timer = active.retainCount === 0 ? this._createTimer(operationId) : undefined;
    return active;
  }

  end(operationId: string, reason: OperationEndReason): HardwareOperation | undefined {
    const active = this._active.get(operationId);
    if (!active) return undefined;
    if (active.timer) clearTimeout(active.timer);
    this._active.delete(operationId);
    this._rememberEnded(active, reason);
    this._onEnded?.(active, reason);
    return active;
  }

  endByConnectionKey(
    connectionKey: string,
    reason: OperationEndReason,
    exceptOperationId?: string
  ): void {
    if (!connectionKey) return;
    for (const operation of [...this._active.values()]) {
      if (operation.operationId === exceptOperationId) continue;
      if (operation.connectionKeys.includes(connectionKey)) {
        this.end(operation.operationId, reason);
      }
    }
  }

  endAll(reason: OperationEndReason, exceptOperationId?: string): void {
    for (const operationId of [...this._active.keys()]) {
      if (operationId === exceptOperationId) continue;
      this.end(operationId, reason);
    }
  }

  private _createTimer(operationId: string): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.end(operationId, 'timeout');
    }, this._ttlMs);
    (
      timer as ReturnType<typeof setTimeout> & {
        unref?: () => void;
      }
    ).unref?.();
    return timer;
  }

  private _rememberEnded(operation: HardwareOperation, reason: OperationEndReason): void {
    this._ended.set(operation.operationId, { reason, operation });
    if (this._ended.size <= 100) return;
    const oldest = this._ended.keys().next().value as string | undefined;
    if (oldest) this._ended.delete(oldest);
  }
}
