import { protobufManager } from '@onekeyfe/hwk-trezor-protobuf';
import { DefaultDefinitions } from '@onekeyfe/hwk-trezor-protobuf/hwk';
import {
  type ThpState as InternalThpState,
  type TransportProtocol as InternalTransportProtocol,
  type thp as internalProtocolThp,
  thp as protocolThpRuntime,
  v1 as protocolV1,
  v2 as protocolV2,
} from '@onekeyfe/hwk-trezor-protocol';
import {
  buildMessage,
  callThpMessage,
  createChunks,
  parseThpMessage,
  receiveAndParse,
} from '@onekeyfe/hwk-trezor-transport/hwk';

import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from './debugLogFilter';
import { toRuntimeBuffer } from './runtime/buffer';

export {
  filterTrezorDebugLogEntry,
  sanitizeTrezorDebugLogData,
  shouldLogTrezorDebugEntry,
  type TrezorDebugLogger,
  type TrezorDebugLogEntry,
  type TrezorDebugLogLevel,
} from './debugLogFilter';

export interface TrezorByteTransport {
  write(chunk: Buffer, signal?: AbortSignal): Promise<void>;
  read(signal?: AbortSignal): Promise<Buffer>;
  reconnect?(): Promise<void>;
}

export interface TrezorTransportProtocol {
  name: 'bridge' | 'v1' | 'v2';
  encode(
    data: Buffer,
    options: {
      messageType: number;
      header?: Buffer;
    }
  ): Buffer;
  decode(bytes: Buffer): {
    header: Buffer;
    length: number;
    messageType: number;
    payload: Buffer;
  };
  getHeaders(data: Buffer): [header: Buffer, chunkHeader: Buffer];
}

export type TrezorThpState = {
  readonly sendNonce?: number;
  sync(direction: 'send' | 'recv', messageName: string): void;
};

export type TrezorMessageName = string;

export type TrezorMessageResponse<T extends string = string> = {
  type: T;
  message: Record<string, unknown>;
};

export type TrezorCoreOptions = {
  transport: TrezorByteTransport;
  protocol?: TrezorTransportProtocol;
  chunkSize?: number;
  logger?: TrezorDebugLogger;
};

export type TrezorCallOptions = {
  signal?: AbortSignal;
  thpState?: TrezorThpState;
};

type TrezorTransportAbortOptions = AbortSignal | { signal?: AbortSignal };

const unwrapTransportAbortSignal = (
  options?: TrezorTransportAbortOptions
): AbortSignal | undefined => {
  if (!options) return undefined;
  if ('addEventListener' in options && typeof options.addEventListener === 'function') {
    return options;
  }
  return (options as { signal?: AbortSignal }).signal;
};

export type TrezorThpRawTransport = {
  write?(connectId: string, data: Uint8Array): Promise<void>;
  read?(connectId: string, timeoutMs?: number): Promise<Uint8Array | undefined>;
};

export type TrezorThpCallParams = {
  messageName: string;
  data?: Record<string, unknown>;
  skipAck?: boolean;
};

export class TrezorFailureError extends Error {
  readonly code?: unknown;

  readonly response: TrezorMessageResponse<'Failure'>;

  constructor(response: TrezorMessageResponse<'Failure'>) {
    const message =
      typeof response.message.message === 'string' ? response.message.message : 'Trezor Failure';
    super(message);
    this.name = 'TrezorFailureError';
    this.code = response.message.code;
    this.response = response;
  }
}

export class TrezorProtocolError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'TrezorProtocolError';
    this.code = code;
  }
}

const isFailureResponse = (response: unknown): response is TrezorMessageResponse<'Failure'> =>
  Boolean(
    response && typeof response === 'object' && 'type' in response && response.type === 'Failure'
  );

const toBuffer = (bytes: Buffer | Uint8Array) => toRuntimeBuffer(bytes);
const bytesToHex = (bytes: Buffer | Uint8Array) => toBuffer(bytes).toString('hex');
const bytesEqual = (left: Buffer | Uint8Array, right: Buffer | Uint8Array) =>
  bytesToHex(left) === bytesToHex(right);
const loadTrezorDefinitions = () => protobufManager.load(DefaultDefinitions);

export class TrezorCore {
  private readonly transport: TrezorByteTransport;

  private readonly protocol: InternalTransportProtocol;

  private readonly chunkSize: number;

  private readonly logger?: TrezorDebugLogger;

  constructor({ transport, protocol = protocolV1, chunkSize = 64, logger }: TrezorCoreOptions) {
    loadTrezorDefinitions();
    this.transport = transport;
    this.protocol = protocol as InternalTransportProtocol;
    this.chunkSize = chunkSize;
    this.logger = logger;
  }

  async call(
    name: TrezorMessageName,
    data: Record<string, unknown> = {},
    options: TrezorCallOptions = {}
  ): Promise<TrezorMessageResponse> {
    const thpState = options.thpState as InternalThpState | undefined;
    const { message, chunks } = this.buildChunks(name, data, thpState);
    this.log('debug', 'core.call.start', {
      protocol: this.protocol.name,
      name,
      messageBytes: message.length,
      chunkCount: chunks.length,
      chunkSize: this.chunkSize,
    });

    if (this.protocol.name === 'v2') {
      const previousNonce = thpState?.sendNonce;
      const response = await callThpMessage({
        thpState,
        chunks,
        apiWrite: async (chunk, options) => {
          await this.transport.write(chunk, unwrapTransportAbortSignal(options));

          return { success: true as const, payload: undefined };
        },
        apiRead: async options => {
          const payload = await this.transport.read(unwrapTransportAbortSignal(options));

          return { success: true as const, payload: toRuntimeBuffer(payload) };
        },
        signal: options.signal,
      });

      if (!response.success) {
        throw new Error(response.error.message ?? response.error.code);
      }

      if (previousNonce === thpState?.sendNonce) {
        thpState?.sync('send', name);
      }

      const parsed = parseThpMessage({
        decoded: response.payload,
        thpState,
      });
      thpState?.sync('recv', parsed.type);
      this.log('debug', 'core.call.sync', {
        requestName: name,
        responseType: parsed.type,
        didSendSync: previousNonce === thpState?.sendNonce,
      });

      if (isFailureResponse(parsed)) {
        throw new TrezorFailureError(parsed);
      }

      return parsed as TrezorMessageResponse;
    }

    await this.writeChunks(chunks, options.signal);

    return this.receive({ ...options, name });
  }

