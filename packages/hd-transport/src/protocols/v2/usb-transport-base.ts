import { ProtocolV2FrameAssembler } from './frame-assembler';
import { ProtocolV2LinkError, isProtocolV2LinkError } from './errors';
import { ProtocolV2LinkManager } from './link-manager';
import { getErrorMessage } from './session';

import type { MessageFromOneKey, TransportCallOptions } from '../../types';
import type { ProtocolV2CallContext, ProtocolV2Schemas, ProtocolV2SessionOptions } from './session';

export type ProtocolV2UsbTransportBaseOptions = {
  router: number;
  maxFrameBytes: number;
  logPrefix: string;
};

type ProtocolV2UsbCancellation = {
  generation: number;
  reason?: string;
  promise: Promise<string>;
  cancel: (reason: string) => void;
};

export abstract class ProtocolV2UsbTransportBase<Key> {
  private readonly protocolV2UsbLinks: ProtocolV2LinkManager<Key>;

  private readonly protocolV2UsbAssemblers = new Map<Key, ProtocolV2FrameAssembler>();

  private readonly protocolV2UsbGenerations = new Map<Key, number>();

  private readonly protocolV2UsbCancellations = new Map<Key, ProtocolV2UsbCancellation>();

  private readonly protocolV2UsbOptions: ProtocolV2UsbTransportBaseOptions;

  protected constructor(options: ProtocolV2UsbTransportBaseOptions) {
    this.protocolV2UsbOptions = options;
    this.protocolV2UsbLinks = new ProtocolV2LinkManager<Key>({
      getSchemas: () => this.getProtocolV2UsbSchemas(),
      classifyError: error => (isProtocolV2LinkError(error) ? 'link-fatal' : 'recoverable'),
      onLinkInvalidated: async (key, reason) => {
        this.protocolV2UsbAssemblers.get(key)?.reset();
        await this.resetProtocolV2UsbNativeLink(key, reason);
        await this.onProtocolV2UsbLinkInvalidated(key, reason);
      },
    });
  }

  protected abstract getProtocolV2UsbSchemas(): ProtocolV2Schemas;

  protected abstract getProtocolV2UsbLogger(): ProtocolV2SessionOptions['logger'];

  protected abstract writeProtocolV2UsbPacket(
    key: Key,
    frame: Uint8Array,
    context: ProtocolV2CallContext
  ): Promise<void>;

  protected abstract readProtocolV2UsbPacket(
    key: Key,
    context: ProtocolV2CallContext
  ): Promise<Uint8Array>;

  protected abstract resetProtocolV2UsbNativeLink(key: Key, reason: string): Promise<void>;

  protected abstract createProtocolV2UsbTimeoutError(name: string, timeoutMs: number): Error;

  protected onProtocolV2UsbLinkInvalidated(_key: Key, _reason: string): Promise<void> | void {
    // Subclasses may clear protocol caches or emit platform-specific diagnostics.
  }

  protected async rotateProtocolV2UsbGeneration(key: Key, reason: string): Promise<number> {
    await this.protocolV2UsbLinks.invalidateLink(key, reason);
    const generation = (this.protocolV2UsbGenerations.get(key) ?? 0) + 1;
    this.protocolV2UsbGenerations.set(key, generation);
    this.protocolV2UsbCancellations.set(key, this.createProtocolV2UsbCancellation(generation));
    this.protocolV2UsbAssemblers.set(
      key,
      new ProtocolV2FrameAssembler(this.protocolV2UsbOptions.maxFrameBytes)
    );
    return generation;
  }

  protected callProtocolV2Usb(
    key: Key,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ): Promise<MessageFromOneKey> {
    return this.protocolV2UsbLinks.call(
      key,
      () => this.createProtocolV2UsbAdapter(key),
      name,
      data,
      options
    );
  }

  protected sendProtocolV2UsbFlowControl(
    key: Key,
    name: string,
    data: Record<string, unknown>
  ): Promise<MessageFromOneKey> {
    return this.protocolV2UsbLinks.sendFlowControl(
      key,
      () => this.createProtocolV2UsbAdapter(key),
      name,
      data
    );
  }

  protected invalidateProtocolV2UsbLink(key: Key, reason: string): Promise<void> {
    return this.protocolV2UsbLinks.invalidateLink(key, reason);
  }

