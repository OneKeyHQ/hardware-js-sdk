import {
  DEVICE,
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  UiRequestRegistry,
  createHwkError,
  isKnownNonTargetHardwareVendor,
  serializeConnectorError,
} from '@onekeyfe/hwk-adapter-core';
import {
  type TrezorByteTransport,
  type TrezorDebugLogLevel,
  TrezorDeviceSession,
  type TrezorPassphraseMode,
  type TrezorThpCredentials,
  type TrezorThpSessionOptions,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-core';

import {
  btcGetAddress,
  btcGetMasterFingerprint,
  btcGetPublicKey,
  btcSignMessage,
  btcSignPsbt,
  btcSignTransaction,
  evmGetAddress,
  evmSignMessage,
  evmSignTransaction,
  evmSignTypedData,
  readNumber,
  readString,
  solGetAddress,
  solSignMessage,
  solSignTransaction,
  tronGetAddress,
  tronSignMessage,
  tronSignTransaction,
} from './chains';

import type {
  ConnectionType,
  ConnectorCallResult,
  ConnectorDevice,
  ConnectorEventMap,
  ConnectorEventType,
  ConnectorSession,
  IConnector,
} from '@onekeyfe/hwk-adapter-core';

export {
  filterTrezorDebugLogEntry,
  sanitizeTrezorDebugLogData,
  shouldLogTrezorDebugEntry,
  type TrezorDebugLogger,
  type TrezorDebugLogEntry,
  type TrezorDebugLogLevel,
} from '@onekeyfe/hwk-trezor-core';

type EventHandler<K extends ConnectorEventType> = (data: ConnectorEventMap[K]) => void;

export type TrezorConnectorByteTransport = TrezorByteTransport & {
  reconnect?(): Promise<void>;
  close?(): Promise<void>;
  /**
   * Subscribe to physical-disconnect events from the underlying transport
   * (e.g. BLE link drop). Returns an unsubscribe function.
   */
  onDisconnect?(handler: () => void): () => void;
};

export type TrezorConnectorBaseOptions = {
  connectionType?: ConnectionType;
  chunkSize?: number;
  thp?: TrezorThpSessionOptions;
  deviceSessionFactory?: (params: {
    transport: TrezorConnectorByteTransport;
    connectionType: ConnectionType;
    chunkSize: number;
    thp?: TrezorThpSessionOptions;
  }) => TrezorDeviceSession;
};

type TrezorSession = {
  sessionId: string;
  device: ConnectorDevice;
  transport: TrezorConnectorByteTransport;
  deviceSession: TrezorDeviceSession;
  features: Record<string, unknown>;
  unsubscribeDisconnect?: () => void;
};

type RequiredDeviceCapability = {
  name: string;
  value: number;
};

type TrezorCreateSessionParams = {
  deriveCardano?: boolean;
  passphraseMode?: TrezorPassphraseMode;
};

type TrezorMessageResponse = {
  type: string;
  message: Record<string, unknown>;
};

const DEVICE_CAPABILITY = {
  Tron: { name: 'Capability_Tron', value: 24 },
} as const satisfies Record<string, RequiredDeviceCapability>;

const REQUIRED_DEVICE_CAPABILITIES: Partial<Record<string, RequiredDeviceCapability[]>> = {
  tronGetAddress: [DEVICE_CAPABILITY.Tron],
  tronSignTransaction: [DEVICE_CAPABILITY.Tron],
};

function normalizePassphraseMode(passphraseMode: unknown): TrezorPassphraseMode {
  if (passphraseMode === undefined) return 'prompt';
  if (passphraseMode === 'prompt' || passphraseMode === 'empty') return passphraseMode;
  throw createHwkError({
    code: HardwareErrorCode.InvalidParams,
    message: `Invalid Trezor passphrase mode: ${String(passphraseMode)}`,
  });
}

function getTrezorResponseMessage(response: unknown): Record<string, unknown> {
  const message = (response as TrezorMessageResponse | undefined)?.message;
  if (message && typeof message === 'object') {
    return message;
  }
  return {};
}

const AUTHENTICITY_PROOF_CHUNK_SIZE = 500;
const MAX_AUTHENTICITY_PROOF_PART_SIZE = 64 * 1024;
const MAX_AUTHENTICITY_CERTIFICATE_COUNT = 4;

type AuthenticityProofSizes = {
  optiga_certificates?: number[];
  optiga_signature?: number;
  tropic_certificates?: number[];
  tropic_signature?: number;
  mcu_certificates?: number[];
  mcu_signature?: number;
};

const validateAuthenticityProofPartSize = (size: unknown): number => {
  if (
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    size > MAX_AUTHENTICITY_PROOF_PART_SIZE
  ) {
    throw createHwkError({
      code: HardwareErrorCode.UnknownError,
      message: `Invalid Trezor authenticity proof part size: ${String(size)}`,
    });
  }
  return size;
};

const readAuthenticityProofPart = async ({
  deviceSession,
  proofType,
  index,
  size,
}: {
  deviceSession: TrezorDeviceSession;
  proofType: number;
  index?: number;
  size: number;
}): Promise<string> => {
  const expectedSize = validateAuthenticityProofPartSize(size);
  let offset = 0;
  let result = '';
  while (offset < expectedSize) {
    const requestedSize = Math.min(AUTHENTICITY_PROOF_CHUNK_SIZE, expectedSize - offset);
    const request: Record<string, unknown> = {
      proof_type: proofType,
      offset,
      size: requestedSize,
    };
    if (index !== undefined) request.index = index;
    const response = (await deviceSession.call(
      'GetAuthenticityProofChunk',
      request
    )) as TrezorMessageResponse;
    if (response.type !== 'AuthenticityProofChunk') {
      throw createHwkError({
        code: HardwareErrorCode.UnknownError,
        message: `Expected AuthenticityProofChunk, received ${response.type}`,
      });
    }
    const chunk = response.message?.chunk;
    if (typeof chunk !== 'string' || chunk.length !== requestedSize * 2) {
      throw createHwkError({
        code: HardwareErrorCode.UnknownError,
        message: 'Trezor returned an invalid authenticity proof chunk',
      });
    }
    result += chunk;
    offset += requestedSize;
  }
  return result;
};

const readAuthenticityProofStream = async (
  deviceSession: TrezorDeviceSession,
  sizes: AuthenticityProofSizes
): Promise<Record<string, unknown>> => {
  const readCertificates = async (proofType: number, values: unknown): Promise<string[]> => {
    if (!Array.isArray(values)) {
      throw createHwkError({
        code: HardwareErrorCode.UnknownError,
        message: 'Trezor returned invalid authenticity certificate sizes',
      });
    }
    if (values.length > MAX_AUTHENTICITY_CERTIFICATE_COUNT) {
      throw createHwkError({
        code: HardwareErrorCode.UnknownError,
        message: `Trezor authenticity proof contains too many certificates: ${values.length}`,
      });
    }
    const certificates: string[] = [];
    for (let index = 0; index < values.length; index += 1) {
      certificates.push(
        await readAuthenticityProofPart({
          deviceSession,
          proofType,
          index,
          size: validateAuthenticityProofPartSize(values[index]),
        })
      );
    }
    return certificates;
  };
  const readSignature = async (proofType: number, size: unknown): Promise<string | undefined> => {
    if (size === undefined || size === null || size === 0) return undefined;
    return readAuthenticityProofPart({
      deviceSession,
      proofType,
      size: validateAuthenticityProofPartSize(size),
    });
  };

  try {
    // Sequential reads are required: the firmware stream permits one outstanding
    // chunk request at a time.
    const optigaCertificates = await readCertificates(0, sizes.optiga_certificates ?? []);
    const optigaSignature = await readSignature(0, sizes.optiga_signature);
    const tropicCertificates = await readCertificates(1, sizes.tropic_certificates ?? []);
    const tropicSignature = await readSignature(1, sizes.tropic_signature);
    const mcuCertificates = await readCertificates(2, sizes.mcu_certificates ?? []);
    const mcuSignature = await readSignature(2, sizes.mcu_signature);

    return {
      optiga_certificates: optigaCertificates,
      optiga_signature: optigaSignature,
      tropic_certificates: tropicCertificates,
      tropic_signature: tropicSignature,
      mcu_certificates: mcuCertificates,
      mcu_signature: mcuSignature,
    };
  } finally {
    // Firmware keeps the proof stream open until this empty request. Always
    // release it, including malformed/host-aborted responses.
    await deviceSession.call('GetAuthenticityProofChunk', { offset: 0, size: 0 });
  }
};

export abstract class TrezorConnectorBase implements IConnector {
  readonly connectionType: ConnectionType;

  private readonly chunkSize: number;

  private readonly thp?: TrezorThpSessionOptions;

  // Single owned array — passed by reference into every TrezorThpSession via
  // `createThpOptions`. setKnownCredentials() and the auto-merge inside
  // onPairingCredentialsChanged both mutate this array in-place so the next
  // handshake sees fresh credentials without a connector rebuild.
  private readonly knownCredentials: TrezorThpCredentials[] = [];

  private readonly deviceSessionFactory: NonNullable<
    TrezorConnectorBaseOptions['deviceSessionFactory']
  >;

  private readonly eventHandlers = new Map<
    ConnectorEventType,
    Set<EventHandler<ConnectorEventType>>
  >();

  private readonly uiRequests = new UiRequestRegistry();

  private readonly devices = new Map<string, ConnectorDevice>();

  private readonly sessions = new Map<string, TrezorSession>();

  protected constructor(options: TrezorConnectorBaseOptions = {}) {
    this.connectionType = options.connectionType ?? 'usb';
    this.chunkSize = options.chunkSize ?? 64;
    this.thp = options.thp;
    if (options.thp?.knownCredentials?.length) {
      this.knownCredentials.push(...options.thp.knownCredentials);
    }
    this.deviceSessionFactory =
      options.deviceSessionFactory ??
      (params =>
        new TrezorDeviceSession({
          transport: params.transport,
          connectionType: params.connectionType,
          chunkSize: params.chunkSize,
          thp: params.thp,
        }));
  }

  /**
   * Replace the in-memory THP pairing credential list. Caller (host) reads
   * persisted credentials from storage and pushes them in here before the
   * first connect; the device sees them via `ThpHandshakeInitRequest` and
   * routes through the autoconnect path instead of CodeEntry.
   *
   * Empty list = "no credentials known" = fresh pairing on next connect.
   * The internal array is reused so any in-flight TrezorThpSession picks up
   * the change too — we mutate, not replace.
   */
  setKnownCredentials(credentials: TrezorThpCredentials[]): void {
    this.knownCredentials.length = 0;
    if (credentials?.length) {
      this.knownCredentials.push(...credentials);
    }
  }

  /**
   * Push new credentials minted during pairing into the in-memory array.
   * Deduplicates by the device-minted `credential` blob — the host has no
   * other stable identity for a credential.
   */
  private mergeKnownCredentials(incoming: ReadonlyArray<TrezorThpCredentials>): void {
    for (const cred of incoming) {
      const blob = (cred as { credential?: string }).credential;
      if (!blob) continue;
      const exists = this.knownCredentials.some(
        existing => (existing as { credential?: string }).credential === blob
      );
      if (!exists) this.knownCredentials.push(cred);
    }
  }

  protected abstract enumerateDevices(): Promise<ConnectorDevice[]>;

  protected abstract createByteTransport(
    device: ConnectorDevice
  ): Promise<TrezorConnectorByteTransport>;

  protected resolveUnlistedDevice(_deviceId: string): ConnectorDevice | undefined {
    return undefined;
  }

  async searchDevices(): Promise<ConnectorDevice[]> {
    const devices = await this.enumerateDevices();
    this.devices.clear();
    for (const device of devices) {
      this.devices.set(device.connectId, device);
    }
    return devices;
  }

  async connect(deviceId?: string): Promise<ConnectorSession> {
    this.log('info', 'connector.connect.start', { deviceId });
    const device = await this.resolveDevice(deviceId);
    this.log('info', 'connector.connect.deviceResolved', {
      connectId: device.connectId,
      deviceId: device.deviceId,
      name: device.name,
      model: device.model,
    });
    let transport: TrezorConnectorByteTransport;
    try {
      this.log('info', 'connector.connect.transport.start', { connectId: device.connectId });
      transport = await this.createByteTransport(device);
      this.log('info', 'connector.connect.transport.done', { connectId: device.connectId });
    } catch (error) {
      this.log('error', 'connector.connect.transport.error', {
        connectId: device.connectId,
        error: errorToLog(error),
      });
      throw error;
    }
    const deviceSession = this.deviceSessionFactory({
      transport,
      connectionType: this.connectionType,
      chunkSize: this.chunkSize,
      thp: this.createThpOptions(device),
    });
    let features: Record<string, unknown>;
    try {
      this.log('info', 'connector.connect.sessionInitialize.start', {
        connectId: device.connectId,
      });
      features = await deviceSession.initialize();
      rejectKnownNonTrezorDevice(features);
      this.log('info', 'connector.connect.sessionInitialize.done', {
        connectId: device.connectId,
        featureKeys: Object.keys(features),
      });
    } catch (error) {
      this.log('error', 'connector.connect.sessionInitialize.error', {
        connectId: device.connectId,
        error: errorToLog(error),
      });
      // Keep the device open on init failure (Suite does the same); the next
      // connect() reuses the cached handle. Real unplugs are evicted by the USB
      // disconnect listener. No pipe flush — reset() wedges Safe 7 — and none
      // is needed: v1 decode rejects non-`?##` frames (PROTOCOL_MALFORMED), so
      // any residue fails the retry loudly instead of returning wrong data, and
      // that read drains it so the next retry succeeds.
      throw error;
    }
    const sessionId = device.connectId;
    const session: TrezorSession = {
      sessionId,
      device,
      transport,
      deviceSession,
      features,
    };
    this.sessions.set(sessionId, session);

    session.unsubscribeDisconnect = transport.onDisconnect?.(() => {
      if (this.sessions.get(sessionId) !== session) return;
      this.sessions.delete(sessionId);
      session.unsubscribeDisconnect?.();
      this.emit('device-disconnect', { connectId: device.connectId });
    });

    // Promote a small typed surface (deviceId/model/firmwareVersion/label)
    // and stash the FULL Features blob + the discovery descriptor in `raw`
    // so the app layer can see every field the device returned without
    // round-tripping through a new SDK release each time a field gets used.
    const connectorSession = {
      sessionId,
      deviceInfo: {
        vendor: 'trezor' as const,
        connectId: device.connectId,
        deviceId: readString(features, 'device_id') ?? '',
        model:
          readString(features, 'internal_model') ??
          readString(features, 'model') ??
          device.model ??
          'unknown',
        firmwareVersion: buildFirmwareVersion(features),
        label: readString(features, 'label') ?? device.name,
        connectionType: this.connectionType,
        serialNumber: device.serialNumber,
        capabilities: device.capabilities,
        raw: {
          features,
          discoveryRaw: device.raw,
        },
      },
    };
    this.emit('device-connect', { device: connectorSessionToDevice(connectorSession) });
    this.emitSupportFeatures(session);
    const connectFeaturesLog = {
      connectId: device.connectId,
      protocol: deviceSession.isThp ? 'thp' : 'v1',
      connectionType: this.connectionType,
      featuresDeviceId: readString(features, 'device_id'),
      model: readString(features, 'model') ?? device.model ?? 'unknown',
      firmwareVersion: buildFirmwareVersion(features),
      capabilities: summarizeCapabilities(features.capabilities),
      hasCapabilityTron: hasDeviceCapability(features.capabilities, DEVICE_CAPABILITY.Tron),
    };
    this.log('info', 'connector.connect.features', connectFeaturesLog);
    this.log('info', 'connector.connect.done', { sessionId });
    return connectorSession;
  }

  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.unsubscribeDisconnect?.();
    this.sessions.delete(sessionId);
    await session.transport.close?.();
    this.emit('device-disconnect', { connectId: session.device.connectId });
  }

  async call(sessionId: string, method: string, params: unknown): Promise<ConnectorCallResult> {
    const startedAt = Date.now();
    try {
      const payload = await this.dispatchCall(sessionId, method, params);
      const session = this.sessions.get(sessionId);
      if (session) {
        this.emitSupportFeatures(session);
      }
      this.log('info', 'connector.call.done', {
        sessionId,
        method,
        durationMs: Date.now() - startedAt,
        payloadKeys:
          payload && typeof payload === 'object'
            ? Object.keys(payload as Record<string, unknown>)
            : [],
      });
      return { success: true, payload };
    } catch (error) {
      this.log('warn', 'connector.call.error', {
        sessionId,
        method,
        durationMs: Date.now() - startedAt,
        error: errorToLog(error),
      });
      return { success: false, error: serializeConnectorError(error) };
    }
  }

  private async dispatchCall(sessionId: string, method: string, params: unknown): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: `Trezor session not found: ${sessionId}`,
      });
    }

    this.checkDeviceCapabilities(method, session);

    const ctx = { deviceSession: session.deviceSession };
    switch (method) {
      case 'getFeatures': {
        const p = (params ?? {}) as { refresh?: boolean };
        if (p.refresh) {
          // Force a FRESH device read (updates currentFeatures). A LOCKED device
          // reports unreliable fields (notably passphrase_protection); the host
          // calls this AFTER an unlock so the features are trustworthy. The
          // cached `deviceSession.features` (default) can be stale/locked.
          const response = await session.deviceSession.call('GetFeatures', {});
          session.features = getTrezorResponseMessage(response);
          return session.features;
        }
        const features = session.deviceSession.features ?? session.features;
        session.features = features;
        return features;
      }
      case 'deviceSettings': {
        const result = await session.deviceSession.call(
          'ApplySettings',
          (params ?? {}) as Record<string, unknown>
        );
        const featuresResponse = await session.deviceSession.call('GetFeatures', {});
        session.features = getTrezorResponseMessage(featuresResponse);
        return getTrezorResponseMessage(result);
      }
      case 'setBrightness': {
        const result = await session.deviceSession.call(
          'SetBrightness',
          (params ?? {}) as Record<string, unknown>
        );
        await session.deviceSession
          .call('GetFeatures', {})
          .then(response => {
            session.features = getTrezorResponseMessage(response);
          })
          .catch(() => undefined);
        return getTrezorResponseMessage(result);
      }
      case 'changePin':
        return getTrezorResponseMessage(
          await session.deviceSession.call('ChangePin', (params ?? {}) as Record<string, unknown>)
        );
      case 'wipeDevice':
        return getTrezorResponseMessage(await session.deviceSession.call('WipeDevice', {}));
      case 'authenticateDevice': {
        // Current Safe 7 firmware streams the larger Optiga + Tropic + MCU/ML-DSA
        // proof. Older secure-element models return AuthenticityProof directly.
        const p = (params ?? {}) as { challenge: string };
        const response = (await session.deviceSession.call('AuthenticateDevice', {
          challenge: p.challenge,
          stream: true,
        })) as TrezorMessageResponse;
        if (response.type === 'AuthenticityProof') {
          return getTrezorResponseMessage(response);
        }
        if (response.type !== 'AuthenticityProofSizes') {
          throw createHwkError({
            code: HardwareErrorCode.UnknownError,
            message: `Expected Trezor authenticity proof, received ${response.type}`,
          });
        }
        return readAuthenticityProofStream(
          session.deviceSession,
          response.message as AuthenticityProofSizes
        );
      }
      // --- THP application-session control (Trezor-specific, driven by the
      // adapter to align the active passphrase session before a chain call).
      // The connector deals only in session ids; wallet identity belongs to the
      // adapter's per-call verification.
      case '__thpCreateSession': {
        const p = (params ?? {}) as TrezorCreateSessionParams;
        const passphraseMode = normalizePassphraseMode(p.passphraseMode);
        if (!session.deviceSession.isThp) {
          await session.deviceSession.createV1AppSession({ passphraseMode });
          return { protocol: 'v1' as const, thpSessionId: null };
        }
        const thpSessionId = await session.deviceSession.createThpAppSession({
          deriveCardano: p.deriveCardano,
          passphraseMode,
        });
        return { protocol: 'thp' as const, thpSessionId };
      }
      case '__thpSelectSession': {
        if (!session.deviceSession.isThp) {
          return { protocol: 'v1' as const, thpSessionId: null };
        }
        const p = (params ?? {}) as { thpSessionId?: string };
        if (!p.thpSessionId) {
          throw createHwkError({
            code: HardwareErrorCode.InvalidParams,
            message: '__thpSelectSession requires a thpSessionId',
          });
        }
        session.deviceSession.selectThpAppSession(p.thpSessionId);
        return { protocol: 'thp' as const, thpSessionId: p.thpSessionId };
      }
      case '__thpActiveSession':
        return {
          protocol: session.deviceSession.isThp ? ('thp' as const) : ('v1' as const),
          thpSessionId: session.deviceSession.getThpAppSessionId() ?? null,
        };
      case 'btcGetAddress':
        return btcGetAddress(ctx, params);
      case 'btcGetPublicKey':
        return btcGetPublicKey(ctx, params);
      case 'btcSignMessage':
        return btcSignMessage(ctx, params);
      case 'btcSignTransaction':
        return btcSignTransaction(ctx, params);
      case 'btcSignPsbt':
        return btcSignPsbt(ctx, params);
      case 'btcGetMasterFingerprint':
        return btcGetMasterFingerprint(ctx);
      case 'evmGetAddress':
        return evmGetAddress(ctx, params);
      case 'evmSignMessage':
        return evmSignMessage(ctx, params);
      case 'evmSignTransaction':
        return evmSignTransaction(ctx, params);
      case 'evmSignTypedData':
        return evmSignTypedData(ctx, params);
      case 'solGetAddress':
        return solGetAddress(ctx, params);
      case 'solSignTransaction':
        return solSignTransaction(ctx, params);
      case 'solSignMessage':
        return solSignMessage(ctx, params);
      case 'tronGetAddress':
        return tronGetAddress(ctx, params);
      case 'tronSignTransaction':
        return tronSignTransaction(ctx, params);
      case 'tronSignMessage':
        return tronSignMessage(ctx, params);
      default:
        throw createHwkError({
          code: HardwareErrorCode.MethodNotSupported,
          message: `TrezorConnector: method "${method}" is not implemented`,
        });
    }
  }

  private checkDeviceCapabilities(method: string, session: TrezorSession): void {
    const required = REQUIRED_DEVICE_CAPABILITIES[method];
    if (!required?.length) return;

    const features = session.deviceSession.features ?? session.features;
    const { capabilities } = features;
    const hasAllRequired = required.every(capability =>
      hasDeviceCapability(capabilities, capability)
    );
    const checkPayload = {
      sessionId: session.sessionId,
      connectId: session.device.connectId,
      protocol: session.deviceSession.isThp ? 'thp' : 'v1',
      method,
      requiredCapabilities: required.map(capability => capability.name),
      capabilities: summarizeCapabilities(capabilities),
      hasAllRequired,
    };
    this.log(hasAllRequired ? 'info' : 'warn', 'capability.check', checkPayload);
    if (hasAllRequired) return;

    throw createHwkError({
      code: HardwareErrorCode.MethodNotSupported,
      message: `Trezor device is missing required capability for ${method}: ${required
        .map(capability => capability.name)
        .join(', ')}`,
      params: {
        method,
        requiredCapabilities: required.map(capability => capability.name),
        deviceCapabilities: summarizeCapabilities(capabilities),
      },
    });
  }

  async cancel(_sessionId: string): Promise<void> {
    // Trezor cancel is implemented as a protocol call once interactive flows are wired.
  }

  uiResponse(_response: Parameters<IConnector['uiResponse']>[0]): void {
    if (_response.type === UI_RESPONSE.CANCEL) {
      this.uiRequests.cancel();
      return;
    }

    this.uiRequests.resolve(_response.type, _response.payload);
  }

  on<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler<ConnectorEventType>);
  }

  off<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler<ConnectorEventType>);
  }

  reset(): void {
    for (const session of this.sessions.values()) {
      void session.transport.close?.();
    }
    this.sessions.clear();
    this.devices.clear();
    this.uiRequests.reset();
    this.eventHandlers.clear();
  }

  protected emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]): void {
    for (const handler of this.eventHandlers.get(event) ?? []) {
      handler(data);
    }
  }

  private async resolveDevice(deviceId?: string): Promise<ConnectorDevice> {
    if (deviceId && this.devices.has(deviceId)) {
      return this.devices.get(deviceId)!;
    }

    if (deviceId) {
      const unlistedDevice = this.resolveUnlistedDevice(deviceId);
      if (unlistedDevice) {
        this.devices.set(unlistedDevice.connectId, unlistedDevice);
        return unlistedDevice;
      }
    }

    const devices = await this.searchDevices();
    const device = deviceId
      ? devices.find(d => d.connectId === deviceId || d.deviceId === deviceId)
      : devices[0];
    if (device) {
      return device;
    }

    if (!device) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: deviceId ? `Trezor device not found: ${deviceId}` : 'No Trezor device found',
      });
    }

    return device;
  }

  private createThpOptions(device: ConnectorDevice): TrezorThpSessionOptions | undefined {
    if (this.connectionType !== 'ble' && !this.thp) return this.thp;

    return {
      ...this.thp,
      // Override caller's knownCredentials (if any) with our managed array.
      // The session reads .length and individual entries at handshake-time,
      // so mutating this array between sessions is sufficient — no rebuild.
      knownCredentials: this.knownCredentials,
      onPairingRequest: async payload => {
        if (this.thp?.onPairingRequest) {
          return this.thp.onPairingRequest(payload);
        }

        this.emit('ui-request', {
          type: UI_REQUEST.REQUEST_TREZOR_THP_PAIRING,
          payload: {
            connectId: device.connectId,
            availableMethods: payload.availableMethods,
            selectedMethod: payload.selectedMethod,
            nfcData: payload.nfcData,
          },
        });
        return this.uiRequests.wait(UI_REQUEST.REQUEST_TREZOR_THP_PAIRING);
      },
      onButtonRequest: async payload => {
        await this.thp?.onButtonRequest?.(payload);
        // Trezor ButtonRequest carries a precise `code` enum:
        //   ButtonRequest_PinEntry, ButtonRequest_PassphraseEntry,
        //   ButtonRequest_ConfirmOutput, ButtonRequest_SignTx, etc.
        // Hosts dispatch on that code directly. We do NOT also emit the
        // generic `confirm-on-device` ui-event here — that channel exists
        // for vendors (Ledger) whose protocol can't distinguish these cases.
        // Piping both events through would race the host's atom state and
        // overwrite the precise code-aware action with a generic one.
        this.emit('ui-request', {
          type: UI_REQUEST.REQUEST_BUTTON,
          payload: {
            connectId: device.connectId,
            ...payload,
          },
        });
      },
      onButtonRequestComplete: async payload => {
        await this.thp?.onButtonRequestComplete?.(payload);
        this.emit('ui-event', {
          type: EConnectorInteraction.InteractionComplete,
          payload: {
            sessionId: device.connectId,
          },
        });
      },
      onPinMatrixRequest: async payload => {
        if (this.thp?.onPinMatrixRequest) {
          return this.thp.onPinMatrixRequest(payload);
        }

        const pinPromise = this.uiRequests.wait<string>(UI_REQUEST.REQUEST_PIN);
        this.emit('ui-request', {
          type: UI_REQUEST.REQUEST_PIN,
          payload: {
            connectId: device.connectId,
            type: payload.type,
          },
        });
        return pinPromise;
      },
      onPassphraseRequest: async payload => {
        if (this.thp?.onPassphraseRequest) {
          return this.thp.onPassphraseRequest(payload);
        }

        // Register the waiter BEFORE emitting. A host that answers
        // synchronously (e.g. auto-empty passphrase for the standard wallet)
        // calls uiResponse from inside emit(); if wait() hasn't registered yet
        // the resolve lands on no waiter and is lost, hanging the call forever.
        const passphrasePromise = this.uiRequests.wait<{
          value?: string;
          passphraseOnDevice?: boolean;
        }>(UI_REQUEST.REQUEST_PASSPHRASE);
        // Host replies via uiResponse({ type: RECEIVE_PASSPHRASE, payload:
        // { value, passphraseOnDevice } }). Map to the core's ack shape.
        this.emit('ui-request', {
          type: UI_REQUEST.REQUEST_PASSPHRASE,
          payload: {
            connectId: device.connectId,
            ...payload,
          },
        });
        const res = await passphrasePromise;
        return res?.passphraseOnDevice ? { on_device: true } : { passphrase: res?.value ?? '' };
      },
      onPairingCredentialsChanged: async payload => {
        // Auto-merge into our internal array first so the very next
        // handshake (e.g. host calls another chain method right after
        // pairing) sees the credential — the host doesn't have to
        // round-trip through storage to get autoconnect.
        this.mergeKnownCredentials(payload.credentials);
        await this.thp?.onPairingCredentialsChanged?.(payload);
        this.emit('device-trezor-thp-credentials-changed', {
          connectId: device.connectId,
          deviceId: device.deviceId,
          credentials: payload.credentials,
        });
      },
    };
  }

  private log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>) {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-connector', event, data });
    if (!entry) return;

    try {
      this.thp?.logger?.(entry);
    } catch {
      // Debug logging must not affect connector behavior.
    }
  }

  private emitSupportFeatures(session: TrezorSession): void {
    const features = session.deviceSession.features ?? session.features;
    session.features = features;
    this.emit(DEVICE.FEATURES, {
      device: {
        ...session.device,
        deviceId: readString(features, 'device_id') ?? session.device.deviceId,
        name: readString(features, 'label') ?? session.device.name,
        model:
          readString(features, 'internal_model') ??
          readString(features, 'model') ??
          session.device.model,
        features,
      },
    });
  }
}