  async send(
    name: TrezorMessageName,
    data: Record<string, unknown> = {},
    options: TrezorCallOptions = {}
  ): Promise<void> {
    const thpState = options.thpState as InternalThpState | undefined;
    const { message, chunks } = this.buildChunks(name, data, thpState);
    this.log('debug', 'core.send.start', {
      protocol: this.protocol.name,
      name,
      messageBytes: message.length,
      chunkCount: chunks.length,
      chunkSize: this.chunkSize,
    });
    await this.writeChunks(chunks, options.signal);
  }

  async receive(
    options: TrezorCallOptions & { name?: TrezorMessageName } = {}
  ): Promise<TrezorMessageResponse> {
    const response = await receiveAndParse(async () => {
      const payload = await this.transport.read(options.signal);

      return {
        success: true as const,
        payload: toRuntimeBuffer(payload),
      };
    }, this.protocol);

    if (!response.success) {
      throw new TrezorProtocolError(response.error.code, response.error.message);
    }

    if (isFailureResponse(response.payload)) {
      throw new TrezorFailureError(response.payload);
    }

    return response.payload as TrezorMessageResponse;
  }

  private buildChunks(
    name: TrezorMessageName,
    data: Record<string, unknown>,
    thpState?: InternalThpState
  ) {
    const message = buildMessage({
      name,
      data,
      protocol: this.protocol,
      thpState,
    });
    const [, chunkHeader] = this.protocol.getHeaders(message);
    const chunks = createChunks(message, chunkHeader, this.chunkSize);

    return { message, chunks };
  }

  private async writeChunks(chunks: Buffer[], signal?: AbortSignal): Promise<void> {
    for (const chunk of chunks) {
      await this.transport.write(chunk, signal);
    }
  }

  private log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>) {
    if (!this.logger) return undefined;
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-core', event, data });
    if (!entry) return undefined;
    try {
      this.logger(entry);
    } catch {
      // Debug logging must not affect protocol execution.
    }
    return undefined;
  }
}

export class TrezorThpProtocol {
  private readonly thpState = new protocolThpRuntime.ThpState();

  constructor() {
    loadTrezorDefinitions();
  }

  encode({ messageName, data = {} }: TrezorThpCallParams): Uint8Array {
    const chunk = protocolThpRuntime.encode({
      messageName,
      data,
      thpState: this.thpState,
      protobufEncoder: (name, messageData) => protobufManager.encode(name, messageData),
    });
    return Uint8Array.from(chunk);
  }

  async call(
    transport: TrezorThpRawTransport,
    connectId: string,
    params: TrezorThpCallParams
  ): Promise<TrezorMessageResponse> {
    if (!transport.write || !transport.read) {
      throw new Error('Trezor THP requires transport.write/read');
    }

    const previousNonce = this.thpState.sendNonce;
    const chunk = toRuntimeBuffer(this.encode(params));
    const result = await callThpMessage({
      thpState: this.thpState,
      chunks: [chunk],
      skipAck: params.skipAck,
      apiWrite: async data => {
        await transport.write?.(connectId, Uint8Array.from(data));
        return { success: true, payload: undefined };
      },
      apiRead: async () => {
        const data = await transport.read?.(connectId);
        if (!data) {
          return {
            success: false,
            error: { code: 'unexpected error' as const, message: 'No data read' },
          };
        }
        return { success: true, payload: toRuntimeBuffer(data) };
      },
    });

    if (!result.success) {
      throw new Error(result.error.message ?? result.error.code);
    }

    if (previousNonce === this.thpState.sendNonce) {
      this.thpState.sync('send', params.messageName);
    }

    const message = parseThpMessage({
      decoded: result.payload,
      thpState: this.thpState,
    }) as TrezorMessageResponse;
    this.applyReceivedState(message);
    return message;
  }

  private applyReceivedState(message: TrezorMessageResponse): void {
    if (message.type === 'ThpCreateChannelResponse') {
      const { channel } = message.message;
      const { properties } = message.message;
      if (channel instanceof Uint8Array) {
        this.thpState.setChannel(Buffer.from(channel));
      }
      if (properties && typeof properties === 'object') {
        this.thpState.setThpProperties(properties as internalProtocolThp.ThpDeviceProperties);
      }
    }
    this.thpState.sync('recv', message.type);
  }
}

export type TrezorCoreLike = {
  send(name: string, data?: Record<string, unknown>, options?: TrezorCallOptions): Promise<void>;
  receive(options?: TrezorCallOptions & { name?: string }): Promise<TrezorMessageResponse>;
  call(
    name: string,
    data?: Record<string, unknown>,
    options?: TrezorCallOptions
  ): Promise<TrezorMessageResponse>;
};

export type TrezorCoreFactory = (
  transport: TrezorByteTransport,
  protocol: TrezorTransportProtocol,
  chunkSize: number,
  logger?: TrezorDebugLogger
) => TrezorCoreLike;

type TrezorSessionProtocol = 'v1' | 'thp';

export type TrezorPassphraseMode = 'prompt' | 'empty';

export type TrezorCreateAppSessionOptions = {
  deriveCardano?: boolean;
  passphraseMode?: TrezorPassphraseMode;
};

type TrezorDeviceSessionOptions = {
  transport: TrezorByteTransport;
  connectionType?: string;
  chunkSize?: number;
  coreFactory?: TrezorCoreFactory;
  initializedState?: {
    protocol: TrezorSessionProtocol;
    features: Record<string, unknown>;
    thpState?: TrezorThpState;
  };
  thp?: TrezorThpSessionOptions;
};

export type TrezorThpPairingMethod = number | 'CodeEntry' | 'QrCode' | 'NFC' | 'SkipPairing';

export type TrezorThpCredentials = Record<string, unknown> & {
  host_static_key?: string;
  autoconnect?: boolean;
};

export type TrezorThpHandshakeInitResponse = Record<string, unknown>;

export type TrezorPinMatrixRequestPayload = Record<string, unknown> & {
  type?: string;
};