  protected invalidateAllProtocolV2UsbLinks(reason: string): Promise<void> {
    return this.protocolV2UsbLinks.invalidateAllLinks(reason);
  }

  protected async disposeProtocolV2UsbLinks(reason: string): Promise<void> {
    await this.protocolV2UsbLinks.dispose(reason);
    this.protocolV2UsbAssemblers.clear();
    this.protocolV2UsbGenerations.clear();
    this.protocolV2UsbCancellations.clear();
  }

  private createProtocolV2UsbAdapter(key: Key) {
    const generation = this.protocolV2UsbGenerations.get(key);
    if (generation === undefined) {
      throw new Error('Protocol V2 USB generation has not been initialized');
    }
    const cancellation = this.protocolV2UsbCancellations.get(key);
    if (!cancellation || cancellation.generation !== generation) {
      throw new Error('Protocol V2 USB cancellation state has not been initialized');
    }

    const assertCurrentGeneration = () => {
      if (cancellation.reason) {
        throw new ProtocolV2LinkError('generation', cancellation.reason);
      }
      if (this.protocolV2UsbGenerations.get(key) !== generation) {
        throw new ProtocolV2LinkError(
          'generation',
          'Protocol V2 USB connection generation changed'
        );
      }
    };

    return {
      router: this.protocolV2UsbOptions.router,
      maxFrameBytes: this.protocolV2UsbOptions.maxFrameBytes,
      generation,
      prepareCall: () => {
        assertCurrentGeneration();
      },
      writeFrame: async (frame: Uint8Array, context: ProtocolV2CallContext) => {
        assertCurrentGeneration();
        try {
          await this.writeProtocolV2UsbPacket(key, frame, context);
        } catch (error) {
          throw this.createProtocolV2UsbIoError('write', error);
        }
        assertCurrentGeneration();
      },
      readFrame: async (context: ProtocolV2CallContext) => {
        assertCurrentGeneration();
        const assembler = this.getProtocolV2UsbAssembler(key);
        let frame = assembler.push(new Uint8Array(0));
        while (!frame) {
          const packetRead = this.readProtocolV2UsbPacket(key, context)
            .then(packet => ({ packet }))
            .catch(error => {
              throw this.createProtocolV2UsbIoError('read', error);
            });
          const cancelled = cancellation.promise.then(reason => ({ reason }));
          const result = await Promise.race([packetRead, cancelled]);
          if ('reason' in result) {
            throw new ProtocolV2LinkError('generation', result.reason);
          }
          assertCurrentGeneration();
          frame = assembler.push(result.packet);
        }
        assertCurrentGeneration();
        return frame;
      },
      reset: (reason: string) => {
        cancellation.cancel(reason);
        this.protocolV2UsbAssemblers.get(key)?.reset();
      },
      logger: this.getProtocolV2UsbLogger(),
      logPrefix: this.protocolV2UsbOptions.logPrefix,
      createTimeoutError: (messageName: string, timeoutMs: number) =>
        this.createProtocolV2UsbTimeoutError(messageName, timeoutMs),
    };
  }

  private getProtocolV2UsbAssembler(key: Key): ProtocolV2FrameAssembler {
    const assembler = this.protocolV2UsbAssemblers.get(key);
    if (!assembler) {
      throw new Error('Protocol V2 USB assembler has not been initialized');
    }
    return assembler;
  }

  private createProtocolV2UsbCancellation(generation: number): ProtocolV2UsbCancellation {
    let resolveCancellation: (reason: string) => void = () => undefined;
    const cancellation: ProtocolV2UsbCancellation = {
      generation,
      promise: new Promise(resolve => {
        resolveCancellation = resolve;
      }),
      cancel: reason => {
        if (cancellation.reason) return;
        cancellation.reason = reason;
        resolveCancellation(reason);
      },
    };
    return cancellation;
  }

  private createProtocolV2UsbIoError(operation: 'read' | 'write', error: unknown) {
    if (isProtocolV2LinkError(error)) return error;
    return new ProtocolV2LinkError(
      'io',
      `Protocol V2 USB ${operation} failed: ${getErrorMessage(error) || 'unknown error'}`,
      error
    );
  }
}