function connectorSessionToDevice(session: ConnectorSession): ConnectorDevice {
  return {
    connectId: session.deviceInfo.connectId,
    deviceId: session.deviceInfo.deviceId,
    name: session.deviceInfo.label ?? 'Trezor',
    model: session.deviceInfo.model,
    serialNumber: session.deviceInfo.serialNumber,
    capabilities: session.deviceInfo.capabilities,
    raw: session.deviceInfo.raw,
  };
}

function rejectKnownNonTrezorDevice(features: Record<string, unknown>): void {
  if (!isKnownNonTargetHardwareVendor(features, 'trezor')) return;
  throw createHwkError({
    code: HardwareErrorCode.DeviceMismatch,
    message: 'Selected device is not a supported Trezor device.',
    params: {
      vendor: features.vendor,
      model: features.model,
      internalModel: features.internal_model,
      deviceId: features.device_id,
    },
  });
}

function buildFirmwareVersion(features: Record<string, unknown>): string {
  const major = readNumber(features, 'major_version');
  const minor = readNumber(features, 'minor_version');
  const patch = readNumber(features, 'patch_version');
  if (major === undefined || minor === undefined || patch === undefined) {
    return '';
  }
  return `${major}.${minor}.${patch}`;
}

function hasDeviceCapability(capabilities: unknown, required: RequiredDeviceCapability): boolean {
  if (!Array.isArray(capabilities)) return false;
  return capabilities.some(capability => {
    if (capability === required.name || capability === required.value) return true;
    return String(capability) === required.name || String(capability) === String(required.value);
  });
}

function summarizeCapabilities(capabilities: unknown): Array<string | number> {
  if (!Array.isArray(capabilities)) return [];
  return capabilities
    .filter(
      (capability): capability is string | number =>
        typeof capability === 'string' || typeof capability === 'number'
    )
    .map(capability =>
      capability === DEVICE_CAPABILITY.Tron.value ? DEVICE_CAPABILITY.Tron.name : capability
    );
}

function errorToLog(error: unknown) {
  if (error instanceof Error) {
    const extra: Record<string, unknown> = {};
    const maybeError = error as {
      code?: unknown;
      errorCode?: unknown;
      reason?: unknown;
      attErrorCode?: unknown;
    };
    if (maybeError.code !== undefined) extra.code = maybeError.code;
    if (maybeError.errorCode !== undefined) extra.errorCode = maybeError.errorCode;
    if (maybeError.reason !== undefined) extra.reason = maybeError.reason;
    if (maybeError.attErrorCode !== undefined) extra.attErrorCode = maybeError.attErrorCode;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...extra,
    };
  }
  return String(error);
}