export type TrezorThpHandshakeCredentials = {
  pairingMethods: number[];
  handshakeHash: Buffer;
  handshakeCommitment?: Buffer;
  codeEntryChallenge?: Buffer;
  trezorEncryptedStaticPubkey: Buffer;
  hostEncryptedStaticPubkey: Buffer;
  staticKey: Buffer;
  hostStaticPublicKey?: Buffer;
  hostKey: Buffer;
  trezorKey: Buffer;
  trezorCpacePublicKey?: Buffer;
};

export type TrezorThpHandshakeInitHandler = (args: {
  handshakeInitResponse: TrezorThpHandshakeInitResponse;
  thpState: TrezorThpState;
  knownCredentials: TrezorThpCredentials[];
  hostEphemeralKeys: {
    privateKey: Buffer;
    publicKey: Buffer;
  };
  tryToUnlock: 0 | 1;
  protobufEncoder: (name: string, data: Record<string, unknown>) => { message: Buffer };
}) => {
  trezorMaskedStaticPubkey: Buffer;
  trezorEncryptedStaticPubkey: Buffer;
  hostEncryptedStaticPubkey: Buffer;
  hostKey: Buffer;
  trezorKey: Buffer;
  handshakeHash: Buffer;
  credentials?: TrezorThpCredentials;
  allCredentials: TrezorThpCredentials[];
  encryptedPayload: Buffer;
  staticKey: Buffer;
  hostStaticKeys: {
    privateKey: Buffer;
    publicKey: Buffer;
  };
};

type TrezorThpPairingResponse = { selectedMethod: TrezorThpPairingMethod } | { tag: string };

export type TrezorThpSessionOptions = {
  hostName?: string;
  appName?: string;
  pairingMethods?: TrezorThpPairingMethod[];
  knownCredentials?: TrezorThpCredentials[];
  randomBytes?: (size: number) => Buffer;
  handleHandshakeInit?: TrezorThpHandshakeInitHandler;
  onPairingRequest?: (payload: {
    availableMethods: number[];
    selectedMethod: number;
    nfcData?: string;
  }) => Promise<TrezorThpPairingResponse>;
  onButtonRequest?: (payload: Record<string, unknown>) => Promise<void> | void;
  onButtonRequestComplete?: (payload: Record<string, unknown>) => Promise<void> | void;
  onPinMatrixRequest?: (payload: TrezorPinMatrixRequestPayload) => Promise<string> | string;
  /**
   * Provide the passphrase for a session. Called at two points depending on
   * protocol — proactively before `ThpCreateNewSession` (THP), reactively on
   * a `PassphraseRequest` (v1). Return `{ on_device: true }` to enter the
   * passphrase on the device instead of sending a value. Empty string = the
   * standard (no-passphrase) wallet.
   */
  onPassphraseRequest?: (
    payload?: Record<string, unknown>
  ) =>
    | Promise<{ passphrase?: string; on_device?: boolean }>
    | { passphrase?: string; on_device?: boolean };
  /**
   * Invoked after the THP handshake mints fresh pairing credentials (i.e.
   * the first successful pairing run after a wipe / new device). The host
   * should persist the full `credentials` list keyed by `deviceId` and feed
   * it back via `knownCredentials` on the next connect to skip pairing UX.
   */
  onPairingCredentialsChanged?: (payload: {
    credentials: TrezorThpCredentials[];
  }) => Promise<void> | void;
  logger?: TrezorDebugLogger;
};

const defaultCoreFactory: TrezorCoreFactory = (transport, protocol, chunkSize, logger) =>
  new TrezorCore({ transport, protocol, chunkSize, logger }) as TrezorCoreLike;

/**
 * Trezor derives the wallet from the EXACT passphrase bytes, so normalize to
 * NFKD before sending — matches trezor-suite (DeviceCurrentSession / thp
 * session) and OneKey hd-core. Without it the same human passphrase typed as
 * composed vs decomposed Unicode would open DIFFERENT wallets. Idempotent; ''
 * stays ''. Only for the passphrase string — never the `on_device` path.
 */
export const normalizePassphrase = (value: string | undefined): string =>
  (value ?? '').normalize('NFKD');

const normalizeCreateAppSessionOptions = (
  options: boolean | TrezorCreateAppSessionOptions = {}
): Required<TrezorCreateAppSessionOptions> => {
  const normalized = typeof options === 'boolean' ? { deriveCardano: options } : options;
  const passphraseMode = normalized.passphraseMode ?? 'prompt';
  if (passphraseMode !== 'prompt' && passphraseMode !== 'empty') {
    throw new Error(`Invalid Trezor passphrase mode: ${String(passphraseMode)}`);
  }
  return {
    deriveCardano: normalized.deriveCardano ?? false,
    passphraseMode,
  };
};

export class TrezorDeviceSession {
  private readonly transport: TrezorByteTransport;

  private readonly connectionType?: string;

  private readonly chunkSize: number;

  private readonly coreFactory: TrezorCoreFactory;

  private readonly thpOptions?: TrezorThpSessionOptions;

  private core?: TrezorCoreLike;

  private protocol: TrezorSessionProtocol = 'v1';

  private thpState?: InternalThpState;

  // True once a THP application session has been created OR selected on this
  // channel. The session only tracks the active session id byte; wallet identity
  // is verified by higher layers before wallet-bound methods run.
  private thpAppSessionActive = false;

  private passphraseMode: TrezorPassphraseMode = 'prompt';

  private currentFeatures?: Record<string, unknown>;

  constructor(options: TrezorDeviceSessionOptions) {
    this.transport = options.transport;
    this.connectionType = options.connectionType;
    this.chunkSize = options.chunkSize ?? 64;
    this.coreFactory = options.coreFactory ?? defaultCoreFactory;
    this.thpOptions = options.thp;

    if (options.initializedState) {
      this.protocol = options.initializedState.protocol;
      this.currentFeatures = options.initializedState.features;
      this.core = this.coreFactory(
        this.transport,
        this.protocol === 'thp' ? protocolV2 : protocolV1,
        this.chunkSize,
        this.thpOptions?.logger
      );
      this.thpState = options.initializedState.thpState as InternalThpState | undefined;
    }
  }

  get features() {
    return this.currentFeatures;
  }

