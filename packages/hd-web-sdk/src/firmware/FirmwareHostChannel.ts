import {
  FirmwareUpdateErrorCode,
  MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
  createFirmwareUpdateError,
} from '@onekeyfe/hd-core';

import {
  FIRMWARE_HOST_CHANNEL_PROTOCOL,
  isFirmwareHostChannelDispose,
  isFirmwareHostChannelHandshakeAck,
  isFirmwareHostChannelHandshakeReject,
  isFirmwareHostChannelRequest,
  serializeFirmwareHostChannelError,
} from './FirmwareHostChannelProtocol';

import type {
  FirmwareArtifactReaderReadResult,
  FirmwareUpdateHostBinding,
} from '@onekeyfe/hd-core';
import type {
  FirmwareHostChannelDispose,
  FirmwareHostChannelHandshake,
  FirmwareHostChannelRequest,
  FirmwareHostChannelResponse,
} from './FirmwareHostChannelProtocol';

export interface FirmwareHostChannelTargetWindow {
  postMessage(message: unknown, targetOrigin: string, transfer?: Transferable[]): void;
}

export interface FirmwareHostChannelOptions {
  binding: FirmwareUpdateHostBinding;
  targetWindow: FirmwareHostChannelTargetWindow;
  targetOrigin: string;
  sessionId: string;
  generation: number;
  handshakeTimeoutMs?: number;
  nonceFactory?: () => string;
  messageChannelFactory?: () => MessageChannel;
}

export interface FirmwareHostChannelState {
  connected: boolean;
  disposed: boolean;
  generation: number;
  sessionId: string;
}

const channelError = (detail: string): Error =>
  createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid, detail, {
    detail,
  });

const randomOpaqueId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const assertReadResult = (
  result: FirmwareArtifactReaderReadResult,
  requestedLength: number
): FirmwareArtifactReaderReadResult => {
  if (!(result.data instanceof ArrayBuffer)) {
    throw channelError('Firmware host reader returned non-ArrayBuffer data');
  }
  if (
    !Number.isSafeInteger(result.bytesRead) ||
    result.bytesRead < 0 ||
    result.bytesRead !== result.data.byteLength ||
    result.bytesRead > requestedLength ||
    result.bytesRead > MAX_FIRMWARE_ARTIFACT_READ_LENGTH ||
    typeof result.eof !== 'boolean'
  ) {
    throw channelError('Firmware host reader returned an invalid bounded read result');
  }
  return result;
};

export class FirmwareHostChannel {
  private port: MessagePort | null = null;

  private started = false;

  private connected = false;

  private disposed = false;

  private handshakeTimer: ReturnType<typeof setTimeout> | undefined;

  private resolveHandshake: (() => void) | undefined;

  private rejectHandshake: ((error: Error) => void) | undefined;

  private readonly nonce: string;

  private readonly seenRequestIds = new Set<string>();

  private readonly openReaderIds = new Set<string>();

  private readonly activeReaderRequests = new Map<
    string,
    { requestId: string; operationId: string }
  >();

  private readonly activeOperationReaders = new Map<string, string>();

  constructor(private readonly options: FirmwareHostChannelOptions) {
    if (!isNonEmptyString(options.sessionId) || !Number.isSafeInteger(options.generation)) {
      throw channelError('Firmware host channel requires a valid session and generation');
    }
    this.nonce = options.nonceFactory?.() ?? randomOpaqueId();
  }

  getState(): FirmwareHostChannelState {
    return {
      connected: this.connected,
      disposed: this.disposed,
      generation: this.options.generation,
      sessionId: this.options.sessionId,
    };
  }

