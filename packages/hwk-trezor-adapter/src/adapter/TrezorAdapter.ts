import {
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  OperationRegistry,
  SDK,
  TypedEventEmitter,
  UI_REQUEST,
  UI_RESPONSE,
  UiRequestRegistry,
  canReplayHardwareMethodAfterTransportFailure,
  createHwkError,
  defaultOriginForCode,
  failure,
  isHardwareOperationId,
  isHwkRecoveryHint,
  operationMayHaveCompletedParams,
  rehydrateConnectorError,
  requestBleDeviceSelection,
  requestSaveDeviceBinding,
  resolveHardwareOperationTarget,
  resolveSearchTargetReusePolicy,
  runAllNetworkGetAddress,
  success,
} from '@onekeyfe/hwk-adapter-core';
import { randomBytes } from '@noble/hashes/utils';

import { authenticateDeviceFromProof } from '../deviceAuthenticity';
import { debugLog } from '../utils/debugLog';
import { trezorQueueKey } from '../utils/queueKey';

import type { AuthenticityProof } from '../deviceAuthenticity';
import type {
  AllNetworkAddressParams,
  AllNetworkAddressResponse,
  AllNetworkGetAddressParams,
  AllNetworkMethodName,
  BindBleDeviceParams,
  BtcAddress,
  BtcGetAddressParams,
  BtcGetPublicKeyParams,
  BtcPublicKey,
  BtcSignMsgParams,
  BtcSignPsbtParams,
  BtcSignTxParams,
  BtcSignature,
  BtcSignedPsbt,
  BtcSignedTx,
  ChainForFingerprint,
  ConnectionTarget,
  ConnectionType,
  ConnectorCallResult,
  ConnectorDevice,
  ConnectorUiEvent,
  DeviceAuthenticityParams,
  DeviceAuthenticityResult,
  DeviceEventListener,
  DeviceInfo,
  DeviceSearchTarget,
  EvmAddress,
  EvmGetAddressParams,
  EvmSignMsgParams,
  EvmSignTxTrezorParams,
  EvmSignTypedDataParams,
  EvmSignature,
  EvmSignedTx,
  HardwareEvent,
  HardwareEventMap,
  IBtcMethods,
  ICommonCallParams,
  IConnector,
  IDeviceManagerMethods,
  IDeviceManagerOperationContext,
  IEvmMethods,
  IHardwareConnectionContext,
  IHardwareWallet,
  ISolMethods,
  ITronMethods,
  Response,
  SearchDevicesOptions,
  SolAddress,
  SolGetAddressParams,
  SolSignMsgParams,
  SolSignTxParams,
  SolSignature,
  SolSignedTx,
  TransportType,
  TrezorBrightnessParams,
  TrezorChangePinParams,
  TrezorDeviceSettingsParams,
  TronAddress,
  TronGetAddressParams,
  TronSignMsgParams,
  TronSignTxParams,
  TronSignature,
  TronSignedTx,
  UiResponseEvent,
} from '@onekeyfe/hwk-adapter-core';

// Valid HardwareErrorCode numbers. Used to reject foreign numeric `code`s (e.g.
// a DOMException's `code: 20` on a WebUSB AbortError) that must NOT be trusted
// as HardwareErrorCodes — otherwise they leak through as Unknown.
const KNOWN_HARDWARE_ERROR_CODES = new Set<number>(
  Object.values(HardwareErrorCode).filter((value): value is number => typeof value === 'number')
);

type NullableCallArg<T> = T | null | undefined;

type TrezorPassphraseCallParams = {
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
};

type TrezorPassphraseRequestContext = {
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
};

type TrezorVerifiedPassphraseSession = {
  sessionId: string;
  protocol: 'thp' | 'v1';
  thpSessionId?: string;
};

type TrezorCallParams<T> = (T & ICommonCallParams & TrezorPassphraseCallParams) | null | undefined;

type TrezorCommonParams = (ICommonCallParams & TrezorPassphraseCallParams) | null | undefined;

type AsyncMethodName<T> = Extract<
  {
    [K in keyof T]-?: NonNullable<T[K]> extends (
      ...args: infer _Args
    ) => Promise<Response<infer _Payload>>
      ? K
      : never;
  }[keyof T],
  string
>;

type TrezorWalletMethods = IEvmMethods & IBtcMethods & ISolMethods & ITronMethods;

type TrezorWalletMethodName = AsyncMethodName<TrezorWalletMethods>;

type TrezorDeviceManagerMethodName = AsyncMethodName<IDeviceManagerMethods>;

type TrezorMethodName = TrezorWalletMethodName | TrezorDeviceManagerMethodName;

type TrezorBundleContext = {
  connection?: { connectId: string; sessionId: string };
};

const TREZOR_BTC_NETWORK_COIN_MAP: Partial<Record<string, string>> = {
  btc: 'Bitcoin',
  bitcoin: 'Bitcoin',
  tbtc: 'Testnet',
  testnet: 'Testnet',
  sbtc: 'Signet',
  signet: 'Signet',
  ltc: 'Litecoin',
  litecoin: 'Litecoin',
  doge: 'Dogecoin',
  dogecoin: 'Dogecoin',
  bch: 'Bcash',
  bcash: 'Bcash',
  dash: 'Dash',
};

export interface TrezorKnownDeviceConnection {
  deviceId: string;
  usbConnectId?: string;
  bleConnectId?: string;
}

export interface TrezorAdapterOptions {
  /** Persisted endpoints are routing hints, never proof of device identity. */
  knownDeviceConnections?: readonly TrezorKnownDeviceConnection[];
}

export class TrezorAdapter implements IHardwareWallet {
  readonly vendor = 'trezor' as const;

  private readonly _connector: IConnector;

  private readonly _emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _operations = new OperationRegistry({
    vendor: 'trezor',
    onEnded: (operation, reason) => {
      this._emitter.emit(SDK.OPERATION_ENDED, {
        type: SDK.OPERATION_ENDED,
        payload: { operationId: operation.operationId, reason },
      });
      if (reason === 'timeout') {
        void this._releaseOperationConnection(operation).catch(() => undefined);
      }
    },
  });

  private readonly _devices = new Map<string, DeviceInfo>();

  private readonly _sessions = new Map<string, string>();

  private readonly _connectingPromises = new Map<string, Promise<string>>();

  // connectIds disconnected mid-connect; the session they produce is torn down, not cached.
  private readonly _disconnectRequested = new Set<string>();

  private readonly _uiRegistry = new UiRequestRegistry();

  private readonly _passphraseRequestContextByConnectId = new Map<
    string,
    TrezorPassphraseRequestContext
  >();

  private readonly _verifiedPassphraseSessionsByConnectId = new Map<
    string,
    Map<string, TrezorVerifiedPassphraseSession>
  >();

  /** Raw connector calls that outlive an aborted caller, keyed by session. */
  private readonly _unsettledConnectorOperations = new Map<string, number>();

  private readonly _connectorIdleWaiters = new Set<() => void>();

  private _resetPromise: Promise<void> | null = null;

  private _connectorTeardownTail: Promise<void> = Promise.resolve();

  private _pendingConnectorTeardowns = 0;

  private _stateGeneration = 0;

  // Per-device queue with preemption + AbortSignal. Same-device chain calls
  // serialize (Trezor's protocol is single-request-response — interleaving
  // desyncs THP nonce). 'safe' read methods auto-cancel each other; 'confirm'
  // sign methods emit REQUEST_PREEMPTION so the consumer can decide.
  private readonly _jobQueue: DeviceJobQueue;

  private readonly _knownDeviceConnections = new Map<string, TrezorKnownDeviceConnection>();

  constructor(connector: IConnector, options?: TrezorAdapterOptions) {
    this._connector = connector;
    for (const connection of options?.knownDeviceConnections ?? []) {
      if (connection.deviceId) {
        this._knownDeviceConnections.set(connection.deviceId, { ...connection });
      }
    }
    // Upstream DeviceJobQueue is now a global FIFO with no built-in
    // preemption — interruptibility lives at the application layer.
    this._jobQueue = new DeviceJobQueue();
    this._registerConnectorEvents();
  }

  private static _createDeviceBusyError(method: string): Error {
    // Our own queued request blocks this one → DeviceBusyInternal, not "another app".
    return Object.assign(new Error(`Trezor is busy with another request (${method})`), {
      code: HardwareErrorCode.DeviceBusyInternal,
    });
  }

  /**
   * Split a Trezor-only `passphraseState` routing hint off the chain params so
   * it never reaches the protobuf layer. The connector/firmware only sees the
   * real op fields; the adapter uses `passphraseState` to align the session.
   */
  private static _normalizeCallArgs(
    connectId: NullableCallArg<string>,
    deviceId: NullableCallArg<string>,
    params: NullableCallArg<unknown>
  ): {
    connectId: string;
    params: unknown;
  } {
    return {
      connectId: connectId || deviceId || '',
      params: params ?? {},
    };
  }

  private static _splitCommonParams(params: unknown): {
    passphraseState?: string;
    useEmptyPassphrase?: boolean;
    operationId?: string;
    connectionContext?: IHardwareConnectionContext;
    rest: unknown;
  } {
    if (params && typeof params === 'object') {
      const {
        passphraseState,
        autoInstallApp: _autoInstallApp,
        operationId,
        useEmptyPassphrase,
        knownConnections,
        extra,
        allowDeviceSelection,
        ...rest
      } = params as Record<string, unknown>;
      return {
        passphraseState: typeof passphraseState === 'string' ? passphraseState : undefined,
        useEmptyPassphrase:
          typeof useEmptyPassphrase === 'boolean' ? useEmptyPassphrase : undefined,
        operationId: typeof operationId === 'string' ? operationId : undefined,
        connectionContext: {
          knownConnections: knownConnections as IHardwareConnectionContext['knownConnections'],
          extra: extra as IHardwareConnectionContext['extra'],
          allowDeviceSelection:
            typeof allowDeviceSelection === 'boolean' ? allowDeviceSelection : undefined,
        },
        rest,
      };
    }
    return { rest: params ?? {} };
  }

  private static _withAllNetworkRequestCommonParams(
    item: AllNetworkAddressParams,
    commonParams: TrezorCommonParams
  ): AllNetworkAddressParams {
    const autoInstallApp = commonParams?.autoInstallApp;
    const passphraseState = commonParams?.passphraseState;
    const useEmptyPassphrase = commonParams?.useEmptyPassphrase;
    const operationId = commonParams?.operationId;
    const knownConnections = commonParams?.knownConnections;
    const extra = commonParams?.extra;
    const allowDeviceSelection = commonParams?.allowDeviceSelection;
    if (
      autoInstallApp === undefined &&
      passphraseState === undefined &&
      useEmptyPassphrase === undefined &&
      operationId === undefined &&
      knownConnections === undefined &&
      extra === undefined &&
      allowDeviceSelection === undefined
    ) {
      return item;
    }
    return {
      ...item,
      ...(autoInstallApp !== undefined ? { autoInstallApp } : {}),
      ...(passphraseState !== undefined ? { passphraseState } : {}),
      ...(useEmptyPassphrase !== undefined ? { useEmptyPassphrase } : {}),
      ...(operationId !== undefined ? { operationId } : {}),
      ...(knownConnections !== undefined ? { knownConnections } : {}),
      ...(extra !== undefined ? { extra } : {}),
      ...(allowDeviceSelection !== undefined ? { allowDeviceSelection } : {}),
    };
  }

  // Keys are matched after normalizeLogKey, so snake_case/camelCase both hit.
  private static readonly _sensitiveLogKeys = new Set([
    'extra',
    'knownconnections',
    'credential',
    'credentials',
    'entropy',
    'hoststatickey',
    'mnemonic',
    'mnemonics',
    'passphrase',
    'passphrasestate',
    'password',
    'pin',
    'privatekey',
    'seed',
    'session',
    'sessionid',
    'trezorstaticpublickey',
    'word',
    'words',
    'xprv',
  ]);

  private static _normalizeLogKey(key: string): string {
    return key.replace(/[_-]/g, '').toLowerCase();
  }