  /**
   * Whether this device speaks THP (v2). THP supports multiple host-managed
   * application sessions per channel (passphrase sessions); v1 does not — its
   * passphrase flow is reactive (device-driven `PassphraseRequest`). The
   * adapter branches on this to decide whether to drive app-session caching.
   */
  get isThp(): boolean {
    return this.protocol === 'thp';
  }

  getThpState(): TrezorThpState | undefined {
    return this.thpState;
  }

  async initialize(): Promise<Record<string, unknown>> {
    this.log('info', 'session.initialize.start', {
      connectionType: this.connectionType ?? 'unknown',
      chunkSize: this.chunkSize,
      thp: !!this.thpOptions,
    });
    // Protocol selection (pre-e01d9d61 behavior, restored):
    //   1. Send v1 `Initialize`.
    //   2. If the device replies `Failure_InvalidProtocol` (THP-only firmware
    //      like Safe 7), re-enter on THP.
    //   3. Otherwise the response IS `Features` — stay on v1.
    // No v1 `Cancel` pre-flush: that needs a cancellable read to recover from a
    // non-responding device. node-usb (trezor-suite) can cancel an in-flight
    // transfer; WebUSB cannot, so the Cancel read-retry loop leaks pending
    // transferIns that jam every later transfer on this device. v1 `Initialize`
    // is a single write+read and the THP device answers it with
    // `Failure_InvalidProtocol`, so the probe works without the flush.
    this.protocol = 'v1';
    const optsLogger = (
      this.thpOptions as { logger?: TrezorThpSessionOptions['logger'] } | undefined
    )?.logger;
    this.core = this.coreFactory(this.transport, protocolV1, this.chunkSize, optsLogger);
    try {
      this.log('debug', 'session.call.request', { protocol: 'v1', name: 'Initialize' });
      const response = await this.core.call('Initialize', {});
      this.log('debug', 'session.call.response', {
        protocol: 'v1',
        name: 'Initialize',
        responseType: response.type,
      });
      this.currentFeatures = expectMessage(response, 'Features').message;
    } catch (error) {
      // THP-only firmware (Safe 7) replies Failure { code: Failure_InvalidProtocol }
      // to v1 framing; TrezorCore.call surfaces that as a thrown
      // TrezorFailureError, never a returned response — so the fallback
      // *must* live in the catch path.
      if (error instanceof TrezorFailureError && error.code === 'Failure_InvalidProtocol') {
        this.log('info', 'session.initialize.thp.fallback', {
          reason: 'device replied Failure_InvalidProtocol to v1 Initialize',
        });
        if (!this.thpOptions) {
          throw new Error(
            'Trezor THP required but the connector was constructed without `thp` options. ' +
              'Pass `thp: { hostName, appName, ... }` so the device can complete pairing.'
          );
        }
        this.protocol = 'v1';
        this.core = undefined;
        return this.initializeThp();
      }
      this.log('error', 'session.initialize.error', { error: errorToLog(error) });
      throw error;
    }

    this.log('info', 'session.initialize.done', {
      protocol: this.protocol,
      features: summarizeFeatures(this.currentFeatures),
    });
    return this.currentFeatures;
  }

  async call(name: string, data: Record<string, unknown> = {}) {
    if (!this.core) {
      await this.initialize();
    }

    this.log('info', 'session.method.start', {
      name,
      protocol: this.protocol,
      dataKeys: Object.keys(data),
    });
    let requestName = name;
    let requestData = data;

    for (;;) {
      let response: { type: string; message: Record<string, unknown> };
      try {
        response = await this.core!.call(requestName, requestData, { thpState: this.thpState });
      } catch (error) {
        this.log('error', 'session.method.error', {
          name: requestName,
          protocol: this.protocol,
          error: errorToLog(error),
        });
        throw error;
      }
      this.log('info', 'session.method.response', {
        name: requestName,
        protocol: this.protocol,
        responseType: response.type,
        messageKeys: Object.keys(response.message ?? {}),
      });
      if (requestName === 'ButtonAck') {
        await this.handleButtonRequestComplete({
          responseType: response.type,
          message: response.message,
        });
      }

      if (response.type === 'ButtonRequest') {
        await this.handleButtonRequest(response.message);
        requestName = 'ButtonAck';
        requestData = {};
        continue;
      }

      if (response.type === 'PinMatrixRequest') {
        const pin = await this.handlePinMatrixRequest(
          response.message as TrezorPinMatrixRequestPayload
        );
        requestName = 'PinMatrixAck';
        requestData = { pin };
        continue;
      }

      // v1 (legacy) passphrase: device asks reactively mid-call. THP
      // provides the passphrase proactively at ThpCreateNewSession, so
      // this branch only fires on v1 firmware.
      if (response.type === 'PassphraseRequest') {
        const ack = await this.handlePassphraseRequest(response.message);
        requestName = 'PassphraseAck';
        requestData = ack.on_device
          ? { on_device: true }
          : { passphrase: normalizePassphrase(ack.passphrase) };
        continue;
      }

      if (name === 'GetFeatures') {
        this.currentFeatures = expectMessage(response, 'Features').message;
      }

      return response;
    }
  }