  async connect(): Promise<FirmwareHostChannelState> {
    if (this.started) {
      throw channelError('Firmware host channel handshake is one-time');
    }
    this.started = true;
    const channel = this.options.messageChannelFactory?.() ?? new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = event => this.handlePortMessage(event);
    this.port.start();

    const handshakePromise = new Promise<void>((resolve, reject) => {
      this.resolveHandshake = resolve;
      this.rejectHandshake = reject;
    });
    this.handshakeTimer = setTimeout(() => {
      this.rejectHandshake?.(channelError('Firmware host channel handshake timed out'));
      this.dispose().catch(() => undefined);
    }, this.options.handshakeTimeoutMs ?? 5000);

    const handshake: FirmwareHostChannelHandshake = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'handshake',
      nonce: this.nonce,
      sessionId: this.options.sessionId,
      generation: this.options.generation,
    };
    try {
      this.options.targetWindow.postMessage(handshake, this.options.targetOrigin, [channel.port2]);
    } catch (error) {
      this.rejectHandshake?.(
        channelError(
          `Firmware host channel handshake failed: ${
            error instanceof Error ? error.message : 'postMessage failed'
          }`
        )
      );
      this.dispose().catch(() => undefined);
    }

    await handshakePromise;
    return this.getState();
  }

  private matchesSession(message: { sessionId: string; generation: number }) {
    return (
      message.sessionId === this.options.sessionId && message.generation === this.options.generation
    );
  }

  private handlePortMessage(event: MessageEvent<unknown>) {
    const { data } = event;
    if (isFirmwareHostChannelHandshakeAck(data)) {
      if (
        !this.connected &&
        this.matchesSession(data) &&
        data.nonce === this.nonce &&
        !this.disposed
      ) {
        this.connected = true;
        if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
        this.resolveHandshake?.();
      } else {
        this.failProtocol('Firmware host channel received an invalid handshake acknowledgement');
      }
      return;
    }
    if (isFirmwareHostChannelHandshakeReject(data)) {
      if (this.matchesSession(data) && data.nonce === this.nonce) {
        this.rejectHandshake?.(channelError(`Firmware host channel rejected: ${data.reason}`));
        this.dispose().catch(() => undefined);
      } else {
        this.failProtocol('Firmware host channel received an invalid handshake rejection');
      }
      return;
    }
    if (isFirmwareHostChannelDispose(data)) {
      if (this.matchesSession(data)) {
        this.dispose(false).catch(() => undefined);
      } else {
        this.failProtocol('Firmware host channel received a stale dispose message');
      }
      return;
    }
    if (!this.connected || !isFirmwareHostChannelRequest(data) || !this.matchesSession(data)) {
      this.failProtocol('Firmware host channel received an invalid or stale request');
      return;
    }
    if (this.seenRequestIds.has(data.requestId)) {
      this.failProtocol(`Firmware host channel received duplicate request ${data.requestId}`);
      return;
    }
    this.seenRequestIds.add(data.requestId);
    this.handleRequest(data).catch(error => this.sendErrorResponse(data, error));
  }

  private failProtocol(detail: string) {
    const error = channelError(detail);
    this.rejectHandshake?.(error);
    this.dispose().catch(() => undefined);
  }

  private sendResponse(
    request: FirmwareHostChannelRequest,
    payload: unknown,
    transfer: Transferable[] = []
  ) {
    if (!this.port || this.disposed) return;
    const response: FirmwareHostChannelResponse = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'response',
      requestId: request.requestId,
      sessionId: this.options.sessionId,
      generation: this.options.generation,
      ok: true,
      payload,
    };
    this.port.postMessage(response, transfer);
  }

  private sendErrorResponse(request: FirmwareHostChannelRequest, error: unknown) {
    if (!this.port || this.disposed) return;
    const response: FirmwareHostChannelResponse = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'response',
      requestId: request.requestId,
      sessionId: this.options.sessionId,
      generation: this.options.generation,
      ok: false,
      error: serializeFirmwareHostChannelError(error),
    };
    this.port.postMessage(response);
  }

  private assertKnownReader(readerId: string) {
    if (!this.openReaderIds.has(readerId)) {
      throw channelError(`Firmware host channel reader ${readerId} is unknown`);
    }
  }

  private async handleRequest(request: FirmwareHostChannelRequest): Promise<void> {
    switch (request.method) {
      case 'artifact.open': {
        const result = await this.options.binding.artifactReader.open(request.payload);
        if (
          !isNonEmptyString(result.readerId) ||
          !Number.isSafeInteger(result.size) ||
          result.size <= 0 ||
          this.openReaderIds.has(result.readerId)
        ) {
          throw channelError('Firmware host reader returned an invalid or duplicate reader');
        }
        this.openReaderIds.add(result.readerId);
        this.sendResponse(request, result);
        return;
      }
      case 'artifact.read': {
        const { readerId, operationId, offset, length } = request.payload;
        this.assertKnownReader(readerId);
        if (
          !isNonEmptyString(operationId) ||
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          !Number.isSafeInteger(length) ||
          length <= 0 ||
          length > MAX_FIRMWARE_ARTIFACT_READ_LENGTH
        ) {
          throw channelError('Firmware host channel received an invalid bounded read request');
        }
        if (this.activeReaderRequests.has(readerId)) {
          throw channelError(`Firmware host channel reader ${readerId} already has an active read`);
        }
        if (this.activeOperationReaders.has(operationId)) {
          throw channelError(`Firmware host channel operation ${operationId} is already active`);
        }
        this.activeReaderRequests.set(readerId, {
          requestId: request.requestId,
          operationId,
        });
        this.activeOperationReaders.set(operationId, readerId);
        try {
          const result = assertReadResult(
            await this.options.binding.artifactReader.read(request.payload),
            length
          );
          this.sendResponse(request, result, [result.data]);
        } finally {
          this.activeReaderRequests.delete(readerId);
          this.activeOperationReaders.delete(operationId);
        }
        return;
      }
      case 'artifact.close': {
        this.assertKnownReader(request.payload.readerId);
        if (this.activeReaderRequests.has(request.payload.readerId)) {
          throw channelError(
            `Firmware host channel reader ${request.payload.readerId} has an active read`
          );
        }
        await this.options.binding.artifactReader.close(request.payload);
        this.openReaderIds.delete(request.payload.readerId);
        this.sendResponse(request, {});
        return;
      }
      case 'artifact.cancel': {
        const readerId = this.activeOperationReaders.get(request.payload.operationId);
        if (!readerId) {
          throw channelError(
            `Firmware host channel operation ${request.payload.operationId} is unknown`
          );
        }
        await this.options.binding.artifactReader.cancel(request.payload);
        this.sendResponse(request, {});
        return;
      }
      case 'checkpoint.commit':
        await this.options.binding.checkpointSink.commit(request.payload);
        this.sendResponse(request, {});
        return;
      case 'progress.report':
        await this.options.binding.progressSink?.report(request.payload);
        this.sendResponse(request, {});
        return;
      default:
        throw channelError('Firmware host channel method is unsupported');
    }
  }

  async dispose(notifyRemote = true): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.connected = false;
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.rejectHandshake?.(channelError('Firmware host channel was disposed'));
    if (notifyRemote && this.port) {
      const message: FirmwareHostChannelDispose = {
        protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
        kind: 'dispose',
        sessionId: this.options.sessionId,
        generation: this.options.generation,
      };
      try {
        this.port.postMessage(message);
      } catch {
        // The remote iframe may already be gone.
      }
    }
    this.port?.close();
    this.port = null;
    const readerIds = [...this.openReaderIds];
    const operationIds = [...this.activeOperationReaders.keys()];
    this.openReaderIds.clear();
    this.activeReaderRequests.clear();
    this.activeOperationReaders.clear();
    await Promise.allSettled(
      operationIds.map(operationId => this.options.binding.artifactReader.cancel({ operationId }))
    );
    await Promise.allSettled(
      readerIds.map(readerId => this.options.binding.artifactReader.close({ readerId }))
    );
  }
}
