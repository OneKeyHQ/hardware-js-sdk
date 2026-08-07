import { ProtocolV2SequenceCursor } from './sequence-cursor';
import { ProtocolV2LinkError } from './errors';
import { ProtocolV2Session, getErrorMessage } from './session';

import type { MessageFromOneKey, TransportCallOptions } from '../../types';
import type { ProtocolV2CallContext, ProtocolV2Schemas, ProtocolV2SessionOptions } from './session';

export type ProtocolV2LinkErrorClassification = 'link-fatal' | 'recoverable';

export interface ProtocolV2LinkAdapter {
  router: number;
  maxFrameBytes?: number;
  generation: number;
  prepareCall(context: ProtocolV2CallContext): Promise<void> | void;
  writeFrame(frame: Uint8Array, context: ProtocolV2CallContext): Promise<void>;
  readFrame(context: ProtocolV2CallContext): Promise<Uint8Array>;
  reset(reason: string): Promise<void> | void;
  logger?: ProtocolV2SessionOptions['logger'];
  logPrefix?: string;
  createTimeoutError?: ProtocolV2SessionOptions['createTimeoutError'];
}

export type ProtocolV2LinkManagerOptions<Key> = {
  getSchemas: () => ProtocolV2Schemas;
  classifyError: (error: unknown) => ProtocolV2LinkErrorClassification;
  onLinkInvalidated?: (key: Key, reason: string) => Promise<void> | void;
};

type ProtocolV2Link = {
  adapter: ProtocolV2LinkAdapter;
  session: ProtocolV2Session;
  state: {
    invalidatedReason?: string;
  };
};

export class ProtocolV2LinkManager<Key> {
  private readonly links = new Map<Key, ProtocolV2Link>();

  private readonly sequences = new Map<Key, ProtocolV2SequenceCursor>();

  private readonly callQueues = new Map<Key, Promise<unknown>>();

  private readonly generations = new Map<Key, number>();

  private readonly invalidationReasons = new Map<Key, { generation: number; reason: string }>();

  private readonly invalidations = new Map<Key, Promise<void>>();

  private readonly options: ProtocolV2LinkManagerOptions<Key>;

  constructor(options: ProtocolV2LinkManagerOptions<Key>) {
    this.options = options;
  }

  call(
    key: Key,
    createAdapter: () => ProtocolV2LinkAdapter,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ): Promise<MessageFromOneKey> {
    const generation = this.generations.get(key) ?? 0;
    const run = () => {
      this.assertCallGeneration(key, generation);
      return this.executeCall(key, createAdapter, name, data, options);
    };
    const previous = this.callQueues.get(key) ?? Promise.resolve();
    const result = previous.then(run, run);
    const queue = result.catch(() => undefined);
    this.callQueues.set(key, queue);
    result
      .then(
        () => this.clearSettledCallQueue(key, queue),
        () => this.clearSettledCallQueue(key, queue)
      )
      .catch(() => undefined);
    return result;
  }

  async invalidateLink(key: Key, reason: string): Promise<void> {
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    this.invalidationReasons.set(key, { generation, reason });

    const pendingInvalidation = this.invalidations.get(key);
    const link = this.links.get(key);
    if (!link) {
      await pendingInvalidation;
      return;
    }

    this.links.delete(key);
    link.state.invalidatedReason = reason;
    const invalidation = (async () => {
      await pendingInvalidation?.catch(() => undefined);
      await link.adapter.reset(reason);
      await this.options.onLinkInvalidated?.(key, reason);
    })();
    this.invalidations.set(key, invalidation);

    try {
      await invalidation;
    } finally {
      if (this.invalidations.get(key) === invalidation) {
        this.invalidations.delete(key);
      }
    }
  }

  async invalidateAllLinks(reason: string): Promise<void> {
    const keys = new Set([
      ...this.links.keys(),
      ...this.callQueues.keys(),
      ...this.invalidations.keys(),
    ]);
    await Promise.all(Array.from(keys, key => this.invalidateLink(key, reason)));
  }

  async dispose(reason: string): Promise<void> {
    await this.invalidateAllLinks(reason);
    this.sequences.clear();
    this.callQueues.clear();
    this.invalidations.clear();
  }

  private getOrCreateLink(key: Key, createAdapter: () => ProtocolV2LinkAdapter): ProtocolV2Link {
    const existing = this.links.get(key);
    if (existing) return existing;

    const adapter = createAdapter();
    const state: ProtocolV2Link['state'] = {};
    const assertLinkActive = () => {
      if (state.invalidatedReason) {
        throw new Error(state.invalidatedReason);
      }
    };
    let sequenceCursor = this.sequences.get(key);
    if (!sequenceCursor) {
      sequenceCursor = new ProtocolV2SequenceCursor();
      this.sequences.set(key, sequenceCursor);
    }
    const session = new ProtocolV2Session({
      schemas: this.options.getSchemas(),
      router: adapter.router,
      maxFrameBytes: adapter.maxFrameBytes,
      generation: adapter.generation,
      sequenceCursor,
      prepareCall: async context => {
        assertLinkActive();
        await adapter.prepareCall(context);
        assertLinkActive();
      },
      writeFrame: async (frame, context) => {
        assertLinkActive();
        await adapter.writeFrame(frame, context);
        assertLinkActive();
      },
      readFrame: async context => {
        assertLinkActive();
        const frame = await adapter.readFrame(context);
        assertLinkActive();
        return frame;
      },
      logger: adapter.logger,
      logPrefix: adapter.logPrefix,
      createTimeoutError: adapter.createTimeoutError,
    });
    const link = { adapter, session, state };
    this.links.set(key, link);
    return link;
  }

  private async executeCall(
    key: Key,
    createAdapter: () => ProtocolV2LinkAdapter,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ): Promise<MessageFromOneKey> {
    try {
      return await this.getOrCreateLink(key, createAdapter).session.call(name, data, options);
    } catch (error) {
      if (this.options.classifyError(error) === 'link-fatal') {
        const errorMessage = getErrorMessage(error) || 'unknown error';
        await this.invalidateLink(key, `Protocol V2 link-fatal error: ${errorMessage}`);
      }
      throw error;
    }
  }

  private clearSettledCallQueue(key: Key, queue: Promise<unknown>) {
    if (this.callQueues.get(key) === queue) {
      this.callQueues.delete(key);
    }
  }

  private assertCallGeneration(key: Key, generation: number) {
    const currentGeneration = this.generations.get(key) ?? 0;
    if (currentGeneration === generation) return;

    const invalidation = this.invalidationReasons.get(key);
    const reason =
      invalidation?.generation === currentGeneration
        ? invalidation.reason
        : 'Protocol V2 link generation changed';
    throw new ProtocolV2LinkError('generation', reason);
  }
}