  private async initializeThp({
    tryToUnlock = 0,
    hasRetried = false,
  }: { tryToUnlock?: 0 | 1; hasRetried?: boolean } = {}): Promise<Record<string, unknown>> {
    this.log('info', 'thp.initialize.start', { tryToUnlock });
    this.protocol = 'thp';
    this.thpState = new protocolThpRuntime.ThpState();
    this.core = this.coreFactory(
      this.transport,
      protocolV2,
      this.chunkSize,
      this.thpOptions?.logger
    );

    const thpSession = new TrezorThpSession(this.core, this.thpState, this.thpOptions);
    try {
      await thpSession.initialize({ tryToUnlock });
      this.log('info', 'thp.getFeatures.start');
      const response = await this.core.call('GetFeatures', {}, { thpState: this.thpState });
      this.log('info', 'thp.getFeatures.response', { responseType: response.type });
      this.currentFeatures = expectMessage(response, 'Features').message;
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      // Device-locked: synthesize a ButtonRequest_PinEntry through the
      // existing button-request channel and re-run the handshake exactly
      // once with tryToUnlock=1. Mirrors trezor-suite's `thp/index.ts`
      // getThpChannel pattern. The device itself emits no UI event during
      // the locked handshake — it just blocks the USB/BLE read until the
      // user types their PIN on the device — so the host has to surface
      // the prompt itself. If we've already retried and it's still locked,
      // propagate as `Device_InitializeFailed` so the caller doesn't loop.
      if (code === 'ThpDeviceLocked' && !hasRetried) {
        this.log('info', 'thp.initialize.deviceLocked.retry', {});
        await this.thpOptions?.onButtonRequest?.({ code: 'ButtonRequest_PinEntry' });
        try {
          return await this.initializeThp({ tryToUnlock: 1, hasRetried: true });
        } finally {
          await this.handleButtonRequestComplete({
            code: 'ButtonRequest_PinEntry',
            responseType: 'ThpInitialize',
          });
        }
      }
      if (code === 'ThpDeviceLocked' && hasRetried) {
        this.log('error', 'thp.initialize.deviceLocked.giveUp', {});
        throw Object.assign(new Error('Trezor device still locked after PIN attempt'), {
          code: 'Device_InitializeFailed',
        });
      }
      this.log('error', 'thp.initialize.error', { error: errorToLog(error) });
      throw error;
    }

    this.log('info', 'thp.initialize.done', { features: summarizeFeatures(this.currentFeatures) });
    return this.currentFeatures;
  }

  /**
   * Create a NEW THP application session with a freshly-prompted passphrase
   * (or empty if the device has no passphrase protection). Returns the new
   * session id (hex). The session knows nothing about wallet identity. Multiple
   * sessions can coexist on one channel, but callers should not rely on cached
   * app-session identity for wallet selection.
   */
  async createThpAppSession(
    options: boolean | TrezorCreateAppSessionOptions = {}
  ): Promise<string> {
    if (!this.thpState) {
      throw new Error('createThpAppSession requires an active THP channel');
    }
    const { deriveCardano, passphraseMode } = normalizeCreateAppSessionOptions(options);
    this.passphraseMode = passphraseMode;
    this.log('info', 'thp.appSession.create.start', { deriveCardano, passphraseMode });
    const passphraseProtected = this.currentFeatures?.passphrase_protection === true;
    const passphraseAlwaysOnDevice = this.currentFeatures?.passphrase_always_on_device === true;
    this.log('info', 'thp.appSession.create.passphrasePolicy', {
      passphraseProtected,
      passphraseAlwaysOnDevice,
    });
    const sessionId = this.thpState.createNewSessionId();
    // Resolve passphrase proactively (mirrors trezor-suite createThpSession):
    // standard wallet (passphrase_protection off) → empty; else ask the host.
    let passphraseArg: { passphrase?: string; on_device?: boolean } = {
      passphrase: '',
    };
    if (passphraseAlwaysOnDevice && passphraseMode === 'prompt') {
      // `on_device` cannot guarantee the empty passphrase required by standard-wallet mode.
      passphraseArg = { on_device: true };
    } else if (
      passphraseProtected &&
      passphraseMode === 'prompt' &&
      this.thpOptions?.onPassphraseRequest
    ) {
      const res = await this.thpOptions.onPassphraseRequest();
      passphraseArg = res?.on_device
        ? { on_device: true }
        : { passphrase: normalizePassphrase(res?.passphrase) };
    }
    try {
      // Route through the interactive `call()` loop (NOT a bare
      // `core.call`): when passphrase protection is on, the device replies
      // to ThpCreateNewSession with a ButtonRequest (hidden-wallet confirm /
      // ButtonRequest_PassphraseEntry) that MUST be answered with ButtonAck
      // before it returns the new session. A single round-trip leaves the
      // device awaiting the ack and the next message desyncs into a
      // Failure_FirmwareError. `TrezorDeviceSession.call()` is a raw protobuf
      // call now, so `ThpCreateNewSession` cannot recurse into wallet-state
      // handling. The empty-passphrase (standard wallet) path skips the
      // ButtonRequest, which is why it worked without this.
      const response = await this.call('ThpCreateNewSession', {
        ...passphraseArg,
        derive_cardano: deriveCardano,
      });
      this.log('info', 'thp.appSession.create.response', { responseType: response.type });
    } catch (error) {
      this.log('error', 'thp.appSession.create.error', { error: errorToLog(error) });
      throw error;
    }
    this.thpAppSessionActive = true;
    return sessionId.toString('hex');
  }

  async createV1AppSession(options: TrezorCreateAppSessionOptions = {}): Promise<void> {
    const { passphraseMode } = normalizeCreateAppSessionOptions(options);
    this.passphraseMode = passphraseMode;
    if (!this.core) {
      await this.initialize();
    }
    if (this.protocol !== 'v1') return;
    this.log('info', 'v1.appSession.create.start', {});
    const response = await this.core!.call('Initialize', {});
    this.currentFeatures = expectMessage(response, 'Features').message;
    this.thpAppSessionActive = false;
    this.log('info', 'v1.appSession.create.done', {
      features: summarizeFeatures(this.currentFeatures),
    });
  }

  /**
   * Switch the active THP session to an existing id (host-side: just sets the
   * session-id byte in the next message header). The device must still hold
   * the session — validity is verified by the caller's next real call (an
   * evicted session surfaces as a Failure/ThpError, the adapter then recreates).
   */
  selectThpAppSession(sessionId: string): void {
    if (!this.thpState) {
      throw new Error('selectThpAppSession requires an active THP channel');
    }
    this.thpState.setSessionId(Buffer.from(sessionId, 'hex'));
    this.thpAppSessionActive = true;
  }

  /** Active THP session id (hex), or undefined if none created/selected. */
  getThpAppSessionId(): string | undefined {
    if (!this.thpAppSessionActive || !this.thpState) return undefined;
    return this.thpState.sessionId.toString('hex');
  }

  async withDeviceState<T>(
    fn: () => Promise<T>,
    options: { deriveCardano?: boolean } = {}
  ): Promise<T> {
    if (this.protocol === 'thp' && this.thpState) {
      await this.createThpAppSession({ deriveCardano: options.deriveCardano ?? false });
    }
    return fn();
  }

