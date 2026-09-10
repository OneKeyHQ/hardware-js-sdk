import { HardwareErrorCode, createHwkError } from '../types/errors';
import { createHardwareInteractionId } from './hardwareRuntimeId';

import type { DeviceInfo, VendorType } from '../types/device';

export const INTERACTION_DEFAULT_TTL_MS = 600_000;

export type InteractionEndReason = 'explicit' | 'disconnect' | 'timeout' | 'runtime-reset';

export type HardwareInteraction = {
  interactionId: string;
  searchTargetId: string;
  connectId: string;
  device: DeviceInfo;
  connectionKeys: string[];
  createdAt: number;
  lastActiveAt: number;
};

type EndedInteraction = {
  reason: InteractionEndReason;
  interaction: HardwareInteraction;
};

type InteractionRegistryOptions = {
  vendor: VendorType;
  ttlMs?: number;
  onEnded?: (interaction: HardwareInteraction, reason: InteractionEndReason) => void;
};

/** Runtime-only association between a public interaction id and one live target. */
export class InteractionRegistry {
  private readonly _vendor: VendorType;

  private readonly _ttlMs: number;

  private readonly _onEnded?: InteractionRegistryOptions['onEnded'];

  private readonly _active = new Map<
    string,
    HardwareInteraction & {
      timer: ReturnType<typeof setTimeout> | undefined;
      retainCount: number;
    }
  >();

  private readonly _ended = new Map<string, EndedInteraction>();

  constructor(options: InteractionRegistryOptions) {
    this._vendor = options.vendor;
    this._ttlMs = options.ttlMs ?? INTERACTION_DEFAULT_TTL_MS;
    this._onEnded = options.onEnded;
  }

  create(params: {
    searchTargetId: string;
    connectId: string;
    device: DeviceInfo;
    connectionKeys?: string[];
  }): HardwareInteraction {
    const now = Date.now();
    const interactionId = createHardwareInteractionId(this._vendor);
    const interaction: HardwareInteraction = {
      interactionId,
      searchTargetId: params.searchTargetId,
      connectId: params.connectId,
      device: params.device,
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
    const timer = this._createTimer(interactionId);
    this._active.set(interactionId, { ...interaction, timer, retainCount: 0 });
    return interaction;
  }

  resolve(interactionId: string): HardwareInteraction {
    const active = this._active.get(interactionId);
    if (!active) {
      const ended = this._ended.get(interactionId);
      if (ended) {
        throw createHwkError({
          code: HardwareErrorCode.InteractionEnded,
          message: `Hardware interaction has ended (${ended.reason})`,
          params: { interactionId, reason: ended.reason },
        });
      }
      throw createHwkError({
        code: HardwareErrorCode.InteractionNotFound,
        message: 'Hardware interaction was not found',
        params: { interactionId },
      });
    }

    if (active.timer) clearTimeout(active.timer);
    active.lastActiveAt = Date.now();
    active.timer = active.retainCount === 0 ? this._createTimer(interactionId) : undefined;
    return active;
  }

  /** Keep an interaction alive while one device job is actively using it. */
  retain(interactionId: string): () => void {
    const active = this.resolve(interactionId) as HardwareInteraction & {
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
      const current = this._active.get(interactionId);
      if (!current) return;
      current.retainCount = Math.max(0, current.retainCount - 1);
      current.lastActiveAt = Date.now();
      if (current.retainCount === 0) {
        current.timer = this._createTimer(interactionId);
      }
    };
  }

  /** Return active or tombstoned binding data without refreshing its TTL. */
  find(interactionId: string): HardwareInteraction | undefined {
    return this._active.get(interactionId) ?? this._ended.get(interactionId)?.interaction;
  }

  findActiveByConnectionKey(connectionKey: string): HardwareInteraction | undefined {
    if (!connectionKey) return undefined;
    return [...this._active.values()].find(interaction =>
      interaction.connectionKeys.includes(connectionKey)
    );
  }

  /** Replace the live transport binding after the same target was reconnected. */
  rebind(
    interactionId: string,
    params: {
      connectId: string;
      device: DeviceInfo;
      connectionKeys?: string[];
    }
  ): HardwareInteraction {
    const active = this._active.get(interactionId);
    if (!active) {
      this.resolve(interactionId);
      throw new Error('Unreachable interaction rebind');
    }
    if (active.timer) clearTimeout(active.timer);
    active.connectId = params.connectId;
    active.device = params.device;
    active.connectionKeys = Array.from(
      new Set([params.connectId, ...(params.connectionKeys ?? [])].filter(Boolean))
    );
    active.lastActiveAt = Date.now();
    active.timer = active.retainCount === 0 ? this._createTimer(interactionId) : undefined;
    return active;
  }

  end(interactionId: string, reason: InteractionEndReason): HardwareInteraction | undefined {
    const active = this._active.get(interactionId);
    if (!active) return undefined;
    if (active.timer) clearTimeout(active.timer);
    this._active.delete(interactionId);
    this._rememberEnded(active, reason);
    this._onEnded?.(active, reason);
    return active;
  }

  endByConnectionKey(
    connectionKey: string,
    reason: InteractionEndReason,
    exceptInteractionId?: string
  ): void {
    if (!connectionKey) return;
    for (const interaction of [...this._active.values()]) {
      if (interaction.interactionId === exceptInteractionId) continue;
      if (interaction.connectionKeys.includes(connectionKey)) {
        this.end(interaction.interactionId, reason);
      }
    }
  }

  endAll(reason: InteractionEndReason, exceptInteractionId?: string): void {
    for (const interactionId of [...this._active.keys()]) {
      if (interactionId === exceptInteractionId) continue;
      this.end(interactionId, reason);
    }
  }

  private _createTimer(interactionId: string): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.end(interactionId, 'timeout');
    }, this._ttlMs);
    (
      timer as ReturnType<typeof setTimeout> & {
        unref?: () => void;
      }
    ).unref?.();
    return timer;
  }

  private _rememberEnded(interaction: HardwareInteraction, reason: InteractionEndReason): void {
    this._ended.set(interaction.interactionId, { reason, interaction });
    if (this._ended.size <= 100) return;
    const oldest = this._ended.keys().next().value as string | undefined;
    if (oldest) this._ended.delete(oldest);
  }
}
