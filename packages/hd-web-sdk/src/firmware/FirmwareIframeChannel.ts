import {
  FirmwareUpdateErrorCode,
  MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
  createFirmwareUpdateError,
  firmwareHostBindingRegistry,
} from '@onekeyfe/hd-core';

import {
  FIRMWARE_HOST_CHANNEL_PROTOCOL,
  createFirmwareHostChannelError,
  isFirmwareHostChannelDispose,
  isFirmwareHostChannelHandshake,
  isFirmwareHostChannelResponse,
  normalizeFirmwareHostChannelEventOrigin,
} from './FirmwareHostChannelProtocol';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReaderOpenResult,
  FirmwareArtifactReaderReadResult,
  FirmwareCheckpointSink,
  FirmwareHostBindingRegistry,
  FirmwareProgressSink,
  FirmwareUpdateHostBinding,
} from '@onekeyfe/hd-core';
import type {
  FirmwareHostChannelDispose,
  FirmwareHostChannelHandshakeAck,
  FirmwareHostChannelHandshakeReject,
  FirmwareHostChannelMethod,
  FirmwareHostChannelRequest,
} from './FirmwareHostChannelProtocol';

export interface FirmwareIframeChannelMessageTarget {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
}

export interface FirmwareIframeChannelOptions {
  messageTarget: FirmwareIframeChannelMessageTarget;
  hostWindow: MessageEventSource;
  expectedOrigin: string;
  registry?: FirmwareHostBindingRegistry;
}

export interface FirmwareIframeChannelState {
  connected: boolean;
  generation: number;
  sessionId?: string;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

const iframeChannelError = (detail: string): Error =>
  createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid, detail, {
    detail,
  });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const assertOpenResult = (value: unknown): FirmwareArtifactReaderOpenResult => {
  const result = value as Partial<FirmwareArtifactReaderOpenResult> | null;
  if (
    !result ||
    !isNonEmptyString(result.readerId) ||
    !Number.isSafeInteger(result.size) ||
    (result.size as number) <= 0
  ) {
    throw iframeChannelError('Firmware iframe channel received an invalid reader open result');
  }
  return result as FirmwareArtifactReaderOpenResult;
};

const assertReadResult = (
  value: unknown,
  requestedLength: number
): FirmwareArtifactReaderReadResult => {
  const result = value as Partial<FirmwareArtifactReaderReadResult> | null;
  if (
    !result ||
    !(result.data instanceof ArrayBuffer) ||
    !Number.isSafeInteger(result.bytesRead) ||
    result.bytesRead !== result.data.byteLength ||
    result.bytesRead < 0 ||
    result.bytesRead > requestedLength ||
    result.bytesRead > MAX_FIRMWARE_ARTIFACT_READ_LENGTH ||
    typeof result.eof !== 'boolean'
  ) {
    throw iframeChannelError('Firmware iframe channel received an invalid bounded read result');
  }
  return result as FirmwareArtifactReaderReadResult;
};

export class FirmwareIframeChannel {
  private readonly registry: FirmwareHostBindingRegistry;

  private started = false;

  private port: MessagePort | null = null;

  private sessionId: string | undefined;

  private currentGeneration = 0;

  private registrationGeneration: number | undefined;

  private nextRequestSequence = 0;

  private readonly pendingRequests = new Map<string, PendingRequest>();

  private readonly openReaderIds = new Set<string>();

  private readonly activeReaderOperations = new Map<string, string>();

  private readonly handleWindowMessageBound = (event: MessageEvent<unknown>) =>
    this.handleWindowMessage(event);

  constructor(private readonly options: FirmwareIframeChannelOptions) {
    this.registry = options.registry ?? firmwareHostBindingRegistry;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.options.messageTarget.addEventListener('message', this.handleWindowMessageBound);
  }

  getState(): FirmwareIframeChannelState {
    return {
      connected: !!this.port && !!this.sessionId,
      generation: this.currentGeneration,
      ...(this.sessionId ? { sessionId: this.sessionId } : {}),
    };
  }