  private async handleButtonRequest(payload: Record<string, unknown>): Promise<void> {
    this.log('info', 'session.button.request', {
      code: payload.code,
      name: payload.name,
    });
    await this.thpOptions?.onButtonRequest?.(payload);
  }

  private async handleButtonRequestComplete(payload: Record<string, unknown>): Promise<void> {
    this.log('info', 'session.button.complete', {
      responseType: payload.responseType,
      code: payload.code,
    });
    await this.thpOptions?.onButtonRequestComplete?.(payload);
  }

  private async handlePinMatrixRequest(payload: TrezorPinMatrixRequestPayload): Promise<string> {
    this.log('info', 'session.pin.request', { type: payload.type });
    const handler = this.thpOptions?.onPinMatrixRequest;
    if (!handler) {
      throw new Error('Trezor PIN request requires a UI response handler');
    }

    try {
      const pin = await handler(payload);
      if (typeof pin !== 'string') {
        throw new Error('Trezor PIN response must be a string');
      }
      return pin;
    } catch (error) {
      await this.cancelCurrentCall().catch(() => undefined);
      throw error;
    }
  }

  private async handlePassphraseRequest(
    payload: Record<string, unknown>
  ): Promise<{ passphrase?: string; on_device?: boolean }> {
    this.log('info', 'session.passphrase.request', {
      keys: Object.keys(payload ?? {}),
      passphraseMode: this.passphraseMode,
    });
    if (this.passphraseMode === 'empty') {
      return { passphrase: '' };
    }
    const handler = this.thpOptions?.onPassphraseRequest;
    if (!handler) {
      throw new Error('Trezor passphrase request requires a UI response handler');
    }
    try {
      const res = await handler(payload);
      return res ?? { passphrase: '' };
    } catch (error) {
      await this.cancelCurrentCall().catch(() => undefined);
      throw error;
    }
  }

  private async cancelCurrentCall(): Promise<void> {
    if (!this.core) return;
    await this.core.call('Cancel', {}, { thpState: this.thpState });
  }

  private log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>) {
    emitDebugLog(this.thpOptions, level, 'trezor-core', event, data);
  }
}

class TrezorThpSession {
  private readonly core: TrezorCoreLike;

  private readonly thpState: InternalThpState;

  private readonly options: TrezorThpSessionOptions;

  constructor(
    core: TrezorCoreLike,
    thpState: InternalThpState,
    options: TrezorThpSessionOptions = {}
  ) {
    this.core = core;
    this.thpState = thpState;
    this.options = options;
  }

  async initialize({ tryToUnlock = 0 }: { tryToUnlock?: 0 | 1 } = {}) {
    this.log('info', 'thp.session.start', { tryToUnlock });
    await this.createChannel();
    await this.handshake(tryToUnlock);

    if (this.thpState.phase === 'pairing') {
      await this.pair();
    }

    if (this.thpState.phase !== 'paired') {
      // The session could not be (auto)paired — e.g. a stored credential was
      // rejected and discarded above. Tag it so the adapter maps it to a
      // recognizable HardwareErrorCode.ThpPairingRequired (the host then drives
      // a fresh pairing) instead of a generic Unknown.
      throw Object.assign(new Error('THP pairing is required before GetFeatures'), {
        code: 'ThpPairingRequired',
      });
    }
    this.log('info', 'thp.session.done', { phase: this.thpState.phase });
  }

  private async createChannel() {
    this.log('info', 'thp.createChannel.start');
    const nonce = this.randomBytes(8);
    this.thpState.setChannel(protocolThpRuntime.constants.THP_DEFAULT_CHANNEL);
    const response = expectMessage(
      await this.thpCall('ThpCreateChannelRequest', { nonce }),
      'ThpCreateChannelResponse'
    );
    const channel = response.message.channel as Buffer;
    const handshakeHash = response.message.handshakeHash as Buffer;
    const responseNonce = response.message.nonce as Buffer;
    const properties = response.message.properties as internalProtocolThp.ThpDeviceProperties;

    if (!bytesEqual(responseNonce, nonce)) {
      throw new Error('THP channel nonce mismatch');
    }

    const pairingMethods = getPairingMethods(
      properties.pairing_methods,
      this.options.pairingMethods ?? ['CodeEntry', 'QrCode', 'NFC', 'SkipPairing']
    );
    if (pairingMethods.length === 0) {
      throw new Error('No compatible THP pairing method');
    }

    this.thpState.setChannel(channel);
    this.thpState.setThpProperties(properties);
    this.thpState.updateHandshakeCredentials({
      pairingMethods,
      handshakeHash,
    });
    this.log('info', 'thp.createChannel.done', {
      channel: bytesToHex(channel),
      deviceMethods: properties.pairing_methods,
      compatibleMethods: pairingMethods,
      protocolVersion: `${properties.protocol_version_major}.${properties.protocol_version_minor}`,
      internalModel: properties.internal_model,
    });
  }