  // Mirrors hd-core's logBlockEvent: a signing method's body is the user's
  // transaction, so it is dropped wholesale; other methods redact by key.
  private static _sanitizeForLog(value: unknown, methodName?: string): unknown {
    if (methodName && /sign/i.test(methodName)) return '[redacted]';
    return TrezorAdapter._redactForLog(value, new WeakSet());
  }

  private static _redactForLog(value: unknown, seen: WeakSet<object>): unknown {
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      return `[BINARY:${value.byteLength}]`;
    }
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    const out = Array.isArray(value)
      ? value.map(item => TrezorAdapter._redactForLog(item, seen))
      : Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            TrezorAdapter._sensitiveLogKeys.has(TrezorAdapter._normalizeLogKey(key)) &&
            item !== null &&
            item !== undefined
              ? '[redacted]'
              : TrezorAdapter._redactForLog(item, seen),
          ])
        );
    seen.delete(value);
    return out;
  }

  private static _errorForLog(error: unknown): unknown {
    if (!error || typeof error !== 'object') return error;
    const typed = error as {
      code?: unknown;
      errorCode?: unknown;
      message?: unknown;
      name?: unknown;
      response?: unknown;
      statusCode?: unknown;
    };
    return TrezorAdapter._sanitizeForLog({
      name: typed.name,
      message: typed.message,
      code: typed.code,
      errorCode: typed.errorCode,
      statusCode: typed.statusCode,
      response: typed.response,
    });
  }

  private _setPassphraseRequestContext(
    connectId: string,
    context: TrezorPassphraseRequestContext
  ): () => void {
    const previous = this._passphraseRequestContextByConnectId.get(connectId);
    if (context.passphraseState !== undefined || context.useEmptyPassphrase !== undefined) {
      this._passphraseRequestContextByConnectId.set(connectId, context);
    } else {
      this._passphraseRequestContextByConnectId.delete(connectId);
    }
    return () => {
      if (previous) {
        this._passphraseRequestContextByConnectId.set(connectId, previous);
      } else {
        this._passphraseRequestContextByConnectId.delete(connectId);
      }
    };
  }

  private static _trezorFailureMessage(error: unknown): {
    code?: unknown;
    message?: unknown;
  } {
    const response = (error as { response?: unknown } | null | undefined)?.response;
    const message = (response as { message?: unknown } | null | undefined)?.message;
    if (!message || typeof message !== 'object') return {};
    const failureMessage = message as { code?: unknown; message?: unknown };
    return {
      code: failureMessage.code,
      message: failureMessage.message,
    };
  }

  private static _mapTrezorFailureCode(error: unknown): HardwareErrorCode | undefined {
    const directCode = (error as { code?: unknown } | null | undefined)?.code;
    if (directCode === 'Device_InitializeFailed') {
      return HardwareErrorCode.PinCancelled;
    }
    if (directCode === 'Failure_ActionCancelled') {
      return HardwareErrorCode.UserRejected;
    }
    if (directCode === 'ThpPairingRequired') {
      return HardwareErrorCode.ThpPairingRequired;
    }
    if (directCode === 'Failure_UnexpectedMessage') {
      return HardwareErrorCode.MethodNotSupported;
    }
    const message = (error as { message?: unknown } | null | undefined)?.message;
    if (
      typeof message === 'string' &&
      message.includes("Failed to execute 'transfer") &&
      message.includes("on 'USBDevice'")
    ) {
      return HardwareErrorCode.TransportError;
    }
    const failure = TrezorAdapter._trezorFailureMessage(error);
    if (failure.code === 'Failure_PinCancelled') {
      return HardwareErrorCode.PinCancelled;
    }
    if (failure.code === 'Failure_PinInvalid') {
      return HardwareErrorCode.PinInvalid;
    }
    if (failure.code === 'Failure_PinMismatch') {
      return HardwareErrorCode.PinMismatch;
    }
    if (failure.code === 'Failure_ActionCancelled') {
      return HardwareErrorCode.UserRejected;
    }
    if (failure.code === 'Failure_ProcessError' && failure.message === 'Unsupported script type') {
      return HardwareErrorCode.MethodNotSupported;
    }
    // Device rejected the derivation path (e.g. an index outside its allowed
    // range) — distinct path-specific surface, not a generic "method" error.
    if (failure.code === 'Failure_DataError' && failure.message === 'Forbidden key path') {
      return HardwareErrorCode.DevicePathForbidden;
    }
    // Match the stable setting name instead of the full firmware message.
    if (
      failure.code === 'Failure_DataError' &&
      typeof failure.message === 'string' &&
      failure.message.includes('PASSPHRASE_ALWAYS_ON_DEVICE')
    ) {
      return HardwareErrorCode.PassphraseAlwaysOnDevice;
    }
    // Firmware can't process this request (e.g. EIP-712 typed data the device
    // firmware doesn't support) → surface as "method not supported".
    if (failure.code === 'Failure_FirmwareError') {
      return HardwareErrorCode.MethodNotSupported;
    }
    // Device firmware doesn't recognize the message (e.g. an older device asked
    // for a coin/app it lacks) → "method not supported", not a generic unknown.
    if (failure.code === 'Failure_UnexpectedMessage') {
      return HardwareErrorCode.MethodNotSupported;
    }
    if (failure.code === 'Failure_NotInitialized') {
      return HardwareErrorCode.DeviceNotInitialized;
    }
    // Device busy with its own op, not another app → DeviceBusyInternal.
    if (failure.code === 'Failure_Busy' || failure.code === 'Failure_InProgress') {
      return HardwareErrorCode.DeviceBusyInternal;
    }
    return undefined;
  }

  /**
   * Whether a device-side error code means the THP application session we
   * selected is gone (the device evicted it from its limited slot pool). The
   * caller drops the stale cache entry and recreates from scratch.
   *
   * Match only the protocol's explicit unallocated-channel code. Guessing from
   * an error message could replay a request after an unrelated business error.
   */
  private static _isStaleSessionError(code: unknown): boolean {
    return code === 'ThpUnallocatedChannel';
  }

  private static _errorCode(error: unknown): unknown {
    return (error as { code?: unknown }).code ?? TrezorAdapter._trezorFailureMessage(error).code;
  }

  private static _isConnectionUnavailableError(error: unknown): boolean {
    const { code } = error as { code?: unknown };
    return (
      code === HardwareErrorCode.DeviceNotFound || code === HardwareErrorCode.DeviceDisconnected
    );
  }

  private static _isRecoverableProtocolResidueError(error: unknown): boolean {
    const protocolError = error as {
      name?: unknown;
      code?: unknown;
      message?: unknown;
    };
    return (
      protocolError.name === 'TrezorProtocolError' &&
      protocolError.code === 'Malformed protocol format' &&
      protocolError.message === 'Malformed protocol format'
    );
  }

  /**
   * Race a promise against an abort signal. IConnector.call() can't actually
   * be cancelled at the protocol level, so the caller gets the abort while the
   * adapter keeps the transport exclusively reserved until the raw call drains.
   */
  private static _abortable<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
    if (signal.aborted) {
      // The operation may already have started before its signal was checked.
      void promise.catch(() => undefined);
      return Promise.reject(
        (signal as AbortSignal & { reason?: unknown }).reason ?? new Error('Aborted')
      );
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        reject((signal as AbortSignal & { reason?: unknown }).reason ?? new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(
        value => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        err => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  private async _connectSession(
    connectId: string,
    signal: AbortSignal | undefined,
    stateGeneration: number,
    transportType?: ConnectionType
  ): Promise<string> {
    const connectOnce = async () => {
      if (signal?.aborted) {
        throw (signal as AbortSignal & { reason?: unknown }).reason ?? new Error('Aborted');
      }
      this._assertConnectorIdle('connectDevice');
      const releaseOperation = this._retainConnectorOperation(`connect:${connectId}`);
      let connectPromise: ReturnType<IConnector['connect']>;
      try {
        connectPromise = transportType
          ? this._connector.connect(connectId, { transportType })
          : this._connector.connect(connectId);
      } catch (error) {
        releaseOperation();
        throw error;
      }
      if (!signal) {
        try {
          return await connectPromise;
        } finally {
          releaseOperation();
        }
      }
      try {
        const session = await TrezorAdapter._abortable(signal, connectPromise);
        releaseOperation();
        return session;
      } catch (error) {
        if (signal.aborted) {
          // The underlying connect cannot be cancelled. Keep the connector
          // reserved until its late session has been disconnected.
          void connectPromise
            .then(orphan => this._connector.disconnect(orphan.sessionId).catch(() => undefined))
            .catch(() => undefined)
            .finally(releaseOperation);
        } else {
          releaseOperation();
        }
        throw error;
      }
    };
    let session;
    try {
      session = await connectOnce();
    } catch (error) {
      if (signal?.aborted || !TrezorAdapter._isRecoverableProtocolResidueError(error)) {
        throw error;
      }
      // An interrupted THP handshake may leave exactly one v2 frame queued on
      // the shared USB pipe. The connector intentionally drains it as a loud
      // v1 malformed-frame failure; retry once now that the residue is gone.
      debugLog('[TrezorAdapter] retrying connect after draining a stale THP frame', {
        connectId,
      });
      session = await connectOnce();
    }
    // releaseOperation()/resetState() ran mid-connect: tear down the now-
    // unwanted session instead of caching it (else it leaks a limited THP slot
    // or lets stale state reappear after reset).
    if (stateGeneration !== this._stateGeneration || this._disconnectRequested.delete(connectId)) {
      const releaseCleanup = this._retainConnectorOperation(`disconnect:${session.sessionId}`);
      try {
        await this._connector.disconnect(session.sessionId).catch(() => undefined);
      } finally {
        releaseCleanup();
      }
      throw Object.assign(new Error('Trezor connection aborted'), {
        code: HardwareErrorCode.UserAborted,
      });
    }
    this._sessions.set(connectId, session.sessionId);
    this._verifiedPassphraseSessionsByConnectId.delete(connectId);
    this._devices.set(connectId, session.deviceInfo);
    return session.sessionId;
  }

  get activeTransport(): TransportType | null {
    return this._connector.connectionType;
  }

  async init(_config?: unknown): Promise<void> {}

  async dispose(): Promise<void> {
    await this._resetStateAndDisconnectSessions();
    this._unregisterConnectorEvents();
    this._connector.reset();
    this._emitter.removeAllListeners();
  }

  /**
   * Clear cached state without tearing down the adapter or unregistering
   * listeners. Mirrors LedgerAdapter.resetState() — useful for retry-after-
   * error flows. Aborts active jobs and releases UI waits.
   */
  resetState(): void {
    void this._resetStateAndDisconnectSessions();
  }

  private _resetStateAndDisconnectSessions(): Promise<void> {
    if (this._resetPromise) return this._resetPromise;

    const sessionIds = new Set(this._sessions.values());
    this._stateGeneration += 1;
    this._operations.endAll('runtime-reset');
    this._uiRegistry.reset();
    this._jobQueue.clear();
    this._devices.clear();
    this._sessions.clear();
    this._verifiedPassphraseSessionsByConnectId.clear();
    this._connectingPromises.clear();

    const resetPromise = this._runConnectorTeardown(async () => {
      for (const sessionId of sessionIds) {
        await this._connector.disconnect(sessionId).catch(() => undefined);
      }
    });
    this._resetPromise = resetPromise;
    return resetPromise.finally(() => {
      if (this._resetPromise === resetPromise) {
        this._resetPromise = null;
      }
    });
  }

  getAvailableTransports(): TransportType[] {
    return this.activeTransport ? [this.activeTransport] : [];
  }

  async switchTransport(_type: TransportType): Promise<void> {}

  async searchDevices(options?: SearchDevicesOptions): Promise<DeviceInfo[]> {
    return this._searchDevices(options);
  }

  private async _searchDevices(
    options?: SearchDevicesOptions,
    signal?: AbortSignal
  ): Promise<DeviceInfo[]> {
    if (
      options?.transportType &&
      !(this._connector.availableTransports ?? [this._connector.connectionType]).includes(
        options.transportType
      )
    )
      return [];
    if (options?.resetSession) {
      await this._resetStateAndDisconnectSessions();
    } else {
      await this._connectorTeardownTail;
    }
    if (signal?.aborted) throw signal.reason;
    const stateGeneration = this._stateGeneration;
    const scanned = await this._connector.searchDevices(
      options?.waitForAllTransports || options?.transportType
        ? {
            ...(options.waitForAllTransports ? { waitForAll: true } : {}),
            ...(options.transportType ? { transportType: options.transportType } : {}),
          }
        : undefined
    );
    if (signal?.aborted) throw signal.reason;
    if (stateGeneration !== this._stateGeneration) {
      throw createHwkError({
        code: HardwareErrorCode.UserAborted,
        message: 'Trezor discovery belongs to an ended operation',
      });
    }
    const scannedIds = new Set(scanned.map(d => d.connectId));
    // A rescan that misses a currently-connected device shouldn't evict it —
    // otherwise getDeviceInfo would return DeviceNotFound for an active session.
    for (const connectId of [...this._devices.keys()]) {
      if (
        (!options?.transportType ||
          this._devices.get(connectId)?.connectionType === options.transportType) &&
        !scannedIds.has(connectId) &&
        !this._sessions.has(connectId)
      ) {
        this._devices.delete(connectId);
      }
    }
    for (const device of scanned) {
      const info = this._connectorDeviceToDeviceInfo(device);
      // Discovery descriptors do not carry the firmware-verified identity.
      if (!this._sessions.has(info.connectId)) this._devices.set(info.connectId, info);
    }
    return Array.from(this._devices.values()).filter(
      device => !options?.transportType || device.connectionType === options.transportType
    );
  }

  async searchDeviceTargets(options?: SearchDevicesOptions): Promise<DeviceSearchTarget[]> {
    const devices = await this.searchDevices(options);
    return devices.map(device => ({
      searchTargetId: device.connectId,
      searchTargetReusePolicy: resolveSearchTargetReusePolicy(device),
      vendor: 'trezor',
      connectionType: device.connectionType,
      kind: 'physical',
      label: device.label,
      model: device.model,
      modelName: device.modelName,
      serialNumber: device.serialNumber,
    }));
  }

  async listConnectionTargets(options?: SearchDevicesOptions): Promise<ConnectionTarget[]> {
    const targets = await this.searchDeviceTargets(options);
    return targets.map(({ searchTargetId, ...target }) => ({
      ...target,
      targetId: searchTargetId,
    }));
  }

  async bindBleDevice(params: BindBleDeviceParams): Promise<Response<string>> {
    if (params.identity.vendor !== 'trezor' || !params.identity.value) {
      return failure(HardwareErrorCode.InvalidParams, 'Trezor device identity is required');
    }
    const { value: deviceId } = params.identity;
    try {
      return await this._jobQueue.enqueue(
        deviceId,
        async signal => {
          const selected = await this._selectBleDeviceForBinding(
            deviceId,
            signal,
            { extra: params.extra },
            'manual-rebind'
          );
          try {
            const persisted = await this._emitVerifiedBinding(
              deviceId,
              selected.connectId,
              selected.selectionRequestId,
              { extra: params.extra },
              signal
            );
            if (!persisted) {
              // A business call can shrug off an unsaved binding, but here
              // saving the binding IS the operation.
              throw createHwkError({
                code: HardwareErrorCode.UnknownError,
                message: 'Bluetooth binding could not be saved',
                origin: 'host',
              });
            }
            this._rememberVerifiedConnection(deviceId, selected.connectId);
            return success(selected.connectId);
          } catch (error) {
            await this._releaseProvisionalConnection(selected.connectId, signal);
            throw error;
          }
        },
        {
          label: 'bindBleDevice',
          rejectIfBusy: true,
          busyError: TrezorAdapter._createDeviceBusyError('bindBleDevice'),
        }
      );
    } catch (error) {
      return this._errorToFailure(error);
    }
  }

  async connectDevice(searchTargetId: string): Promise<Response<string>> {
    try {
      await this._ensureDevicePermission(
        searchTargetId,
        undefined,
        this._devices.get(searchTargetId)?.connectionType
      );
      await this._ensureSession(searchTargetId);
      const device = this._devices.get(searchTargetId);
      if (!device) {
        return failure(HardwareErrorCode.DeviceNotFound, 'Trezor device not found after connect');
      }
      this._operations.endByConnectionKey(searchTargetId, 'explicit');
      const operation = this._operations.create({
        searchTargetId,
        connectId: searchTargetId,
        device,
        connectionKeys: [this._sessions.get(searchTargetId) ?? ''],
      });
      return success(operation.operationId);
    } catch (error) {
      return this._errorToFailure(error);
    }
  }

  async releaseOperation(operationId: string): Promise<void> {
    const operation = this._operations.find(operationId);
    if (!operation) {
      this._operations.resolve(operationId);
      return;
    }
    const endedOperation = this._operations.end(operationId, 'explicit');
    if (!endedOperation) return;
    await this._releaseOperationConnection(endedOperation);
  }

  private async _releaseOperationConnection(
    operation: NonNullable<ReturnType<OperationRegistry['find']>>
  ): Promise<void> {
    const { connectId } = operation;
    const connecting = this._connectingPromises.has(connectId);
    this._connectingPromises.delete(connectId);
    const sessionId = this._sessions.get(connectId);
    if (!sessionId) {
      // Connect may be in flight (session not recorded yet) — mark it so
      // _connectSession tears down the session it produces instead of caching it.
      if (connecting) this._disconnectRequested.add(connectId);
      return;
    }
    this._sessions.delete(connectId);
    this._verifiedPassphraseSessionsByConnectId.delete(connectId);
    await this._runConnectorTeardown(() => this._connector.disconnect(sessionId));
  }

  async getDeviceInfo(
    connectIdOrOperationId: string,
    deviceId: string
  ): Promise<Response<DeviceInfo>> {
    let connectId: string;
    try {
      connectId = isHardwareOperationId(connectIdOrOperationId)
        ? this._operations.resolve(connectIdOrOperationId).connectId
        : connectIdOrOperationId;
    } catch (error) {
      return this._errorToFailure(error);
    }
    const device =
      this._devices.get(connectId) ??
      Array.from(this._devices.values()).find(item => item.deviceId === deviceId);
    if (!device) return failure(HardwareErrorCode.DeviceNotFound, 'Trezor device not found');
    return success(device);
  }

  async allNetworkGetAddress(
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>> {
    const target = resolveHardwareOperationTarget(connectId, params.operationId, 'trezor');
    if (!target.success) return target;

    let effectiveTargetId = target.payload.targetId ?? '';
    let releaseOperationRetention: (() => void) | undefined;
    try {
      releaseOperationRetention = target.payload.operationId
        ? this._operations.retain(target.payload.operationId)
        : undefined;
    } catch (error) {
      return this._errorToFailure(error);
    }

    // Each item enqueues its own job, so a cancel landing between two items has
    // no job to abort. The scope survives that gap; same key `_callMethod`
    // enqueues under, so `cancel()` reaches it with the key it already computes.
    const cancelScope = this._jobQueue.createCancelScope(
      trezorQueueKey({ operationId: target.payload.operationId, connectId: effectiveTargetId })
    );

    let liveDeviceId = '';
    const bundleContext: TrezorBundleContext = {};
    const topLevelFailureIndexes = new Set<number>();
    const isSingleNetworkBundle = params.bundle.every(
      item => item.network === params.bundle[0]?.network
    );
    const getLiveDeviceId = async (expectedDeviceId?: string): Promise<Response<string>> => {
      if (liveDeviceId) return success(liveDeviceId);
      const deviceIdResponse = await this._getTrezorDeviceId(
        effectiveTargetId,
        expectedDeviceId || deviceId,
        params,
        bundleContext
      );
      if (deviceIdResponse.success) {
        liveDeviceId = deviceIdResponse.payload;
        if (!target.payload.operationId) {
          effectiveTargetId = bundleContext.connection?.connectId ?? effectiveTargetId;
        }
      }
      return deviceIdResponse;
    };

    try {
      return await runAllNetworkGetAddress({
        connectId: effectiveTargetId,
        deviceId,
        params,
        normalizeItem: TrezorAdapter._normalizeAllNetworkItem,
        callItem: async ({ method, item, index }) => {
          if (cancelScope.signal.aborted) {
            topLevelFailureIndexes.add(index);
            return TrezorAdapter._buildCancelledFailure(cancelScope.signal);
          }
          const expectedDeviceId = TrezorAdapter._getItemDeviceId(item) ?? deviceId;
          if (expectedDeviceId) {
            const fingerprint = await getLiveDeviceId(expectedDeviceId);
            if (!fingerprint.success) {
              topLevelFailureIndexes.add(index);
              return fingerprint;
            }
            if (expectedDeviceId !== fingerprint.payload) {
              topLevelFailureIndexes.add(index);
              return failure(
                HardwareErrorCode.DeviceMismatch,
                `Wrong device: expected ${expectedDeviceId}, got ${fingerprint.payload}`,
                { expected: expectedDeviceId, actual: fingerprint.payload }
              );
            }
          }
          const callItem = TrezorAdapter._withAllNetworkRequestCommonParams(item, params);
          return this._callAllNetworkMethod(effectiveTargetId, method, callItem, bundleContext);
        },
        attachIdentity: async ({ item, chain, payload, index }) => {
          if (!liveDeviceId) {
            // Bootstrapping is another device round trip, so it needs the same
            // gap check.
            if (cancelScope.signal.aborted) {
              topLevelFailureIndexes.add(index);
              const cancelled = TrezorAdapter._buildCancelledFailure<never>(cancelScope.signal);
              return { ...item, success: false, payload: cancelled.payload };
            }
            const fingerprint = await getLiveDeviceId(deviceId);
            if (!fingerprint.success) {
              return { ...item, success: false, payload: fingerprint.payload };
            }
          }
          return {
            ...item,
            success: true,
            payload: {
              ...payload,
              deviceIdentity: {
                vendor: 'trezor',
                type: 'deviceId',
                value: liveDeviceId,
              },
              chainFingerprint: liveDeviceId,
              chainFingerprintChain: chain,
            },
          };
        },
        // One named boolean per abort reason.
        shouldAbortBundle: (response, { index }) => {
          const isSessionLevelFailure = topLevelFailureIndexes.has(index);
          // Mixed bundles must not abort — other chains can still derive.
          const isWholeChainForbidden =
            isSingleNetworkBundle &&
            response.payload?.code === HardwareErrorCode.DevicePathForbidden;
          const isPassphrasePolicyFailure =
            response.payload?.code === HardwareErrorCode.PassphraseAlwaysOnDevice;
          // User said "no" — SDK-dialog cancel and on-device reject both end
          // the batch instead of prompting for the next chain.
          const isUserRefusal =
            response.payload?.code === HardwareErrorCode.UserAborted ||
            response.payload?.code === HardwareErrorCode.UserRejected;
          const isConnectionLost =
            response.payload?.code === HardwareErrorCode.DeviceDisconnected ||
            response.payload?.code === HardwareErrorCode.OperationTimeout ||
            response.payload?.code === HardwareErrorCode.TransportError ||
            response.payload?.code === HardwareErrorCode.OperationEnded ||
            response.payload?.code === HardwareErrorCode.OperationNotFound;
          return (
            isSessionLevelFailure ||
            isWholeChainForbidden ||
            isPassphrasePolicyFailure ||
            isUserRefusal ||
            isConnectionLost
          );
        },
      });
    } finally {
      cancelScope.release();
      releaseOperationRetention?.();
    }
  }

  getFeatures(
    connectId: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>> {
    return this._callDeviceManagerMethod<Record<string, unknown>>(
      'getFeatures',
      connectId,
      {},
      operationContext
    );
  }

  /**
   * Device authenticity attestation. Sends a host-generated challenge, has the
   * device sign it with its secure-element key, then verifies the returned
   * certificate chain up to a trusted Trezor root CA. On success returns a
   * `deviceId` that uniquely identifies the physical device, survives wipe, and
   * cannot be forged from a seed. Only trust the result when `verified` is true
   * (and `usedDebugKey` is false in production).
   *
   * Requires a secure-element model (Safe 3 = T2B1/T3B1, Safe 5 = T3T1, T3W1)
   * and an on-device confirmation. Older models (T1B1, T2T1) will fail.
   *
   * `dangerouslyAllowDebugKeys` accepts simulator / development root keys — NEVER
   * enable it in a production accounting flow, it lets an emulator mint any id.
   */
  async verifyDeviceAuthenticity(
    connectId: string,
    params: DeviceAuthenticityParams = {}
  ): Promise<Response<DeviceAuthenticityResult>> {
    if (params.challenge && params.dangerouslyAllowDebugKeys) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Debug attestation roots cannot be used with a server challenge'
      );
    }
    if (params.challenge && !/^[0-9a-fA-F]{64}$/.test(params.challenge)) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Device authenticity challenge must be exactly 32 bytes encoded as hex'
      );
    }

    const featuresRes = await this.getFeatures(connectId);
    if (!featuresRes.success) return featuresRes;

    const internalModel = (featuresRes.payload as { internal_model?: string }).internal_model;
    if (!internalModel) {
      return failure(HardwareErrorCode.UnknownError, 'Device internal_model unavailable');
    }

    const challengeHex =
      params.challenge?.toLowerCase() ?? Buffer.from(randomBytes(32)).toString('hex');
    const challenge = Buffer.from(challengeHex, 'hex');
    const proofRes = await this._callDeviceManagerMethod<Record<string, unknown>>(
      'authenticateDevice',
      connectId,
      { challenge: challengeHex }
    );
    if (!proofRes.success) return proofRes;

    const proof = proofRes.payload as unknown as AuthenticityProof;
    const verification = authenticateDeviceFromProof({
      proof,
      challenge,
      deviceModel: internalModel,
      allowDebugKeys: params.dangerouslyAllowDebugKeys,
    });

    return success({
      ...verification,
      vendor: 'trezor' as const,
      trezorProof: {
        challenge: challengeHex,
        deviceModel: internalModel,
        proof,
      },
    });
  }

  deviceSettings(
    connectId: string,
    params: TrezorDeviceSettingsParams,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>> {
    return this._callDeviceManagerMethod<Record<string, unknown>>(
      'deviceSettings',
      connectId,
      params,
      operationContext
    );
  }

  setBrightness(
    connectId: string,
    params: TrezorBrightnessParams = {},
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>> {
    return this._callDeviceManagerMethod<Record<string, unknown>>(
      'setBrightness',
      connectId,
      params,
      operationContext
    );
  }

  changePin(
    connectId: string,
    params: TrezorChangePinParams = {},
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>> {
    return this._callDeviceManagerMethod<Record<string, unknown>>(
      'changePin',
      connectId,
      params,
      operationContext
    );
  }

  wipeDevice(
    connectId: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>> {
    return this._callDeviceManagerMethod<Record<string, unknown>>(
      'wipeDevice',
      connectId,
      {},
      operationContext
    );
  }

  private async _getTrezorDeviceId(
    connectId: string,
    expectedDeviceId?: string,
    commonParams?: TrezorCommonParams,
    bundleContext?: TrezorBundleContext
  ): Promise<Response<string>> {
    const hasConnectionContext =
      commonParams?.knownConnections !== undefined || commonParams?.extra !== undefined;
    const features =
      bundleContext || hasConnectionContext
        ? await this._callMethod<Record<string, unknown>>(
            'getFeatures',
            connectId,
            hasConnectionContext || !connectId ? expectedDeviceId : undefined,
            hasConnectionContext
              ? {
                  operationId: commonParams.operationId,
                  knownConnections: commonParams.knownConnections,
                  extra: commonParams.extra,
                  allowDeviceSelection: commonParams.allowDeviceSelection,
                  passphraseState: commonParams.passphraseState,
                  useEmptyPassphrase: commonParams.useEmptyPassphrase,
                }
              : {},
            false,
            bundleContext
          )
        : await this.getFeatures(
            connectId,
            !connectId && expectedDeviceId
              ? {
                  expectedDeviceIdentity: {
                    vendor: 'trezor',
                    type: 'deviceId',
                    value: expectedDeviceId,
                  },
                }
              : undefined
          );
    if (!features.success) return features;
    const liveDeviceId = features.payload.device_id;
    if (typeof liveDeviceId !== 'string' || liveDeviceId.length === 0) {
      return failure(HardwareErrorCode.UnknownError, 'Trezor features did not include a device_id');
    }
    return success(liveDeviceId);
  }

  cancel(connectId?: string): void {
    // "Cancel this one" and "cancel whatever is running" are different
    // instructions. An operation id that has already ended names nothing, so
    // this call must leave no trace at all rather than decay into the
    // untargeted form and take down an unrelated job or someone else's pending
    // UI request. Decided before anything else.
    if (isHardwareOperationId(connectId)) {
      try {
        this._operations.resolve(connectId);
      } catch {
        // Ended (tombstoned) and never-existed both land here.
        return;
      }
    }
    const userAbortReason = Object.assign(new Error('User aborted operation'), {
      code: HardwareErrorCode.UserAborted,
    });
    // Release adapter-level UI waits (preemption) and connector-level ones
    // (THP pairing / PIN matrix) — a single CANCEL clears whichever is open.
    this._uiRegistry.cancel();
    this._connector.uiResponse({ type: UI_RESPONSE.CANCEL });
    const activeJobId = this._jobQueue.getActiveJob()?.deviceId;
    const targetId = connectId ?? activeJobId;
    if (targetId) {
      let resolvedConnectId = targetId;
      let operationId: string | undefined;
      if (isHardwareOperationId(targetId)) {
        try {
          operationId = targetId;
          resolvedConnectId = this._operations.resolve(targetId).connectId;
        } catch {
          resolvedConnectId = '';
        }
      }
      const interactionForPhysicalId =
        !operationId && connectId
          ? this._operations.findActiveByConnectionKey(connectId)
          : undefined;
      // A bundle called without an operationId queues its items — and opens its
      // cancel scope — under the raw connectId, while the operation that owns
      // that connection is a second live key. Both get cancelled. Pending jobs
      // and scopes go with the active one: between two bundle items nothing is
      // active, and only the scope carries the cancel across that gap.
      const pendingOperationId = operationId ?? interactionForPhysicalId?.operationId;
      const queueKeys = new Set<string>([trezorQueueKey({ connectId: targetId })]);
      if (pendingOperationId) queueKeys.add(trezorQueueKey({ operationId: pendingOperationId }));
      for (const key of queueKeys) {
        this._jobQueue.cancelActiveAndPending(key, userAbortReason);
      }
      if (resolvedConnectId) {
        void this._connector.cancel(this._sessions.get(resolvedConnectId) ?? resolvedConnectId);
      }
      return;
    }
    this._jobQueue.cancelActiveAndPending(undefined, userAbortReason);
    for (const sessionId of this._sessions.values()) {
      void this._connector.cancel(sessionId);
    }
  }

  /**
   * Routes to BOTH the adapter's local UI registry (preemption decisions,
   * future SELECT_DEVICE / DEVICE_PERMISSION) AND the connector's registry
   * (THP pairing tag, PIN matrix). Each side ignores types it isn't waiting
   * for, so double-routing is harmless.
   */
  uiResponse(response: UiResponseEvent): void {
    this._uiRegistry.resolve(response.type, response.payload);
    if (response.type === UI_RESPONSE.RECEIVE_SELECT_DEVICE) return;
    this._connector.uiResponse(response);
  }

  /**
   * Returns the Trezor `device_id` from Features — a random 12-byte value the
   * device stores and regenerates on `wipe_device`. It identifies the PHYSICAL
   * DEVICE, not a seed/wallet: it is shared across passphrase wallets and
   * changes after wipe/restore, so it suits device-match checks but must NOT be
   * used as a wallet fingerprint (use `passphraseState` for wallet identity).
   * Unlike Ledger (which hashes a per-chain address), it is chain-global, so
   * `chain` is accepted for API parity but ignored.
   */
  async getChainFingerprint(
    connectId: string,
    deviceId: string,
    _chain: ChainForFingerprint
  ): Promise<Response<string>> {
    return this._getTrezorDeviceId(connectId, deviceId);
  }

  /**
   * Resolve the active passphrase wallet identity (`passphraseState`).
   * See {@link IHardwareWallet.getPassphraseState} for the discover/verify
   * semantics. Returns `null` for a standard wallet (no passphrase protection) —
   * there's nothing to pin. Serialized through the per-device job queue so it
   * can't interleave with a chain call on the same device (which would desync
   * the THP session selection).
   */
  getPassphraseState(
    connectId: string,
    passphraseState?: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<string | null>> {
    const expectedIdentity = operationContext?.expectedDeviceIdentity;
    if (
      expectedIdentity &&
      (expectedIdentity.vendor !== 'trezor' || expectedIdentity.type !== 'deviceId')
    ) {
      return Promise.resolve(
        failure(HardwareErrorCode.InvalidParams, 'Trezor device identity is required')
      );
    }
    const target = resolveHardwareOperationTarget(
      connectId,
      operationContext?.operationId,
      'trezor'
    );
    if (!target.success) return Promise.resolve(target);
    const { operationId } = target.payload;
    let resolvedConnectId = target.payload.targetId ?? '';
    let releaseOperationRetention: (() => void) | undefined;
    if (operationId) {
      try {
        resolvedConnectId = this._operations.resolve(operationId).connectId;
        releaseOperationRetention = this._operations.retain(operationId);
      } catch (error) {
        return Promise.resolve(this._errorToFailure(error));
      }
    }
    return this._jobQueue
      .enqueue(
        trezorQueueKey({ operationId, connectId: resolvedConnectId }),
        async signal => {
          let selectionRequestId: string | undefined;
          let verified = false;
          // One exit for the binding UI. Everything between picking an endpoint
          // and saving its binding can fail - identity mismatch, session
          // creation, unlock, passphrase derivation - and releasing the device
          // is not the same as closing the dialog the user is looking at. Left
          // to individual exits, the next failure added below would forget
          // again; here every one of them lands in the same finally.
          try {
            if (
              !operationId &&
              expectedIdentity?.value &&
              (!connectId || operationContext?.knownConnections !== undefined)
            ) {
              const resolved = await this._resolveExpectedDeviceConnectId(
                expectedIdentity.value,
                signal,
                operationContext
              );
              resolvedConnectId = resolved.connectId;
              selectionRequestId = resolved.selectionRequestId;
            }
            if (expectedIdentity?.value) {
              if (!operationId) await this._ensureSession(resolvedConnectId, signal);
              if (this._devices.get(resolvedConnectId)?.deviceId !== expectedIdentity.value) {
                return failure(
                  HardwareErrorCode.DeviceMismatch,
                  'Trezor device identity does not match'
                );
              }
            }
            const restorePassphraseRequestContext = this._setPassphraseRequestContext(
              resolvedConnectId,
              {
                passphraseState,
              }
            );
            try {
              const result = await this._resolvePassphraseState(
                resolvedConnectId,
                passphraseState,
                signal,
                operationId
              );
              if (result.success && expectedIdentity?.value) {
                await this._emitVerifiedBinding(
                  expectedIdentity.value,
                  resolvedConnectId,
                  selectionRequestId,
                  operationContext,
                  signal
                );
                verified = true;
                this._rememberVerifiedConnection(expectedIdentity.value, resolvedConnectId);
              }
              return result;
            } finally {
              restorePassphraseRequestContext();
            }
          } finally {
            if (selectionRequestId && !verified) {
              this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
                type: UI_REQUEST.DEVICE_BINDING_STATUS,
                payload: {
                  selectionRequestId,
                  status: signal.aborted ? 'cancelled' : 'failed',
                },
              });
              await this._releaseProvisionalConnection(resolvedConnectId, signal);
            }
          }
        },
        {
          label: 'getPassphraseState',
          rejectIfBusy: true,
          busyError: TrezorAdapter._createDeviceBusyError('getPassphraseState'),
        }
      )
      .catch(error => this._errorToFailure(error))
      .finally(() => releaseOperationRetention?.());
  }

  evmGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<EvmGetAddressParams>
  ) {
    return this._callWalletMethod<EvmAddress>('evmGetAddress', connectId, deviceId, params);
  }

  evmSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<EvmSignTxTrezorParams>
  ) {
    return this._callWalletMethod<EvmSignedTx>('evmSignTransaction', connectId, deviceId, params);
  }

  evmSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<EvmSignMsgParams>
  ) {
    return this._callWalletMethod<EvmSignature>('evmSignMessage', connectId, deviceId, params);
  }

  evmSignTypedData(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<EvmSignTypedDataParams>
  ) {
    return this._callWalletMethod<EvmSignature>('evmSignTypedData', connectId, deviceId, params);
  }

  btcGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<BtcGetAddressParams>
  ) {
    return this._callWalletMethod<BtcAddress>('btcGetAddress', connectId, deviceId, params);
  }

  btcGetPublicKey(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<BtcGetPublicKeyParams>
  ) {
    return this._callWalletMethod<BtcPublicKey>('btcGetPublicKey', connectId, deviceId, params);
  }

  btcSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<BtcSignTxParams>
  ) {
    return this._callWalletMethod<BtcSignedTx>('btcSignTransaction', connectId, deviceId, params);
  }

  btcSignPsbt(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<BtcSignPsbtParams>
  ) {
    return this._callWalletMethod<BtcSignedPsbt>('btcSignPsbt', connectId, deviceId, params);
  }

  btcSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<BtcSignMsgParams>
  ) {
    return this._callWalletMethod<BtcSignature>('btcSignMessage', connectId, deviceId, params);
  }

  btcGetMasterFingerprint(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCommonParams
  ) {
    return this._callWalletMethod<{ masterFingerprint: string }>(
      'btcGetMasterFingerprint',
      connectId,
      deviceId,
      params
    );
  }

  solGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<SolGetAddressParams>
  ) {
    return this._callWalletMethod<SolAddress>('solGetAddress', connectId, deviceId, params);
  }

  solSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<SolSignTxParams>
  ) {
    return this._callWalletMethod<SolSignedTx>('solSignTransaction', connectId, deviceId, params);
  }

  solSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<SolSignMsgParams>
  ) {
    return this._callWalletMethod<SolSignature>('solSignMessage', connectId, deviceId, params);
  }

  tronGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<TronGetAddressParams>
  ) {
    return this._callWalletMethod<TronAddress>('tronGetAddress', connectId, deviceId, params);
  }

  tronSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<TronSignTxParams>
  ) {
    return this._callWalletMethod<TronSignedTx>('tronSignTransaction', connectId, deviceId, params);
  }

  tronSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: TrezorCallParams<TronSignMsgParams>
  ) {
    return this._callWalletMethod<TronSignature>('tronSignMessage', connectId, deviceId, params);
  }

  private static _unwrapConnectorResult(result: unknown): unknown {
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      (((result as ConnectorCallResult).success === true && 'payload' in result) ||
        ((result as ConnectorCallResult).success === false && 'error' in result))
    ) {
      const connectorResult = result as ConnectorCallResult;
      if (connectorResult.success) return connectorResult.payload;
      throw rehydrateConnectorError(connectorResult.error);
    }
    return result;
  }

  private async _callConnector(
    sessionId: string,
    method: string,
    params: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    if (signal?.aborted) {
      throw (signal as AbortSignal & { reason?: unknown }).reason ?? new Error('Aborted');
    }
    this._assertConnectorIdle(method);
    const releaseOperation = this._retainConnectorOperation(`call:${sessionId}`);
    let promise: Promise<unknown>;
    try {
      promise = this._connector.call(sessionId, method, params).finally(() => {
        releaseOperation();
      });
    } catch (error) {
      releaseOperation();
      throw error;
    }
    const result = signal ? await TrezorAdapter._abortable(signal, promise) : await promise;
    return TrezorAdapter._unwrapConnectorResult(result);
  }

  private _assertConnectorIdle(method: string): void {
    // Trezor's connector owns one physical protocol pipe even when the public
    // adapter has multiple logical device ids.
    if (
      this._resetPromise ||
      this._pendingConnectorTeardowns > 0 ||
      this._unsettledConnectorOperations.size > 0
    ) {
      throw TrezorAdapter._createDeviceBusyError(method);
    }
  }

  private _runConnectorTeardown(task: () => Promise<void>): Promise<void> {
    const previous = this._connectorTeardownTail;
    let releaseTail: () => void = () => undefined;
    this._connectorTeardownTail = new Promise<void>(resolve => {
      releaseTail = resolve;
    });
    this._pendingConnectorTeardowns += 1;
    return (async () => {
      try {
        await previous;
        // Connector cancel is advisory. Do not close a Trezor transport while
        // its raw protocol request is still draining.
        await this._waitForConnectorOperationsToDrain();
        await task();
      } finally {
        this._pendingConnectorTeardowns -= 1;
        releaseTail();
      }
    })();
  }

  private async _releaseProvisionalConnection(
    connectId: string,
    signal: AbortSignal
  ): Promise<void> {
    const sessionId = this._sessions.get(connectId);
    this._sessions.delete(connectId);
    this._verifiedPassphraseSessionsByConnectId.delete(connectId);
    if (!sessionId) return;
    // Register the teardown barrier before returning cancellation. The raw
    // protocol call still owns the pipe until it drains, but not its caller.
    const teardown = this._runConnectorTeardown(() => this._connector.disconnect(sessionId)).catch(
      () => undefined
    );
    if (!signal.aborted) await teardown;
  }

  private _waitForConnectorOperationsToDrain(): Promise<void> {
    if (this._unsettledConnectorOperations.size === 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this._connectorIdleWaiters.add(resolve);
    });
  }

  private _retainConnectorOperation(key: string): () => void {
    this._unsettledConnectorOperations.set(
      key,
      (this._unsettledConnectorOperations.get(key) ?? 0) + 1
    );
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const remaining = (this._unsettledConnectorOperations.get(key) ?? 1) - 1;
      if (remaining > 0) {
        this._unsettledConnectorOperations.set(key, remaining);
      } else {
        this._unsettledConnectorOperations.delete(key);
      }
      if (this._unsettledConnectorOperations.size === 0) {
        for (const resolve of this._connectorIdleWaiters) resolve();
        this._connectorIdleWaiters.clear();
      }
    };
  }

  private static _normalizeAllNetworkItem(
    method: AllNetworkMethodName,
    item: AllNetworkAddressParams
  ): AllNetworkAddressParams {
    if (method !== 'btcGetAddress' && method !== 'btcGetPublicKey') {
      return item;
    }

    const itemWithCoin = item as AllNetworkAddressParams & { coin?: unknown };
    if (itemWithCoin.coin) {
      return item;
    }

    const network = item.network.toLowerCase();
    return {
      ...item,
      coin: TREZOR_BTC_NETWORK_COIN_MAP[network] ?? item.network,
    };
  }

  private static _getItemDeviceId(item: AllNetworkAddressParams): string | undefined {
    const { deviceId } = item as { deviceId?: unknown };
    return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : undefined;
  }

  /** UserAborted is a top-level abort code, so this ends the bundle. */
  private static _buildCancelledFailure<T>(signal: AbortSignal): Response<T> {
    const reason = signal.reason as { code?: unknown; message?: unknown } | undefined;
    const code =
      typeof reason?.code === 'number'
        ? (reason.code as HardwareErrorCode)
        : HardwareErrorCode.UserAborted;
    const message = typeof reason?.message === 'string' ? reason.message : '';
    return failure(code, message || 'All-network get-address cancelled');
  }

  private _callAllNetworkMethod(
    connectId: string,
    method: AllNetworkMethodName,
    item: AllNetworkAddressParams,
    bundleContext: TrezorBundleContext
  ): Promise<Response<unknown>> {
    switch (method) {
      case 'evmGetAddress':
      case 'btcGetAddress':
      case 'btcGetPublicKey':
      case 'solGetAddress':
      case 'tronGetAddress':
        return this._callMethod(method, connectId, '', item, true, bundleContext);
      default:
        return Promise.resolve(
          failure(
            HardwareErrorCode.InvalidParams,
            `Unsupported allNetwork method: ${String(method)}`
          )
        );
    }
  }

  on<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  on(event: string, listener: DeviceEventListener): void;

  on(event: string, listener: (event: HardwareEvent) => void): void {
    this._emitter.on(event, listener);
  }

  off<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  off(event: string, listener: DeviceEventListener): void;

  off(event: string, listener: (event: HardwareEvent) => void): void {
    this._emitter.off(event, listener);
  }

  private _callWalletMethod<T>(
    methodName: TrezorWalletMethodName,
    connectId: NullableCallArg<string>,
    deviceId: NullableCallArg<string>,
    params: NullableCallArg<unknown>
  ): Promise<Response<T>> {
    return this._callMethod<T>(methodName, connectId, deviceId, params, true);
  }

  private _callDeviceManagerMethod<T>(
    methodName: TrezorDeviceManagerMethodName,
    connectId: NullableCallArg<string>,
    params: NullableCallArg<unknown>,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<T>> {
    const expectedIdentity = operationContext?.expectedDeviceIdentity;
    if (
      expectedIdentity &&
      (expectedIdentity.vendor !== 'trezor' || expectedIdentity.type !== 'deviceId')
    ) {
      return Promise.resolve(
        failure(
          HardwareErrorCode.InvalidParams,
          'Trezor device-manager operations require a Trezor deviceId identity'
        )
      );
    }
    return this._callMethod<T>(
      methodName,
      connectId,
      expectedIdentity?.value,
      {
        ...(params && typeof params === 'object' ? params : {}),
        knownConnections: operationContext?.knownConnections,
        extra: operationContext?.extra,
        allowDeviceSelection: operationContext?.allowDeviceSelection,
        ...(operationContext?.operationId ? { operationId: operationContext.operationId } : {}),
      },
      false
    );
  }

  private async _callMethod<T>(
    methodName: TrezorMethodName,
    connectId: NullableCallArg<string>,
    deviceId: NullableCallArg<string>,
    params: NullableCallArg<unknown>,
    requiresWalletIntent: boolean,
    bundleContext?: TrezorBundleContext
  ): Promise<Response<T>> {
    const call = TrezorAdapter._normalizeCallArgs(connectId, deviceId, params);
    const commonParams = TrezorAdapter._splitCommonParams(call.params);
    const positionalOperationId = isHardwareOperationId(call.connectId)
      ? call.connectId
      : undefined;
    if (
      positionalOperationId &&
      commonParams.operationId &&
      positionalOperationId !== commonParams.operationId
    ) {
      return failure(HardwareErrorCode.InvalidParams, 'Conflicting Trezor operation ids', {
        positionalOperationId,
        commonOperationId: commonParams.operationId,
      });
    }
    const operationId = commonParams.operationId ?? positionalOperationId;
    let releaseOperationRetention: (() => void) | undefined;
    try {
      if (operationId) {
        call.connectId = this._operations.resolve(operationId).connectId;
        releaseOperationRetention = this._operations.retain(operationId);
      }
    } catch (error) {
      return this._errorToFailure(error);
    }
    debugLog('[TrezorAdapter][REQ]', {
      method: methodName,
      connectId: call.connectId || '(empty)',
      deviceId: deviceId || undefined,
      params: TrezorAdapter._sanitizeForLog(call.params, methodName),
    });
    try {
      const response = await this._jobQueue.enqueue(
        trezorQueueKey({ operationId, connectId: call.connectId }),
        async signal => {
          let effectiveConnectId = call.connectId;
          let selectionRequestId: string | undefined;
          try {
            if (
              !bundleContext?.connection &&
              !operationId &&
              deviceId &&
              (!connectId || commonParams.connectionContext?.knownConnections !== undefined)
            ) {
              const resolved = await this._resolveExpectedDeviceConnectId(
                deviceId,
                signal,
                commonParams.connectionContext
              );
              effectiveConnectId = resolved.connectId;
              selectionRequestId = resolved.selectionRequestId;
            }
          } catch (error) {
            return this._errorToFailure(error);
          }
          const response = await this._callWithRetry<T>(
            bundleContext?.connection?.connectId ?? effectiveConnectId,
            methodName,
            call.params,
            deviceId || '',
            requiresWalletIntent,
            true,
            signal,
            operationId,
            selectionRequestId,
            bundleContext
          );
          if (!response.success && selectionRequestId) {
            // A selected endpoint is provisional until wallet verification succeeds.
            // Release it so a later attempt gets its own explicit binding request.
            await this._releaseProvisionalConnection(effectiveConnectId, signal);
          }
          return response;
        },
        {
          label: methodName,
          rejectIfBusy: true,
          busyError: TrezorAdapter._createDeviceBusyError(methodName),
        }
      );
      debugLog('[TrezorAdapter][RES]', {
        method: methodName,
        success: response.success,
        payload: TrezorAdapter._sanitizeForLog(response.payload, methodName),
      });
      return response;
    } catch (error) {
      // The only way a Promise rejects out of `enqueue` is the busy-reject —
      // _callWithRetry never throws, it returns Response.failure. Convert to
      // the Response shape so chain method callers stay uniform.
      const response = this._errorToFailure(error);
      debugLog('[TrezorAdapter][RES]', {
        method: methodName,
        success: false,
        payload: TrezorAdapter._sanitizeForLog(response.payload, methodName),
      });
      return response;
    } finally {
      releaseOperationRetention?.();
    }
  }

  private async _callWithRetry<T>(
    connectId: string,
    methodName: TrezorMethodName,
    params: unknown,
    expectedDeviceId: string,
    requiresWalletIntent: boolean,
    allowRetry: boolean,
    signal: AbortSignal,
    operationId?: string,
    selectionRequestId?: string,
    bundleContext?: TrezorBundleContext
  ): Promise<Response<T>> {
    const { passphraseState, useEmptyPassphrase, rest, connectionContext } =
      TrezorAdapter._splitCommonParams(params);
    let pendingBindingRequestId = selectionRequestId;
    let businessCallStarted = false;
    const restorePassphraseRequestContext = this._setPassphraseRequestContext(connectId, {
      passphraseState,
      useEmptyPassphrase,
    });
    try {
      if (bundleContext?.connection) {
        const pinned = bundleContext.connection;
        if (this._sessions.get(pinned.connectId) !== pinned.sessionId) {
          return failure(
            HardwareErrorCode.DeviceDisconnected,
            'Trezor all-network connection ended'
          );
        }
      }
      const sessionId = operationId
        ? this._sessions.get(this._operations.resolve(operationId).connectId)
        : await this._ensureSession(connectId, signal);
      if (!sessionId) {
        if (operationId) {
          this._operations.end(operationId, 'disconnect');
          return failure(
            HardwareErrorCode.OperationEnded,
            'Trezor operation connection is no longer active',
            { operationId, reason: 'disconnect' }
          );
        }
        return failure(HardwareErrorCode.DeviceNotFound, 'Trezor session was not found');
      }
      if (bundleContext && !bundleContext.connection) {
        bundleContext.connection = { connectId, sessionId };
      }
      if (expectedDeviceId) {
        const actualDeviceId = this._devices.get(connectId)?.deviceId;
        if (!actualDeviceId || actualDeviceId !== expectedDeviceId) {
          return failure(
            HardwareErrorCode.DeviceMismatch,
            `Wrong device: expected ${expectedDeviceId}, got ${actualDeviceId || 'unknown'}`,
            { expected: expectedDeviceId, actual: actualDeviceId || '' }
          );
        }
      }
      if (requiresWalletIntent && !passphraseState && useEmptyPassphrase !== true) {
        return failure(
          HardwareErrorCode.InvalidParams,
          `Trezor ${methodName} requires an explicit wallet intent: passphraseState or useEmptyPassphrase`
        );
      }
      // Pin the call to the requested passphrase wallet. For THP this creates
      // a new application session; for v1 it re-initializes the device session.
      // Runs inside this queued job so the session alignment and the call can't
      // be interleaved by another request.
      if (passphraseState) {
        await TrezorAdapter._abortable(
          signal,
          this._alignAppSession(connectId, sessionId, passphraseState, signal)
        );
      } else if (useEmptyPassphrase === true) {
        await TrezorAdapter._abortable(signal, this._createFreshAppSession(sessionId, signal));
      }
      if (expectedDeviceId) {
        await this._emitVerifiedBinding(
          expectedDeviceId,
          connectId,
          pendingBindingRequestId,
          connectionContext,
          signal
        );
        pendingBindingRequestId = undefined;
        this._rememberVerifiedConnection(expectedDeviceId, connectId);
      }
      businessCallStarted = true;
      const result = await TrezorAdapter._abortable(
        signal,
        this._callConnector(sessionId, methodName, rest, signal)
      );
      return success(result as T);
    } catch (error) {
      // If we were aborted, surface as-is — don't take the retry/recovery path.
      if (signal.aborted) {
        if (pendingBindingRequestId) {
          this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
            type: UI_REQUEST.DEVICE_BINDING_STATUS,
            payload: { selectionRequestId: pendingBindingRequestId, status: 'cancelled' },
          });
          pendingBindingRequestId = undefined;
        }
        return this._errorToFailure(error);
      }
      const code = TrezorAdapter._errorCode(error);
      const willRetryStaleSession =
        allowRetry &&
        (passphraseState || useEmptyPassphrase === true) &&
        TrezorAdapter._isStaleSessionError(code);
      if (pendingBindingRequestId && !willRetryStaleSession) {
        this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
          type: UI_REQUEST.DEVICE_BINDING_STATUS,
          payload: { selectionRequestId: pendingBindingRequestId, status: 'failed' },
        });
        pendingBindingRequestId = undefined;
      }
      const ambiguousTransportFailure =
        code === HardwareErrorCode.DeviceDisconnected ||
        code === HardwareErrorCode.OperationTimeout ||
        code === HardwareErrorCode.TransportError;
      if (operationId && ambiguousTransportFailure) {
        this._sessions.delete(connectId);
        this._verifiedPassphraseSessionsByConnectId.delete(connectId);
        this._operations.end(operationId, 'disconnect');
        return failure(
          HardwareErrorCode.OperationEnded,
          businessCallStarted && !canReplayHardwareMethodAfterTransportFailure(methodName)
            ? `Trezor ${methodName} may have completed before the connection was lost`
            : 'Trezor operation connection was lost',
          businessCallStarted && !canReplayHardwareMethodAfterTransportFailure(methodName)
            ? operationMayHaveCompletedParams(methodName, {
                operationId,
                reason: 'disconnect',
              })
            : { operationId, reason: 'disconnect' },
          undefined,
          businessCallStarted && !canReplayHardwareMethodAfterTransportFailure(methodName)
            ? { scope: 'unknown' }
            : undefined
        );
      }
      // A one-shot operation also owns its connection once initialization starts.
      // Never reconnect or replay it after the transport is lost.
      if (!operationId && ambiguousTransportFailure) {
        this._sessions.delete(connectId);
        this._verifiedPassphraseSessionsByConnectId.delete(connectId);
        if (businessCallStarted && !canReplayHardwareMethodAfterTransportFailure(methodName)) {
          return failure(
            code as HardwareErrorCode,
            `Trezor ${methodName} may have completed before the connection was lost`,
            operationMayHaveCompletedParams(methodName),
            undefined,
            { scope: 'unknown' }
          );
        }
      }
      // The device evicted the passphrase session created for this call. Retry
      // once and recreate the requested wallet context.
      if (willRetryStaleSession) {
        if (passphraseState) {
          this._forgetVerifiedPassphraseSession(connectId, passphraseState);
        }
        // The retry owns the binding request from here on.
        const retryBindingRequestId = pendingBindingRequestId;
        pendingBindingRequestId = undefined;
        return await this._callWithRetry<T>(
          connectId,
          methodName,
          params,
          expectedDeviceId,
          requiresWalletIntent,
          false,
          signal,
          operationId,
          retryBindingRequestId,
          bundleContext
        );
      }
      debugLog('[TrezorAdapter][ERROR]', {
        method: methodName,
        connectId,
        error: TrezorAdapter._errorForLog(error),
      });
      return this._errorToFailure(error);
    } finally {
      restorePassphraseRequestContext();
      // Early returns above leave the host dialog waiting; close the request here
      // so every exit that did not verify the binding reports a terminal status.
      if (pendingBindingRequestId) {
        this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
          type: UI_REQUEST.DEVICE_BINDING_STATUS,
          payload: {
            selectionRequestId: pendingBindingRequestId,
            status: signal.aborted ? 'cancelled' : 'failed',
          },
        });
        pendingBindingRequestId = undefined;
      }
    }
  }

  private async _ensureSession(
    connectId: string,
    signal?: AbortSignal,
    transportType?: ConnectionType
  ): Promise<string> {
    const existing = this._sessions.get(connectId);
    if (existing) return existing;

    const pending = this._connectingPromises.get(connectId);
    if (pending) return pending;

    const stateGeneration = this._stateGeneration;
    const promise = (async () => {
      if (signal?.aborted) {
        throw Object.assign(new Error('Trezor connection aborted'), {
          code: HardwareErrorCode.UserAborted,
        });
      }
      // Fail fast: a single connect attempt. On an "unavailable device" error we
      // drop the cached session/passphrase state and rethrow (no retry loop).
      try {
        return await this._connectSession(connectId, signal, stateGeneration, transportType);
      } catch (error) {
        if (TrezorAdapter._isConnectionUnavailableError(error)) {
          this._sessions.delete(connectId);
          this._verifiedPassphraseSessionsByConnectId.delete(connectId);
        }
        throw error;
      }
    })();

    this._connectingPromises.set(connectId, promise);
    try {
      return await promise;
    } finally {
      if (this._connectingPromises.get(connectId) === promise) {
        this._connectingPromises.delete(connectId);
      }
      this._disconnectRequested.delete(connectId);
    }
  }

  private async _resolveExpectedDeviceConnectId(
    expectedDeviceId: string,
    signal: AbortSignal,
    context?: IHardwareConnectionContext
  ): Promise<{ connectId: string; selectionRequestId?: string }> {
    const connectedMatch = Array.from(this._devices.values()).find(
      device => device.deviceId === expectedDeviceId && this._sessions.has(device.connectId)
    );
    if (connectedMatch) return { connectId: connectedMatch.connectId };

    const availableTransports = this._connector.availableTransports ?? [
      this._connector.connectionType,
    ];
    if (availableTransports.includes('usb')) {
      await TrezorAdapter._abortable(
        signal,
        this._ensureDevicePermission(undefined, expectedDeviceId, 'usb')
      );
    }
    const candidates = await TrezorAdapter._abortable(
      signal,
      this._searchDevices({ transportType: 'usb' }, signal)
    );

    const mismatchedDeviceIds: string[] = [];
    const knownConnection = this._knownDeviceConnections.get(expectedDeviceId);
    const knownUsbIds =
      context?.knownConnections !== undefined
        ? context.knownConnections.flatMap(connection =>
            connection.transport === 'usb' ? [connection.connectId] : []
          )
        : [knownConnection?.usbConnectId].filter((id): id is string => Boolean(id));
    const suppliedBleIds = context?.knownConnections?.flatMap(connection =>
      connection.transport === 'ble' ? [connection.connectId] : []
    );
    const knownBleIds = suppliedBleIds?.length
      ? suppliedBleIds
      : [knownConnection?.bleConnectId].filter((id): id is string => Boolean(id));
    // A Trezor publishes its serial at enumeration, so a saved USB locator
    // answers "is my wallet on this bus?" without opening anything. When the
    // saved locator is absent from this round, the wallet is not plugged in:
    // go to BLE rather than initializing every other Trezor on the bus - which
    // on a Safe 7 means a THP handshake on a device that is not ours - only to
    // fail afterwards. A wallet that has never been reached over USB has no
    // locator to check, and there we do have to connect before we can tell.
    const usbCandidates = candidates.filter(
      device =>
        device.connectionType === 'usb' &&
        (!knownUsbIds.length || knownUsbIds.includes(device.connectId))
    );
    // USB discovery may expose only an ephemeral locator. Probe Features to
    // identify it, but never silently pair arbitrary nearby BLE devices.
    for (const candidate of usbCandidates) {
      let sessionId: string | undefined;
      try {
        // Connecting only initializes Features. No wallet or business method is
        // dispatched until the firmware device_id matches the stored identity.
        // eslint-disable-next-line no-await-in-loop
        sessionId = await this._ensureSession(candidate.connectId, signal, 'usb');
        const actualDeviceId = this._devices.get(candidate.connectId)?.deviceId ?? '';
        if (actualDeviceId === expectedDeviceId) return { connectId: candidate.connectId };
        mismatchedDeviceIds.push(actualDeviceId || 'unknown');
      } catch (error) {
        if (signal.aborted) throw error;
        // Connector initialization failures intentionally keep the transport
        // reusable for a same-device retry. Do not open another candidate on
        // the same protocol pipe until the caller resolves that failure.
        if (!TrezorAdapter._isConnectionUnavailableError(error)) throw error;
      }

      if (sessionId) {
        const mismatchedSessionId = sessionId;
        this._sessions.delete(candidate.connectId);
        this._verifiedPassphraseSessionsByConnectId.delete(candidate.connectId);
        // eslint-disable-next-line no-await-in-loop
        await this._runConnectorTeardown(() => this._connector.disconnect(mismatchedSessionId));
      }
    }

    if (mismatchedDeviceIds.length) {
      // Every candidate answered and none is this wallet. Say so plainly: the
      // user can unplug it and connect the right one. This is not
      // DeviceMismatch — nothing about the known wallet changed.
      throw createHwkError({
        code: HardwareErrorCode.DeviceSearchMismatch,
        message:
          'The connected Trezor is not the wallet this operation needs. Unplug it and connect the right device.',
        params: { connectedDeviceIds: mismatchedDeviceIds },
      });
    }

    if (usbCandidates.length > 0) {
      // Enumerated but not openable, so no identity was ever read. Claiming the
      // wrong device is plugged in would send the user after the wrong remedy.
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'Trezor devices are present but none could be opened to check its identity.',
      });
    }

    const [knownBleConnectId] = knownBleIds;
    if (knownBleConnectId && availableTransports.includes('ble')) {
      // A saved endpoint never opens a new binding session after failure.
      await TrezorAdapter._abortable(
        signal,
        this._ensureDevicePermission(knownBleConnectId, expectedDeviceId, 'ble')
      );
      await this._ensureSession(knownBleConnectId, signal, 'ble');
      const actualDeviceId = this._devices.get(knownBleConnectId)?.deviceId;
      if (actualDeviceId === expectedDeviceId) return { connectId: knownBleConnectId };
      const sessionId = this._sessions.get(knownBleConnectId);
      this._sessions.delete(knownBleConnectId);
      this._verifiedPassphraseSessionsByConnectId.delete(knownBleConnectId);
      if (sessionId) {
        await this._runConnectorTeardown(() => this._connector.disconnect(sessionId));
      }
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'The bound Trezor Bluetooth device has a different identity',
      });
    }

    if (context?.allowDeviceSelection === false) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'No known Trezor connection is available',
      });
    }
    return this._selectBleDeviceForBinding(expectedDeviceId, signal, context, 'missing-binding');
  }

  private async _selectBleDeviceForBinding(
    expectedDeviceId: string,
    signal: AbortSignal,
    context: IHardwareConnectionContext | undefined,
    reason: 'missing-binding' | 'manual-rebind'
  ): Promise<{ connectId: string; selectionRequestId?: string }> {
    const availableTransports = this._connector.availableTransports ?? [
      this._connector.connectionType,
    ];
    const allowUsbFallback = reason !== 'manual-rebind' && availableTransports.includes('usb');
    const knownUsbIds = context?.knownConnections
      ? context.knownConnections.flatMap(connection =>
          connection.transport === 'usb' ? [connection.connectId] : []
        )
      : [this._knownDeviceConnections.get(expectedDeviceId)?.usbConnectId];
    if (availableTransports.includes('ble')) {
      await TrezorAdapter._abortable(
        signal,
        this._ensureDevicePermission(undefined, expectedDeviceId, 'ble')
      );
    }
    const bleCandidates = (
      await TrezorAdapter._abortable(
        signal,
        this._searchDevices({ transportType: 'ble', waitForAllTransports: true }, signal)
      )
    ).filter(device => device.connectionType === 'ble');
    if (signal.aborted) throw signal.reason;
    const rejectedConnectIds = new Set<string>();
    const bindingSessionId = this._uiRegistry.createRequestId();
    let rejectedConnectId: string | undefined;
    while (
      availableTransports.includes('ble') &&
      this._emitter.listenerCount(UI_REQUEST.REQUEST_SELECT_DEVICE)
    ) {
      const { device: selected, requestId } = await requestBleDeviceSelection({
        emitter: this._emitter,
        registry: this._uiRegistry,
        signal,
        allowUsbFallback,
        scan: async () => {
          if (allowUsbFallback) {
            const usbCandidates = (
              await this._searchDevices({ transportType: 'usb' }, signal)
            ).filter(
              device => device.connectionType === 'usb' && !rejectedConnectIds.has(device.connectId)
            );
            const candidate =
              usbCandidates.find(device => knownUsbIds.includes(device.connectId)) ??
              usbCandidates[0];
            if (candidate) return [candidate];
          }
          return (
            await this._searchDevices({ transportType: 'ble', waitForAllTransports: true }, signal)
          ).filter(
            device => device.connectionType === 'ble' && !rejectedConnectIds.has(device.connectId)
          );
        },
        request: {
          devices: bleCandidates.filter(device => !rejectedConnectIds.has(device.connectId)),
          bindingSessionId,
          rejectedConnectId,
          context: {
            kind: 'bind-connection',
            transport: 'ble',
            reason,
          },
          extra: context?.extra,
        },
      });
      try {
        if (reason === 'manual-rebind') {
          this._operations.endByConnectionKey(selected.connectId, 'explicit');
          await this._releaseProvisionalConnection(selected.connectId, signal);
        }
        await this._ensureSession(selected.connectId, signal, selected.connectionType);
      } catch (error) {
        this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
          type: UI_REQUEST.DEVICE_BINDING_STATUS,
          payload: {
            selectionRequestId: requestId,
            status: signal.aborted ? 'cancelled' : 'failed',
          },
        });
        throw error;
      }
      if (this._devices.get(selected.connectId)?.deviceId !== expectedDeviceId) {
        const sessionId = this._sessions.get(selected.connectId);
        this._sessions.delete(selected.connectId);
        this._verifiedPassphraseSessionsByConnectId.delete(selected.connectId);
        if (sessionId) {
          await this._runConnectorTeardown(() => this._connector.disconnect(sessionId));
        }
        rejectedConnectId = selected.connectId;
        rejectedConnectIds.add(selected.connectId);
        continue;
      }
      if (selected.connectionType === 'usb') {
        // End only the binding UI. The original operation continues on verified USB.
        this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
          type: UI_REQUEST.DEVICE_BINDING_STATUS,
          payload: { selectionRequestId: requestId, status: 'cancelled' },
        });
        return { connectId: selected.connectId };
      }
      return { connectId: selected.connectId, selectionRequestId: requestId };
    }

    throw createHwkError({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'No readable Trezor device is available',
    });
  }

  private _rememberVerifiedConnection(deviceId: string, connectId: string): void {
    const device = this._devices.get(connectId);
    if (!device || device.deviceId !== deviceId) return;
    const known = this._knownDeviceConnections.get(deviceId) ?? { deviceId };
    if (device.connectionType === 'ble') {
      known.bleConnectId = connectId;
    } else if (device.connectionType === 'usb' && device.capabilities?.persistentDeviceIdentity) {
      known.usbConnectId = connectId;
    }
    this._knownDeviceConnections.set(deviceId, known);
  }

  private async _emitVerifiedBinding(
    deviceId: string,
    connectId: string,
    selectionRequestId: string | undefined,
    context?: IHardwareConnectionContext,
    signal?: AbortSignal
  ): Promise<boolean> {
    if (!selectionRequestId) return false;
    const device = this._devices.get(connectId);
    if (!device || device.deviceId !== deviceId || device.connectionType !== 'ble') {
      // Every other exit reports a terminal status, this one has to as well:
      // callers clear the request id and would leave the host dialog waiting.
      // Cancelled, not failed - the call itself carries on, same as the USB
      // fallback that drops a binding without stopping the operation.
      this._emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
        type: UI_REQUEST.DEVICE_BINDING_STATUS,
        payload: { selectionRequestId, status: 'cancelled' },
      });
      return false;
    }
    const outcome = await requestSaveDeviceBinding(
      this._emitter,
      this._uiRegistry,
      {
        selectionRequestId,
        connection: { transport: 'ble', connectId },
        identity: { vendor: 'trezor', type: 'deviceId', value: deviceId },
        extra: context?.extra,
      },
      signal
    );
    return outcome.saved;
  }

  /**
   * Pin the device's active wallet session to `passphraseState` (the target
   * wallet identity) before a wallet-bound op. THP has an app-session id; v1
   * does not, but it still binds passphrase to the device session, so the
   * connector re-initializes v1 before we derive and verify.
   *
   * SECURITY: a verified THP app session may be selected again, but the adapter
   * still derives and verifies the passphrase state before any chain method can
   * run. If the cache is stale, fall back to creating a fresh wallet context.
   */
  private async _alignAppSession(
    connectId: string,
    sessionId: string,
    passphraseState: string,
    signal: AbortSignal
  ): Promise<void> {
    const reused = await this._reuseVerifiedPassphraseSession(
      connectId,
      sessionId,
      passphraseState,
      signal
    );
    if (reused) return;

    const created = (await TrezorAdapter._abortable(
      signal,
      this._callConnector(
        sessionId,
        '__thpCreateSession',
        {
          passphraseMode: 'prompt',
        },
        signal
      )
    )) as { protocol?: string; thpSessionId?: string | null };
    // v1 has no host-managed app-session id, but the connector has just
    // re-initialized a fresh device session; continue with reactive
    // passphrase-state verification.
    if (
      (created?.protocol === 'thp' && !created.thpSessionId) ||
      (created?.protocol !== 'thp' && created?.protocol !== 'v1')
    ) {
      throw createHwkError({
        code: HardwareErrorCode.TransportError,
        message: 'Cannot verify the requested Trezor wallet session',
      });
    }
    const state = await this._deriveState(sessionId, signal);
    if (state !== passphraseState) {
      throw Object.assign(
        new Error(
          `Passphrase produced wallet ${state}, expected ${passphraseState} (passphraseState mismatch)`
        ),
        { code: HardwareErrorCode.PassphraseStateMismatch }
      );
    }
    this._rememberVerifiedPassphraseSession(connectId, passphraseState, sessionId, created);
  }

  private _rememberVerifiedPassphraseSession(
    connectId: string,
    passphraseState: string,
    sessionId: string,
    created: { protocol?: string; thpSessionId?: string | null } | undefined
  ): void {
    let session: TrezorVerifiedPassphraseSession | undefined;
    if (created?.protocol === 'thp' && typeof created.thpSessionId === 'string') {
      session = {
        sessionId,
        protocol: 'thp',
        thpSessionId: created.thpSessionId,
      };
    } else if (created?.protocol === 'v1') {
      session = {
        sessionId,
        protocol: 'v1',
      };
    }
    if (!session) return;

    const sessions =
      this._verifiedPassphraseSessionsByConnectId.get(connectId) ??
      new Map<string, TrezorVerifiedPassphraseSession>();
    sessions.set(passphraseState, session);
    this._verifiedPassphraseSessionsByConnectId.set(connectId, sessions);
  }

  private _forgetVerifiedPassphraseSession(connectId: string, passphraseState: string): void {
    const sessions = this._verifiedPassphraseSessionsByConnectId.get(connectId);
    if (!sessions) return;
    sessions.delete(passphraseState);
    if (!sessions.size) {
      this._verifiedPassphraseSessionsByConnectId.delete(connectId);
    }
  }

  private async _reuseVerifiedPassphraseSession(
    connectId: string,
    sessionId: string,
    passphraseState: string,
    signal: AbortSignal
  ): Promise<boolean> {
    const cached = this._verifiedPassphraseSessionsByConnectId.get(connectId)?.get(passphraseState);
    if (!cached || cached.sessionId !== sessionId) {
      this._forgetVerifiedPassphraseSession(connectId, passphraseState);
      return false;
    }

    try {
      if (cached.protocol === 'thp') {
        if (!cached.thpSessionId) return false;
        await TrezorAdapter._abortable(
          signal,
          this._callConnector(
            sessionId,
            '__thpSelectSession',
            {
              thpSessionId: cached.thpSessionId,
            },
            signal
          )
        );
      }
      const state = await this._deriveState(sessionId, signal);
      if (state !== passphraseState) {
        this._forgetVerifiedPassphraseSession(connectId, passphraseState);
        return false;
      }
      return true;
    } catch (error) {
      this._forgetVerifiedPassphraseSession(connectId, passphraseState);
      if (signal.aborted) throw error;
      return false;
    }
  }

  private async _createFreshAppSession(sessionId: string, signal: AbortSignal): Promise<void> {
    // Create a fresh standard-wallet context for this call. Empty passphrase is
    // enforced inside connector/core, not delegated to host UI handlers.
    await TrezorAdapter._abortable(
      signal,
      this._callConnector(
        sessionId,
        '__thpCreateSession',
        {
          passphraseMode: 'empty',
        },
        signal
      )
    );
  }

  /**
   * Derive the active session's passphrase state — the wallet identity used to
   * verify the right wallet is active: the compressed PUBLIC KEY at a fixed
   * account path (m/44'/0'/0'). It comes from the SAME GetPublicKey that also
   * carries the 4-byte fingerprint, but we use the FULL pubkey (not the truncated
   * fingerprint) so it's collision-resistant — the address we return can never
   * come from the wrong wallet — while avoiding OneKey's extra Testnet GetAddress.
   * Non-interactive (also unlocks via PIN as a protected derivation).
   */
  private async _deriveState(sessionId: string, signal: AbortSignal): Promise<string> {
    const derived = (await TrezorAdapter._abortable(
      signal,
      this._callConnector(
        sessionId,
        'btcGetPublicKey',
        {
          path: "m/44'/0'/0'",
          showOnDevice: false,
        },
        signal
      )
    )) as { publicKey?: string };
    const state = derived?.publicKey;
    if (!state) {
      throw Object.assign(new Error('Failed to derive passphrase state (wallet public key)'), {
        code: HardwareErrorCode.UnknownError,
      });
    }
    return state;
  }

  private async _resolvePassphraseState(
    connectId: string,
    passphraseState: string | undefined,
    signal: AbortSignal,
    operationId?: string
  ): Promise<Response<string | null>> {
    try {
      const sessionId = operationId
        ? this._sessions.get(this._operations.resolve(operationId).connectId)
        : await this._ensureSession(connectId, signal);
      if (!sessionId) {
        return failure(
          HardwareErrorCode.OperationEnded,
          'Trezor operation connection is no longer active'
        );
      }
      if (passphraseState) {
        // Verify mode: align (which always re-derives + confirms the state) so the
        // host can gate signing on the correct wallet being active.
        await this._alignAppSession(connectId, sessionId, passphraseState, signal);
        return success(passphraseState);
      }
      // Discover mode (OneKey-aligned). DON'T trust pre-read features — a LOCKED
      // device reports an unreliable `passphrase_protection`, and the connector's
      // plain getFeatures returns a CACHED blob, so checking `unlocked` up front
      // is meaningless. Instead derive first (which unlocks), then re-read fresh:
      //   1. Create a session + derive the state. This UNLOCKS the device (PIN) and,
      //      for a passphrase wallet, prompts the passphrase (THP: proactively in
      //      ThpCreateNewSession; v1: reactively).
      //   2. Re-read features FRESH from the device (now unlocked → trustworthy).
      //   3. passphrase_protection === true → return the current passphrase
      //      state, even if the entered passphrase was empty. Otherwise →
      //      standard wallet → return null (OneKey-aligned).
      const created = (await TrezorAdapter._abortable(
        signal,
        this._callConnector(
          sessionId,
          '__thpCreateSession',
          {
            passphraseMode: 'prompt',
          },
          signal
        )
      )) as { protocol?: string; thpSessionId?: string | null };
      const state = await this._deriveState(sessionId, signal);
      const features = (await TrezorAdapter._abortable(
        signal,
        this._callConnector(sessionId, 'getFeatures', { refresh: true }, signal)
      )) as Record<string, unknown> | undefined;
      if (features?.passphrase_protection !== true) {
        // Standard wallet — discard the derived state, return null (OneKey convention).
        return success(null);
      }
      this._rememberVerifiedPassphraseSession(connectId, state, sessionId, created);
      return success(state);
    } catch (error) {
      return this._errorToFailure(error);
    }
  }

  private _onDeviceConnect = (data: { device: ConnectorDevice }): void => {
    const device = this._connectorDeviceToDeviceInfo(data.device);
    this._devices.set(device.connectId, device);
    this._emitter.emit(DEVICE.CONNECT, { type: DEVICE.CONNECT, payload: device });
  };

  private _onDeviceDisconnect = (data: { connectId: string }): void => {
    this._operations.endByConnectionKey(data.connectId, 'disconnect');
    this._sessions.delete(data.connectId);
    this._verifiedPassphraseSessionsByConnectId.delete(data.connectId);
    this._devices.delete(data.connectId);
    this._emitter.emit(DEVICE.DISCONNECT, {
      type: DEVICE.DISCONNECT,
      payload: { connectId: data.connectId },
    });
  };

  private _onSupportFeatures = (data: {
    device: ConnectorDevice & { features: Record<string, unknown> };
  }): void => {
    const device = {
      ...this._connectorDeviceToDeviceInfo(data.device),
      features: data.device.features,
    };
    this._emitter.emit(DEVICE.FEATURES, {
      type: DEVICE.FEATURES,
      device,
      payload: { device },
    });
  };

  private _onUiRequest = (data: { type: string; payload?: unknown }): void => {
    if (data.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      const payload =
        data.payload && typeof data.payload === 'object'
          ? (data.payload as Record<string, unknown>)
          : {};
      const connectId = typeof payload.connectId === 'string' ? payload.connectId : undefined;
      const context = connectId
        ? this._passphraseRequestContextByConnectId.get(connectId)
        : undefined;
      this._emitter.emit(
        data.type as keyof HardwareEventMap,
        {
          ...data,
          payload: {
            ...payload,
            ...(context?.passphraseState !== undefined
              ? { passphraseState: context.passphraseState }
              : {}),
            ...(context?.useEmptyPassphrase !== undefined
              ? { useEmptyPassphrase: context.useEmptyPassphrase }
              : {}),
          },
        } as never
      );
      return;
    }
    this._emitter.emit(data.type as keyof HardwareEventMap, data as never);
  };

  private _onUiEvent = (data: ConnectorUiEvent): void => {
    this._emitter.emit('ui-event', data);
  };

  private _onThpCredentialsChanged = (data: {
    connectId: string;
    deviceId?: string;
    credentials: Record<string, unknown>[];
  }): void => {
    this._emitter.emit(DEVICE.TREZOR_THP_CREDENTIALS_CHANGED, {
      type: DEVICE.TREZOR_THP_CREDENTIALS_CHANGED,
      payload: data,
    });
  };

  private _registerConnectorEvents(): void {
    this._connector.on('device-connect', this._onDeviceConnect);
    this._connector.on('device-disconnect', this._onDeviceDisconnect);
    this._connector.on(DEVICE.FEATURES, this._onSupportFeatures);
    this._connector.on('device-trezor-thp-credentials-changed', this._onThpCredentialsChanged);
    this._connector.on('ui-request', this._onUiRequest);
    this._connector.on('ui-event', this._onUiEvent);
  }

  private _unregisterConnectorEvents(): void {
    this._connector.off('device-connect', this._onDeviceConnect);
    this._connector.off('device-disconnect', this._onDeviceDisconnect);
    this._connector.off(DEVICE.FEATURES, this._onSupportFeatures);
    this._connector.off('device-trezor-thp-credentials-changed', this._onThpCredentialsChanged);
    this._connector.off('ui-request', this._onUiRequest);
    this._connector.off('ui-event', this._onUiEvent);
  }

  private _connectorDeviceToDeviceInfo(device: ConnectorDevice): DeviceInfo {
    return {
      vendor: 'trezor',
      model: device.model ?? 'unknown',
      firmwareVersion: 'unknown',
      deviceId: device.deviceId,
      connectId: device.connectId,
      label: device.name,
      // The per-device transport is authoritative (a combined USB+BLE
      // connector tags each discovered device); the connector's own
      // connectionType is only a nominal value, so fall back to it for
      // single-transport connectors that don't tag each device.
      connectionType: device.connectionType ?? this._connector.connectionType,
      capabilities: device.capabilities,
    };
  }

  private _errorToFailure(error: unknown) {
    const typed = error as {
      code?: unknown;
      message?: string;
      recovery?: unknown;
      params?: unknown;
    };
    // Map hwk-trezor-core's string markers to standard HardwareErrorCodes.
    // The core tags pairing-handshake rejections (e.g. mistyped CodeEntry code)
    // with `code: 'ThpPairingFailed'`; surface it as a proper code, not Unknown.
    if (typed.code === 'ThpPairingFailed') {
      return failure(HardwareErrorCode.ThpPairingFailed, typed.message ?? 'THP pairing failed');
    }
    // Only trust a numeric `code` if it is an actual HardwareErrorCode. A raw
    // WebUSB AbortError carries a DOMException `code: 20`, which is NOT one of
    // ours — fall through to message-based mapping (transferOut/USBDevice abort
    // → TransportError) so it surfaces as a recognizable, retryable transport
    // error instead of Unknown.
    const trustedNumericCode =
      typeof typed.code === 'number' && KNOWN_HARDWARE_ERROR_CODES.has(typed.code)
        ? typed.code
        : undefined;
    const code =
      trustedNumericCode ??
      TrezorAdapter._mapTrezorFailureCode(error) ??
      HardwareErrorCode.UnknownError;
    // Origin: trust one already stamped on the error (a thrown HwkError
    // carries the mapper's context knowledge), otherwise fall back to the
    // shared code→origin table — which returns undefined for the genuinely
    // ambiguous codes instead of guessing.
    const stampedOrigin = (error as { origin?: unknown })?.origin;
    const origin =
      stampedOrigin === 'device' || stampedOrigin === 'transport' || stampedOrigin === 'host'
        ? stampedOrigin
        : defaultOriginForCode(code);
    // Carry the thrower's params across the failure boundary. They are how a
    // caller tells apart two situations that share one code - "you plugged in
    // a different Trezor" vs "the bound one is gone" both read as
    // DeviceMismatch otherwise.
    const params =
      typed.params && typeof typed.params === 'object'
        ? (typed.params as Record<string, unknown>)
        : undefined;
    return failure(
      code,
      typed.message ?? String(error),
      params,
      origin,
      isHwkRecoveryHint(typed.recovery) ? typed.recovery : undefined
    );
  }

  /**
   * Emit `REQUEST_DEVICE_PERMISSION` and await the host's
   * `RECEIVE_DEVICE_PERMISSION` reply (60s budget covers OS prompt + user
   * tap). If the host doesn't wire a handler the wait times out and the
   * operation fails fast.
   *
   * Mirrors LedgerAdapter._ensureDevicePermission so hosts can register a
   * single handler that branches by `payload.transportType` (and optionally
   * the active brand) instead of teaching every adapter its own contract.
   *
   *   - no `connectId` → environment-level check (scan / picker)
   *   - with `connectId` → device-level check (per-call gating)
   */
  private async _ensureDevicePermission(
    connectId?: string,
    deviceId?: string,
    requestedTransport?: ConnectionType
  ): Promise<void> {
    // No handler? Skip silently so non-permission-aware hosts (and our own
    // unit tests) keep working — Ledger's adapter has a 60s timeout but
    // hardware-wallet flows on web/desktop don't always have a registered
    // listener, and they shouldn't stall for a minute waiting on one.
    if (!this._emitter.listenerCount(UI_REQUEST.REQUEST_DEVICE_PERMISSION)) {
      return;
    }
    const transportType: TransportType = requestedTransport ?? this.activeTransport ?? 'usb';

    const waitPromise = this._uiRegistry.wait<{ granted: boolean; reason?: string }>(
      UI_REQUEST.REQUEST_DEVICE_PERMISSION,
      { timeoutMs: 60_000 }
    );

    this._emitter.emit(UI_REQUEST.REQUEST_DEVICE_PERMISSION, {
      type: UI_REQUEST.REQUEST_DEVICE_PERMISSION,
      payload: { transportType, connectId, deviceId },
    });

    const { granted } = await waitPromise;
    if (!granted) {
      throw Object.assign(new Error('Device permission denied'), {
        code: HardwareErrorCode.DevicePermissionDenied,
      });
    }
  }
}