  private rejectHandshake(port: MessagePort, handshake: ReturnType<typeof this.getHandshake>) {
    if (!handshake) return;
    const rejection: FirmwareHostChannelHandshakeReject = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'handshake-reject',
      nonce: handshake.nonce,
      sessionId: handshake.sessionId,
      generation: handshake.generation,
      reason: 'stale, duplicate, or invalid firmware host channel handshake',
    };
    port.postMessage(rejection);
    port.close();
  }

  private getHandshake(value: unknown) {
    return isFirmwareHostChannelHandshake(value) ? value : null;
  }

  private handleWindowMessage(event: MessageEvent<unknown>) {
    const handshake = this.getHandshake(event.data);
    if (!handshake) return;
    const [port] = event.ports;
    const expectedOrigin = normalizeFirmwareHostChannelEventOrigin(this.options.expectedOrigin);
    if (
      event.source !== this.options.hostWindow ||
      normalizeFirmwareHostChannelEventOrigin(event.origin) !== expectedOrigin ||
      event.ports.length !== 1 ||
      !port ||
      handshake.generation <= this.currentGeneration
    ) {
      if (port) this.rejectHandshake(port, handshake);
      return;
    }
    this.activateHandshake(handshake, port);
  }

  private activateHandshake(
    handshake: NonNullable<ReturnType<typeof this.getHandshake>>,
    port: MessagePort
  ) {
    this.deactivate(true);
    this.currentGeneration = handshake.generation;
    this.sessionId = handshake.sessionId;
    this.nextRequestSequence = 0;
    this.port = port;
    this.port.onmessage = event => this.handlePortMessage(event);
    this.port.start();
    this.registrationGeneration = this.registry.register(
      this.createProxyBinding(handshake.sessionId, handshake.generation)
    );
    const acknowledgement: FirmwareHostChannelHandshakeAck = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'handshake-ack',
      nonce: handshake.nonce,
      sessionId: handshake.sessionId,
      generation: handshake.generation,
    };
    this.port.postMessage(acknowledgement);
  }

  private matchesActiveSession(message: { sessionId: string; generation: number }) {
    return (
      !!this.sessionId &&
      message.sessionId === this.sessionId &&
      message.generation === this.currentGeneration
    );
  }

  private handlePortMessage(event: MessageEvent<unknown>) {
    const { data } = event;
    if (isFirmwareHostChannelDispose(data)) {
      if (this.matchesActiveSession(data)) {
        this.deactivate(false);
      } else {
        this.protocolViolation('Firmware iframe channel received a stale dispose message');
      }
      return;
    }
    if (!isFirmwareHostChannelResponse(data) || !this.matchesActiveSession(data)) {
      this.protocolViolation('Firmware iframe channel received an invalid or stale response');
      return;
    }
    const pending = this.pendingRequests.get(data.requestId);
    if (!pending) {
      this.protocolViolation(
        `Firmware iframe channel received unknown or duplicate response ${data.requestId}`
      );
      return;
    }
    this.pendingRequests.delete(data.requestId);
    if (data.ok) {
      pending.resolve(data.payload);
    } else {
      pending.reject(
        data.error
          ? createFirmwareHostChannelError(data.error)
          : iframeChannelError('Firmware host channel request failed without an error')
      );
    }
  }

  private protocolViolation(detail: string) {
    this.deactivate(true, iframeChannelError(detail));
  }

  private request(
    sessionId: string,
    generation: number,
    method: FirmwareHostChannelMethod,
    payload: FirmwareHostChannelRequest['payload']
  ): Promise<unknown> {
    if (!this.port || this.sessionId !== sessionId || this.currentGeneration !== generation) {
      return Promise.reject(iframeChannelError('Firmware iframe channel capability is stale'));
    }
    this.nextRequestSequence += 1;
    const requestId = `${sessionId}:${generation}:${this.nextRequestSequence}`;
    const request = {
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'request',
      requestId,
      sessionId,
      generation,
      method,
      payload,
    } as FirmwareHostChannelRequest;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      try {
        this.port?.postMessage(request);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(
          iframeChannelError(
            `Firmware iframe channel request failed: ${
              error instanceof Error ? error.message : 'postMessage failed'
            }`
          )
        );
      }
    });
  }

  private assertCapabilityCurrent(sessionId: string, generation: number) {
    if (!this.port || this.sessionId !== sessionId || this.currentGeneration !== generation) {
      throw iframeChannelError('Firmware iframe channel capability is stale');
    }
  }

  private createProxyBinding(sessionId: string, generation: number): FirmwareUpdateHostBinding {
    const artifactReader: FirmwareArtifactReader = {
      open: async input => {
        this.assertCapabilityCurrent(sessionId, generation);
        const result = assertOpenResult(
          await this.request(sessionId, generation, 'artifact.open', input)
        );
        if (this.openReaderIds.has(result.readerId)) {
          throw iframeChannelError(`Firmware iframe reader ${result.readerId} is duplicated`);
        }
        this.openReaderIds.add(result.readerId);
        return result;
      },
      read: async input => {
        this.assertCapabilityCurrent(sessionId, generation);
        if (!this.openReaderIds.has(input.readerId)) {
          throw iframeChannelError(`Firmware iframe reader ${input.readerId} is unknown`);
        }
        if (
          !Number.isSafeInteger(input.offset) ||
          input.offset < 0 ||
          !Number.isSafeInteger(input.length) ||
          input.length <= 0 ||
          input.length > MAX_FIRMWARE_ARTIFACT_READ_LENGTH ||
          !isNonEmptyString(input.operationId)
        ) {
          throw iframeChannelError('Firmware iframe channel rejected an invalid bounded read');
        }
        if (this.activeReaderOperations.has(input.readerId)) {
          throw iframeChannelError(
            `Firmware iframe reader ${input.readerId} already has an active read`
          );
        }
        this.activeReaderOperations.set(input.readerId, input.operationId);
        try {
          return assertReadResult(
            await this.request(sessionId, generation, 'artifact.read', input),
            input.length
          );
        } finally {
          if (this.activeReaderOperations.get(input.readerId) === input.operationId) {
            this.activeReaderOperations.delete(input.readerId);
          }
        }
      },
      close: async input => {
        this.assertCapabilityCurrent(sessionId, generation);
        if (!this.openReaderIds.has(input.readerId)) {
          throw iframeChannelError(`Firmware iframe reader ${input.readerId} is unknown`);
        }
        if (this.activeReaderOperations.has(input.readerId)) {
          throw iframeChannelError(`Firmware iframe reader ${input.readerId} has an active read`);
        }
        await this.request(sessionId, generation, 'artifact.close', input);
        this.openReaderIds.delete(input.readerId);
      },
      cancel: async input => {
        this.assertCapabilityCurrent(sessionId, generation);
        const active = [...this.activeReaderOperations.values()].includes(input.operationId);
        if (!active) {
          throw iframeChannelError(`Firmware iframe operation ${input.operationId} is unknown`);
        }
        await this.request(sessionId, generation, 'artifact.cancel', input);
      },
    };
    const checkpointSink: FirmwareCheckpointSink = {
      commit: async checkpoint => {
        this.assertCapabilityCurrent(sessionId, generation);
        await this.request(sessionId, generation, 'checkpoint.commit', checkpoint);
      },
    };
    const progressSink: FirmwareProgressSink = {
      report: async event => {
        this.assertCapabilityCurrent(sessionId, generation);
        await this.request(sessionId, generation, 'progress.report', event);
      },
    };
    return {
      artifactReader,
      checkpointSink,
      progressSink,
    };
  }

  private deactivate(notifyHost: boolean, error = iframeChannelError('Firmware channel closed')) {
    const activePort = this.port;
    const activeSession = this.sessionId;
    const activeGeneration = this.currentGeneration;
    this.port = null;
    this.sessionId = undefined;
    if (notifyHost && activePort && activeSession) {
      const disposeMessage: FirmwareHostChannelDispose = {
        protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
        kind: 'dispose',
        sessionId: activeSession,
        generation: activeGeneration,
      };
      try {
        activePort.postMessage(disposeMessage);
      } catch {
        // The host may already have replaced or closed the channel.
      }
    }
    activePort?.close();
    this.pendingRequests.forEach(pending => pending.reject(error));
    this.pendingRequests.clear();
    this.openReaderIds.clear();
    this.activeReaderOperations.clear();
    if (
      this.registrationGeneration !== undefined &&
      this.registry.getGeneration() === this.registrationGeneration
    ) {
      this.registry.reset();
    }
    this.registrationGeneration = undefined;
  }

  dispose(): void {
    if (!this.started) return;
    this.started = false;
    this.options.messageTarget.removeEventListener('message', this.handleWindowMessageBound);
    this.deactivate(true);
  }
}