  private async handshake(tryToUnlock: 0 | 1 = 0) {
    this.log('info', 'thp.handshake.start', {
      knownCredentials: this.options.knownCredentials?.length ?? 0,
      tryToUnlock,
    });
    const hostEphemeralKeys = protocolThpRuntime.getCurve25519KeyPair(this.randomBytes(32));
    const handshakeInit = expectMessage(
      await this.thpCall('ThpHandshakeInitRequest', {
        key: hostEphemeralKeys.publicKey,
        tryToUnlock,
      }),
      'ThpHandshakeInitResponse'
    );
    const handshakeCredentials = this.options.handleHandshakeInit
      ? this.options.handleHandshakeInit({
          handshakeInitResponse: handshakeInit.message as TrezorThpHandshakeInitResponse,
          thpState: this.thpState as TrezorThpState,
          hostEphemeralKeys,
          knownCredentials: this.options.knownCredentials ?? [],
          tryToUnlock,
          protobufEncoder: (name: string, data: Record<string, unknown>) =>
            protobufManager.encode(name, data),
        })
      : protocolThpRuntime.handleHandshakeInit({
          handshakeInitResponse:
            handshakeInit.message as internalProtocolThp.ThpHandshakeInitResponse,
          thpState: this.thpState,
          hostEphemeralKeys,
          knownCredentials:
            (this.options.knownCredentials as internalProtocolThp.ThpCredentials[] | undefined) ??
            [],
          tryToUnlock,
          protobufEncoder: (name: string, data: Record<string, unknown>) =>
            protobufManager.encode(name, data),
        });

    this.thpState.updateHandshakeCredentials({
      trezorEncryptedStaticPubkey: handshakeCredentials.trezorEncryptedStaticPubkey,
      hostEncryptedStaticPubkey: handshakeCredentials.hostEncryptedStaticPubkey,
      handshakeHash: handshakeCredentials.handshakeHash,
      trezorKey: handshakeCredentials.trezorKey,
      hostKey: handshakeCredentials.hostKey,
      staticKey: handshakeCredentials.staticKey,
      hostStaticPublicKey: handshakeCredentials.hostStaticKeys.publicKey,
    });
    this.thpState.setPairingCredentials(
      handshakeCredentials.allCredentials as internalProtocolThp.ThpCredentials[]
    );

    const completion = expectMessage(
      await this.thpCall('ThpHandshakeCompletionRequest', {
        hostPubkey: handshakeCredentials.hostEncryptedStaticPubkey,
        encryptedPayload: handshakeCredentials.encryptedPayload,
      }),
      'ThpHandshakeCompletionResponse'
    );

    const completionState = completion.message.state as number;
    this.thpState.setIsPaired(completionState !== 0);
    this.thpState.setPhase('pairing');

    // A stored credential was used but the device rejected it (state=0). Throw
    // it away — from in-memory state AND, via the host callback, from persisted
    // storage — otherwise the stale credential is fed back on every reconnect
    // and autoconnect loops forever. Mirrors trezor-suite device/thp/handshake.
    if (!completionState && handshakeCredentials.credentials) {
      this.thpState.removePairingCredential(handshakeCredentials.credentials);
      await this.options.onPairingCredentialsChanged?.({
        credentials: this.thpState.pairingCredentials as TrezorThpCredentials[],
      });
    }

    this.log('info', 'thp.handshake.done', {
      completionState,
      isPaired: this.thpState.isPaired,
      isAutoconnectPaired: this.thpState.isAutoconnectPaired,
      credentials: handshakeCredentials.allCredentials.length,
    });
    if (this.thpState.isAutoconnectPaired || completionState === 2) {
      await this.endPairing();
    }
  }

  private async pair() {
    this.log('info', 'thp.pair.start', {
      isPaired: this.thpState.isPaired,
      pairingMethod: this.thpState.pairingMethod,
    });
    if (
      this.thpState.isPaired &&
      this.thpState.pairingMethod !== protocolThpRuntime.ThpPairingMethod.SkipPairing
    ) {
      await this.getCredentials(false);
      await this.endPairing();
      return;
    }

    const selectedMethod = this.thpState.handshakeCredentials!.pairingMethods[0];
    this.thpState.setPairingMethod(selectedMethod);
    this.log('info', 'thp.pair.methodSelected', { selectedMethod });
    await this.thpCall('ThpPairingRequest', {
      host_name: sanitizeString(this.options.hostName) || 'Unknown hostName',
      app_name: sanitizeString(this.options.appName) || 'Unknown appName',
    });
    const selectMethod = await this.thpCall('ThpSelectMethod', {
      selected_pairing_method: selectedMethod,
    });

    if (selectMethod.type === 'ThpEndResponse') {
      this.thpState.setIsPaired(true);
      this.thpState.setPhase('paired');
      this.log('info', 'thp.pair.done', { responseType: selectMethod.type });
      return;
    }

    if (selectMethod.type === 'ThpCodeEntryCommitment') {
      try {
        await this.finishCodeEntryPairing(selectMethod.message);
      } catch (error) {
        // A device Failure here means CodeEntry pairing didn't match —
        // e.g. the user mistyped the code shown on the device, so the
        // CPace tag was rejected ("Unexpected Code Entry Tag"). Re-tag
        // with a stable marker so the adapter maps it to a standard
        // HardwareErrorCode.ThpPairingFailed instead of a generic Unknown.
        this.log('error', 'thp.codeEntry.error', { error: errorToLog(error) });
        const errMessage = error instanceof Error ? error.message : String(error);
        throw Object.assign(new Error(errMessage), {
          code: 'ThpPairingFailed',
          cause: error,
        });
      }
    } else {
      throw new Error(`Unsupported THP pairing response: ${selectMethod.type}`);
    }

    const credentials = await this.getCredentials(false);
    this.thpState.setPairingCredentials([credentials]);
    this.thpState.setIsPaired(true);
    await this.endPairing();
    this.log('info', 'thp.pair.done', { credentials: 1 });
    await this.options.onPairingCredentialsChanged?.({
      credentials: this.thpState.pairingCredentials as TrezorThpCredentials[],
    });
  }

  private async finishCodeEntryPairing(message: Record<string, unknown>) {
    this.log('info', 'thp.codeEntry.start', { messageKeys: Object.keys(message) });
    const codeEntryChallenge = this.randomBytes(32);
    this.thpState.updateHandshakeCredentials({
      handshakeCommitment: Buffer.from(String(message.commitment), 'hex'),
      codeEntryChallenge,
    });
    const codeEntryCpace = expectMessage(
      await this.thpCall('ThpCodeEntryChallenge', {
        challenge: bytesToHex(codeEntryChallenge),
      }),
      'ThpCodeEntryCpaceTrezor'
    );
    this.thpState.updateHandshakeCredentials({
      trezorCpacePublicKey: Buffer.from(
        String(codeEntryCpace.message.cpace_trezor_public_key),
        'hex'
      ),
    });
    const response = await this.requestPairingTag();
    if (!('tag' in response)) {
      throw new Error('THP CodeEntry pairing requires a tag');
    }
    this.log('info', 'thp.codeEntry.tagReceived', { tagLength: response.tag.length });

    const hostKeys = protocolThpRuntime.getCpaceHostKeys(
      Buffer.from(response.tag, 'ascii'),
      this.thpState.handshakeCredentials!.handshakeHash
    );
    const tag = bytesToHex(
      protocolThpRuntime.getSharedSecret(
        this.thpState.handshakeCredentials!.trezorCpacePublicKey,
        hostKeys.privateKey
      )
    );
    const secret = expectMessage(
      await this.thpCall('ThpCodeEntryCpaceHostTag', {
        tag,
        cpace_host_public_key: bytesToHex(hostKeys.publicKey),
      }),
      'ThpCodeEntrySecret'
    );
    protocolThpRuntime.validateCodeEntryTag(
      this.thpState.handshakeCredentials!,
      response.tag,
      String(secret.message.secret)
    );
    this.log('info', 'thp.codeEntry.done');
  }

  private async getCredentials(autoconnect: boolean): Promise<internalProtocolThp.ThpCredentials> {
    this.log('info', 'thp.credentials.start', { autoconnect });
    const response = expectMessage(
      await this.thpCall('ThpCredentialRequest', {
        autoconnect,
        host_static_public_key: bytesToHex(this.thpState.handshakeCredentials!.hostStaticPublicKey),
        credential: this.thpState.pairingCredentials[0]?.credential,
      }),
      'ThpCredentialResponse'
    );

    const credentials = {
      ...response.message,
      autoconnect,
      host_static_key: bytesToHex(this.thpState.handshakeCredentials!.staticKey),
    } as internalProtocolThp.ThpCredentials;
    this.log('info', 'thp.credentials.done', { autoconnect });
    return credentials;
  }

  private async endPairing() {
    this.log('info', 'thp.endPairing.start');
    await this.thpCall('ThpEndRequest', {});
    this.thpState.setPhase('paired');
    this.log('info', 'thp.endPairing.done');
  }

  private async thpCall(
    name: string,
    data: Record<string, unknown>
  ): Promise<{ type: string; message: Record<string, unknown> }> {
    this.log('debug', 'thp.call.request', { name, dataKeys: Object.keys(data) });
    let response: { type: string; message: Record<string, unknown> };
    try {
      response = await this.core.call(name, data, { thpState: this.thpState });
    } catch (error) {
      this.log('error', 'thp.call.error', { name, error: errorToLog(error) });
      throw error;
    }
    this.log('debug', 'thp.call.response', {
      name,
      responseType: response.type,
      messageKeys: Object.keys(response.message ?? {}),
    });
    if (name === 'ButtonAck') {
      await this.options.onButtonRequestComplete?.({
        responseType: response.type,
        message: response.message,
      });
    }
    if (response.type === 'ButtonRequest') {
      this.log('info', 'thp.button.request', { messageKeys: Object.keys(response.message ?? {}) });
      await this.options.onButtonRequest?.(response.message);
      return this.thpCall('ButtonAck', {});
    }
    if (response.type === 'Failure' || response.type === 'ThpError') {
      this.log('error', 'thp.call.failure', {
        name,
        responseType: response.type,
        message: response.message,
      });
      // Surface the device-side `code` (e.g. 'ThpDeviceLocked', 'Failure_InvalidProtocol')
      // so the outer initializeThp() can dispatch on it — trezor-suite's swallow-
      // and-retry-with-tryToUnlock logic only works if you can tell ThpDeviceLocked
      // apart from a generic THP transport error.
      const code = (response.message as { code?: string } | undefined)?.code ?? response.type;
      const msg = String(response.message.message ?? code);
      throw Object.assign(new Error(msg), { code, response });
    }
    return response;
  }

  private async requestPairingTag(): Promise<TrezorThpPairingResponse> {
    if (!this.options.onPairingRequest) {
      throw new Error('THP pairing requires UI response');
    }

    this.log('info', 'thp.pairingTag.request', {
      availableMethods: this.thpState.handshakeCredentials!.pairingMethods,
      selectedMethod: this.thpState.pairingMethod!,
      hasNfcData: Boolean(this.thpState.nfcData),
    });
    return this.options.onPairingRequest({
      availableMethods: this.thpState.handshakeCredentials!.pairingMethods,
      selectedMethod: this.thpState.pairingMethod!,
      nfcData: this.thpState.nfcData ? bytesToHex(this.thpState.nfcData) : undefined,
    });
  }

  private randomBytes(size: number) {
    if (this.options.randomBytes) return this.options.randomBytes(size);

    const bytes = new Uint8Array(size);
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) {
      throw new Error('Secure random source is unavailable');
    }
    cryptoApi.getRandomValues(bytes);
    return Buffer.from(bytes);
  }

  private log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>) {
    emitDebugLog(this.options, level, 'trezor-core', event, data);
  }
}

function expectMessage<T extends string>(
  response: { type: string; message: Record<string, unknown> },
  type: T
): { type: T; message: Record<string, unknown> } {
  if (response.type !== type) {
    throw new Error(`Expected ${type} response, received ${response.type}`);
  }
  return response as { type: T; message: Record<string, unknown> };
}

function getPairingMethods(
  deviceMethods: TrezorThpPairingMethod[],
  settingsMethods: TrezorThpPairingMethod[]
) {
  return deviceMethods.flatMap(method => {
    const value = protocolThpRuntime.getThpPairingMethod(method);
    return settingsMethods.some(
      setting => value === protocolThpRuntime.getThpPairingMethod(setting)
    )
      ? [value]
      : [];
  });
}

function sanitizeString(value?: string) {
  return typeof value === 'string' ? value.replace(/[^\w .-]/g, '').slice(0, 32) : '';
}

function emitDebugLog(
  options: TrezorThpSessionOptions | undefined,
  level: TrezorDebugLogLevel,
  scope: string,
  event: string,
  data?: Record<string, unknown>
) {
  const entry = filterTrezorDebugLogEntry({ level, scope, event, data });
  if (!entry) return;

  try {
    options?.logger?.(entry);
  } catch {
    // Debug logging must not affect protocol execution.
  }
}

function errorToLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return String(error);
}

function summarizeFeatures(features: Record<string, unknown> | undefined) {
  if (!features) return undefined;
  return {
    vendor: features.vendor,
    device_id: features.device_id,
    model: features.model,
    label: features.label,
    major_version: features.major_version,
    minor_version: features.minor_version,
    patch_version: features.patch_version,
    capabilities: summarizeFeatureCapabilities(features.capabilities),
  };
}

function summarizeFeatureCapabilities(capabilities: unknown): Array<string | number> {
  if (!Array.isArray(capabilities)) return [];
  return capabilities.filter(
    (capability): capability is string | number =>
      typeof capability === 'string' || typeof capability === 'number'
  );
}
