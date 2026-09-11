import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DEVICE_CONNECT_RETRY_DELAY_MS,
  DeviceJobQueue,
  EConnectorInteraction,
  HardwareErrorCode,
  InteractionRegistry,
  SDK,
  TypedEventEmitter,
  UI_REQUEST,
  UI_REQUEST_PREEMPTED_TAG,
  UiRequestRegistry,
  canReplayHardwareMethodAfterTransportFailure,
  createHwkError,
  deriveDeviceFingerprint,
  failure,
  isHardwareInteractionId,
  isHwkRecoveryHint,
  operationMayHaveCompletedParams,
  rehydrateConnectorError,
  requestBleDeviceSelection,
  requestSaveDeviceBinding,
  resolveSearchTargetReusePolicy,
  success,
} from '@onekeyfe/hwk-adapter-core';

import {
  ERROR_TAG,
  isAppNotInstalledError,
  isConnectionLevelError,
  isDeviceDisconnectedError,
  isDeviceLockedError,
  isDeviceNotAdvertisingError,
  isStuckAppStateError,
  isTimeoutError,
  ledgerFailure,
  mapLedgerError,
} from '../errors';
import { createAllNetworkGetAddress } from './methods/allNetworkGetAddress';
import { isLedgerBleConnectionType } from '../utils/ledgerDmkTransport';
import { debugError, debugLog } from '../utils/debugLog';

import type { LedgerInstallAppContext } from './methods/allNetworkGetAddress';
import type { AppMetadata, FirmwareVersion, LedgerDeviceInfo } from '../device-apps/DeviceApps';
import type {
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
  ChainCapability,
  ChainForFingerprint,
  ConnectionTarget,
  ConnectorCallResult,
  ConnectorDevice,
  ConnectorUiEvent,
  DeviceAuthenticityParams,
  DeviceAuthenticityResult,
  DeviceEventListener,
  DeviceInfo,
  DevicePermissionResponse,
  DeviceSearchTarget,
  EvmAddress,
  EvmGetAddressParams,
  EvmSignMsgParams,
  EvmSignTxLedgerParams,
  EvmSignTypedDataParams,
  EvmSignature,
  EvmSignedTx,
  HardwareEvent,
  HardwareEventMap,
  ICommonCallParams,
  IConnector,
  IHardwareCallParams,
  IHardwareCommonCallParams,
  IHardwareConnectionContext,
  IHardwareWallet,
  NullableCallArg,
  Response,
  SearchDevicesOptions,
  SolAddress,
  SolGetAddressParams,
  SolSignMsgParams,
  SolSignTxParams,
  SolSignature,
  SolSignedTx,
  TransportType,
  TronAddress,
  TronGetAddressParams,
  TronSignMsgParams,
  TronSignTxParams,
  TronSignature,
  TronSignedTx,
  UiResponseEvent,
  ZcashFullViewingKey,
  ZcashGetFullViewingKeyParams,
  ZcashGetShieldedAddressParams,
  ZcashShieldedAddress,
} from '@onekeyfe/hwk-adapter-core';

type LedgerConnectionAttempt = ICommonCallParams & {
  bindingReason?: 'manual-rebind';
  bindingSessionId?: string;
  rejectedConnectIds?: Set<string>;
  rejectedConnectId?: string;
  selectedConnection?: { connectId: string; requestId: string };
};

/**
 * Result of `_verifyDeviceFingerprint`.
 *
 * On mismatch carries both the stored (expected) fingerprint and the
 * live (actual) one derived from the physically connected device.
 * Callers turn this into a `DeviceMismatch` failure via `formatDeviceMismatchError`.
 */
type IFingerprintVerifyResult =
  | { success: true }
  | { success: false; expected: string; actual: string };

type ConnectorCallFingerprint = {
  chain: ChainForFingerprint;
  deviceId: string;
  skipFingerprint: boolean;
};

type LedgerCallParams<T> = NullableCallArg<IHardwareCallParams<T>>;

type LedgerCommonParams = NullableCallArg<IHardwareCommonCallParams>;

// Fingerprints are deterministic 16-char hashes of fixed testnet paths,
// not secrets — safe to log.
function formatDeviceMismatchError(expected: string, actual: string): string {
  return `Wrong device: expected ${expected}, got ${actual}`;
}

/**
 * Ledger Bitcoin App constant `MAX_BIP44_ACCOUNT_RECOMMENDED`. Account index >=
 * this triggers `SW_NOT_SUPPORTED (0x6a82)` unless the call sets
 * `display=true`. See app-bitcoin-new src/handler/get_extended_pubkey.c.
 */
const BTC_HIGH_INDEX_THRESHOLD = 100;

function btcAccountIndexFromPath(path: string): number | null {
  const segments = path.replace(/^m\//, '').split('/');
  if (segments.length < 3) return null;
  const accountSeg = segments[2].replace(/['h]$/i, '');
  const accountIndex = parseInt(accountSeg, 10);
  return Number.isFinite(accountIndex) ? accountIndex : null;
}

export class LedgerAdapter implements IHardwareWallet {
  readonly vendor = 'ledger' as const;

  private readonly connector: IConnector;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _interactions = new InteractionRegistry({
    vendor: 'ledger',
    onEnded: (interaction, reason) => {
      const binding = this._pendingInteractionBindings.get(interaction.interactionId);
      if (binding?.selectedConnection?.requestId === this._bindingSelectionRequestId) {
        this._finishBleBinding('cancelled');
      }
      this._pendingInteractionBindings.delete(interaction.interactionId);
      this.emitter.emit(SDK.INTERACTION_ENDED, {
        type: SDK.INTERACTION_ENDED,
        payload: { interactionId: interaction.interactionId, reason },
      });
      if (reason === 'timeout') {
        void this._releaseInteractionConnection(interaction);
      }
    },
  });

  private _discoveredDevices = new Map<string, DeviceInfo>();

  private _sessions = new Map<string, string>();

  private readonly _pendingInteractionBindings = new Map<string, LedgerConnectionAttempt>();

  private readonly _verifiedBleReconnectTargets = new Map<
    string,
    { connectId: string; chain: ChainForFingerprint; fingerprint: string }
  >();

  private readonly _uiRegistry = new UiRequestRegistry();

  // BTC App rejects account index >= 100 unless display=true. Cached per
  // adapter instance: first 100+ path asks the user once via UI request,
  // subsequent 100+ paths in the same session auto-promote silently.
  // The Ledger device itself still requires a per-call confirmation — that's
  // the Ledger app's safety boundary, not ours to bypass.
  private _btcHighIndexConfirmedThisSession = false;

  // Pure FIFO queue. New jobs chain onto the tail and run in order. The
  // queue is intentionally passive: it does not arbitrate, does not ask
  // the user. Callers wanting "interrupt current?" semantics must do so
  // explicitly via `getActiveJob()` + `forceCancelActive()` from the UI
  // layer. USB transports can't read multiple devices in parallel, and
  // BLE-only parallelism isn't worth the coordination cost.
  private readonly _jobQueue: DeviceJobQueue;

  // Runtime relay configuration mutates connector-wide DMK state. Serialize
  // the complete configure → genuine check → clear lifecycle so concurrent
  // callers cannot reset or overwrite each other's one-shot relay.
  private _deviceAuthenticityQueueTail: Promise<void> = Promise.resolve();

  // Shared across concurrent callers — only `cancel()` aborts.
  private _doConnectAbortController: AbortController | null = null;

  // Default for commonParams.autoInstallApp when a call doesn't specify it,
  // so the host can opt the whole adapter in once instead of per call.
  private readonly _defaultAutoInstallApp: boolean;

  private readonly _unsettledConnectorOperations = new Map<string, number>();

  private readonly _connectorIdleWaiters = new Set<() => void>();

  private _resetPromise: Promise<void> | null = null;

  private _stateGeneration = 0;

  private _connectorTeardownTail: Promise<void> = Promise.resolve();

  private _pendingConnectorTeardowns = 0;

  private _activeConnectionType: 'usb' | 'ble' | undefined;

  private _bindingSelectionRequestId: string | undefined;

  private _finishBleBinding(status: 'failed' | 'cancelled'): void {
    const selectionRequestId = this._bindingSelectionRequestId;
    this._bindingSelectionRequestId = undefined;
    if (selectionRequestId)
      this.emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
        type: UI_REQUEST.DEVICE_BINDING_STATUS,
        payload: { selectionRequestId, status },
      });
  }

  private _isBleConnection(): boolean {
    return isLedgerBleConnectionType(this._activeConnectionType ?? this.connector.connectionType);
  }

  constructor(connector: IConnector, options?: { autoInstallApp?: boolean }) {
    this.connector = connector;
    this._defaultAutoInstallApp = options?.autoInstallApp ?? false;
    this._jobQueue = new DeviceJobQueue();
    this.registerEventListeners();
  }

  // Transport
  get activeTransport(): TransportType | null {
    return this._isBleConnection() ? 'ble' : 'hid';
  }

  getAvailableTransports(): TransportType[] {
    if (this.connector.availableTransports) {
      return this.connector.availableTransports.map(transport =>
        transport === 'ble' ? 'ble' : 'hid'
      );
    }
    return this.activeTransport ? [this.activeTransport] : [];
  }

  // Connector is bound at construction; switching requires a new adapter.
  switchTransport(_type: TransportType): Promise<void> {
    return Promise.resolve();
  }

  // Lifecycle
  init(_config?: unknown): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Clear cached device/session state without tearing down the adapter.
   * Call before retrying after errors or when the device state may be stale.
   * The next operation will re-discover and re-connect automatically.
   */
  resetState(): void {
    void this._resetStateAndDisconnectSessions();
  }

  private _resetStateAndDisconnectSessions(): Promise<void> {
    if (this._resetPromise) return this._resetPromise;

    const sessionIds = new Set(this._sessions.values());
    this._stateGeneration += 1;
    this._finishBleBinding('cancelled');
    this._interactions.endAll('runtime-reset');
    this._doConnectAbortController?.abort();
    this._discoveredDevices.clear();
    this._sessions.clear();
    this._verifiedBleReconnectTargets.clear();
    this._connectingPromise = null;
    this._doConnectAbortController = null;
    this._uiRegistry.reset();
    this._jobQueue.clear();
    this._btcHighIndexConfirmedThisSession = false;

    const resetPromise = this._runConnectorTeardown(async () => {
      for (const sessionId of sessionIds) {
        await this.connector.disconnect(sessionId).catch(() => undefined);
      }
    });
    this._resetPromise = resetPromise;
    return resetPromise.finally(() => {
      if (this._resetPromise === resetPromise) {
        this._resetPromise = null;
      }
    });
  }

  async dispose(): Promise<void> {
    await this._resetStateAndDisconnectSessions();
    this.unregisterEventListeners();
    this.connector.reset();
    this.emitter.removeAllListeners();
  }

  uiResponse(response: UiResponseEvent): void {
    this._uiRegistry.resolve(response.type, response.payload);
  }

  // ---------------------------------------------------------------------------
  // Device management
  // ---------------------------------------------------------------------------

  async searchDevices(options?: SearchDevicesOptions): Promise<DeviceInfo[]> {
    return this._searchDevices(options);
  }

  private async _searchDevices(
    options?: SearchDevicesOptions,
    signal?: AbortSignal
  ): Promise<DeviceInfo[]> {
    debugLog('[LedgerAdapter][REQ]', { method: 'searchDevices', params: options });
    try {
      if (options?.resetSession) {
        await this._resetStateAndDisconnectSessions();
      } else {
        await this._connectorTeardownTail;
      }

      await this._ensureDevicePermission(undefined, undefined, signal);
      if (signal) LedgerAdapter._throwIfAborted(signal);
      const stateGeneration = this._stateGeneration;

      const devices = await this.connector.searchDevices(
        options?.transportType
          ? {
              transportType: options.transportType,
              waitForAll: options.waitForAllTransports,
            }
          : undefined
      );
      if (signal) LedgerAdapter._throwIfAborted(signal);
      if (stateGeneration !== this._stateGeneration) {
        throw createHwkError({
          code: HardwareErrorCode.UserAborted,
          message: 'Ledger discovery was reset',
        });
      }

      // Replace cache with this round's raw result. DMK paths used as connectId
      // on USB are ephemeral — incremental writes leave stale entries.
      this._discoveredDevices.clear();
      for (const d of devices) {
        if (d.connectId) {
          this._discoveredDevices.set(d.connectId, this.connectorDeviceToDeviceInfo(d));
        }
      }

      if (this._discoveredDevices.size === 0) {
        await this._ensureDevicePermission(undefined, undefined, signal);
      }

      const result = Array.from(this._discoveredDevices.values());
      debugLog('[LedgerAdapter][RES]', {
        method: 'searchDevices',
        success: true,
        payload: result,
      });
      return result;
    } catch (err) {
      const e = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter][RES]', {
        method: 'searchDevices',
        success: false,
        error: { message: e?.message, _tag: e?._tag, code: e?.code ?? e?.errorCode },
      });
      throw err;
    }
  }

  async searchDeviceTargets(options?: SearchDevicesOptions): Promise<DeviceSearchTarget[]> {
    const devices = await this.searchDevices(options);
    return devices.map(device => ({
      searchTargetId: device.connectId,
      searchTargetReusePolicy: resolveSearchTargetReusePolicy(device),
      vendor: 'ledger',
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

  // USB single-session invariant: evict all sessions, best-effort (see connectDevice).
  private async _evictAllSessions(preserveInteractionId?: string): Promise<void> {
    this._interactions.endAll('explicit', preserveInteractionId);
    if (this._sessions.size === 0) return;
    const stale = [...this._sessions.values()];
    this._sessions.clear();
    await this._runConnectorTeardown(async () => {
      for (const sid of stale) {
        try {
          await this.connector.disconnect(sid);
        } catch {
          // best-effort
        }
      }
    });
  }

  // Layer 2 retry budget after connection-class error. Each round delegates
  // to Layer 1 (which owns the unlock prompt). Layer 2 never emits UI itself.
  private static readonly MAX_BUSINESS_RETRY_BUDGET = 3;

  // Stuck-app (APDU 0x6901) retry pause. Ledger Stax often returns 6901 when
  // OpenAppCommand lands mid-transition right after CloseApp; a short wait
  // lets the device finish its UI animation before we retry once.
  private static readonly STUCK_APP_RETRY_DELAY_MS = 500;

  // Layer 1 confirm budget. After N failed Confirm cycles (user keeps clicking
  // Confirm but device never shows up / never unlocks), throw DeviceNotFound
  // instead of looping forever.
  private static readonly MAX_DOCONNECT_CONFIRMS = 3;

  // Cached cancel reason — used as fallback when signal.reason isn't
  // populated by the runtime (Hermes/RN). Set in cancel(), cleared shortly.
  private _lastCancelReason: Error | undefined;

  private readonly _activeInteractionJobs = new Set<string>();

  private readonly _pendingInteractionDisconnects = new Set<string>();

  // Throttle AppInstallProgress by progress delta — DMK streams much faster
  // than UIs need. Final frame (progress >= 1) always passes.
  private static readonly APP_INSTALL_PROGRESS_MIN_DELTA = 0.05;

  private _installProgressLastEmittedValue = -Infinity;

  private _installProgressLastKey: string | undefined;

  private static _createDeviceBusyError(method: string): Error {
    return Object.assign(new Error(`Ledger device is busy while calling ${method}`), {
      code: HardwareErrorCode.DeviceBusy,
    });
  }

  async connectDevice(searchTargetId: string): Promise<Response<string>> {
    const connected = await this._connectTarget(searchTargetId);
    if (!connected.success) return connected;
    return this._createInteraction(searchTargetId, connected.payload);
  }

  async bindBleDevice(params: BindBleDeviceParams): Promise<Response<string>> {
    if (params.identity.vendor !== 'ledger' || !params.identity.value) {
      return failure(HardwareErrorCode.InvalidParams, 'Ledger wallet identity is required');
    }
    const { chain, value: expectedFingerprint } = params.identity;
    try {
      return await this._jobQueue.enqueue(
        expectedFingerprint,
        async signal => {
          if (!this.getAvailableTransports().includes('ble')) {
            throw createHwkError({
              code: HardwareErrorCode.TransportNotAvailable,
              message: 'Ledger Bluetooth transport is not available',
            });
          }
          this._activeConnectionType = 'ble';
          await this._ensureDevicePermission(undefined, undefined, signal);
          const attempt: LedgerConnectionAttempt = {
            extra: params.extra,
            bindingReason: 'manual-rebind',
          };
          try {
            for (;;) {
              const connectId = await this._connectFirstOrSelect(
                [],
                undefined,
                true,
                undefined,
                attempt,
                signal
              );
              const sessionId = this._sessions.get(connectId);
              if (!sessionId) {
                throw createHwkError({
                  code: HardwareErrorCode.DeviceDisconnected,
                  message: 'Selected Ledger connection ended',
                });
              }
              let saved = false;
              try {
                const installContext: LedgerInstallAppContext = {
                  connection: { connectId, sessionId },
                };
                const fingerprint = await this._computeChainFingerprint(
                  chain,
                  (method, callParams) =>
                    this._runConnectorCall(
                      connectId,
                      method,
                      callParams,
                      signal,
                      undefined,
                      undefined,
                      { autoInstallApp: true },
                      installContext
                    )
                );
                if (fingerprint !== expectedFingerprint) {
                  attempt.rejectedConnectIds ??= new Set();
                  attempt.rejectedConnectIds.add(connectId);
                  attempt.rejectedConnectId = connectId;
                } else {
                  await this._publishVerifiedBleBinding(
                    connectId,
                    chain,
                    fingerprint,
                    attempt,
                    undefined,
                    signal
                  );
                  saved = true;
                  return success(connectId);
                }
              } finally {
                if (!saved && this._sessions.get(connectId) === sessionId) {
                  this._sessions.delete(connectId);
                  const teardown = this._runConnectorTeardown(() =>
                    this.connector.disconnect(sessionId)
                  ).catch(() => undefined);
                  if (!signal.aborted) await teardown;
                }
              }
            }
          } catch (error) {
            this._finishBleBinding(signal.aborted ? 'cancelled' : 'failed');
            throw error;
          }
        },
        {
          label: 'bindBleDevice',
          rejectIfBusy: true,
          busyError: LedgerAdapter._createDeviceBusyError('bindBleDevice'),
        }
      );
    } catch (error) {
      return this.errorToFailure(error);
    }
  }

  async acquireInteraction(
    connectId: string,
    context: IHardwareConnectionContext
  ): Promise<Response<string>> {
    try {
      return await this._jobQueue.enqueue(
        connectId || '__ledger_acquire__',
        async signal => {
          const transport = this._isBleConnection() ? 'ble' : 'usb';
          const hint = context.knownConnections?.find(
            connection => connection.transport === transport
          );
          const target = hint && hint.transport !== 'qr' ? hint.connectId : connectId;
          await this._ensureDevicePermission(target, undefined, signal);
          const attempt: LedgerConnectionAttempt = {
            ...context,
            extra: context.extra ? { ...context.extra } : undefined,
          };
          try {
            const resolvedConnectId = await this.ensureConnected(
              target,
              signal,
              true,
              undefined,
              attempt
            );
            LedgerAdapter._throwIfAborted(signal);
            const result = this._createInteraction(connectId, resolvedConnectId);
            if (result.success && attempt.selectedConnection) {
              this._pendingInteractionBindings.set(result.payload, attempt);
            }
            return result;
          } catch (error) {
            this._finishBleBinding(signal.aborted ? 'cancelled' : 'failed');
            throw error;
          }
        },
        {
          label: 'acquireInteraction',
          rejectIfBusy: true,
          busyError: LedgerAdapter._createDeviceBusyError('acquireInteraction'),
        }
      );
    } catch (error) {
      return this.errorToFailure(error);
    }
  }

  private _createInteraction(searchTargetId: string, resolvedConnectId: string): Response<string> {
    this._interactions.endByConnectionKey(resolvedConnectId, 'explicit');
    const sessionId = this._sessions.get(resolvedConnectId);
    if (sessionId) this._interactions.endByConnectionKey(sessionId, 'explicit');
    const device = this._discoveredDevices.get(resolvedConnectId) ?? {
      vendor: 'ledger' as const,
      model: 'unknown',
      firmwareVersion: '',
      deviceId: '',
      connectId: resolvedConnectId,
      connectionType: this.connector.connectionType,
    };
    const interaction = this._interactions.create({
      searchTargetId,
      connectId: resolvedConnectId,
      device,
      connectionKeys: [this._sessions.get(resolvedConnectId) ?? ''],
    });
    return success(interaction.interactionId);
  }

  private async _connectTarget(
    connectId: string,
    preserveInteractionId?: string,
    signal?: AbortSignal
  ): Promise<Response<string>> {
    debugLog('[LedgerAdapter][REQ]', { method: 'connectDevice', connectId, params: { connectId } });
    try {
      this._assertConnectorReady('connectDevice');
      const discoveredType = this._discoveredDevices.get(connectId)?.connectionType;
      if (discoveredType === 'usb' || discoveredType === 'ble') {
        this._activeConnectionType = discoveredType;
      }
      if (this._isBleConnection() && !connectId) {
        throw Object.assign(new Error('Ledger BLE connectId is required.'), {
          code: HardwareErrorCode.DeviceNotFound,
        });
      }

      await this._ensureDevicePermission(connectId, undefined, signal);
      if (signal) LedgerAdapter._throwIfAborted(signal);

      // A new explicit selection owns a fresh interaction. Retire any session
      // that could otherwise let an older interaction id reach the new one.
      if (this.connector.availableTransports && this.connector.availableTransports.length > 1) {
        await this._evictAllSessions(preserveInteractionId);
      } else if (this._isBleConnection()) {
        const previousSessionId = this._sessions.get(connectId);
        this._interactions.endByConnectionKey(connectId, 'explicit', preserveInteractionId);
        if (previousSessionId) {
          this._interactions.endByConnectionKey(
            previousSessionId,
            'explicit',
            preserveInteractionId
          );
          this._sessions.delete(connectId);
          await this.connector.disconnect(previousSessionId).catch(() => undefined);
        }
      } else {
        await this._evictAllSessions(preserveInteractionId);
      }
      if (signal) LedgerAdapter._throwIfAborted(signal);

      const stateGeneration = this._stateGeneration;
      const releaseOperation = this._retainConnectorOperation(`connect:${connectId}`);
      let session: Awaited<ReturnType<IConnector['connect']>>;
      try {
        session = this.connector.availableTransports?.length
          ? await this.connector.connect(connectId, {
              transportType: this._activeConnectionType ?? 'usb',
            })
          : await this.connector.connect(connectId);
        if (signal?.aborted || stateGeneration !== this._stateGeneration) {
          await this.connector.disconnect(session.sessionId).catch(() => undefined);
          throw Object.assign(new Error('Ledger connection aborted'), {
            code: HardwareErrorCode.UserAborted,
          });
        }
      } finally {
        releaseOperation();
      }
      const resolvedConnectId = session.deviceInfo?.connectId || connectId;
      this._sessions.set(resolvedConnectId, session.sessionId);

      if (session.deviceInfo) {
        this._discoveredDevices.set(resolvedConnectId, session.deviceInfo);
      }

      const result = success(resolvedConnectId);
      debugLog('[LedgerAdapter][RES]', { method: 'connectDevice', success: true, payload: result });
      return result;
    } catch (err) {
      const failureResult = this.errorToFailure<string>(err);
      debugLog('[LedgerAdapter][RES]', {
        method: 'connectDevice',
        success: false,
        payload: failureResult,
      });
      return failureResult;
    }
  }

  async releaseInteraction(interactionId: string): Promise<void> {
    const interaction = this._interactions.find(interactionId);
    if (!interaction) {
      this._interactions.resolve(interactionId);
      return;
    }
    const endedInteraction = this._interactions.end(interactionId, 'explicit');
    if (!endedInteraction) return;
    const { connectId } = interaction;
    debugLog('[LedgerAdapter][REQ]', {
      method: 'releaseInteraction',
      connectId,
      params: { connectId },
    });
    try {
      await this._releaseInteractionConnection(endedInteraction);
      debugLog('[LedgerAdapter][RES]', { method: 'releaseInteraction', success: true });
    } catch (err) {
      const e = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter][RES]', {
        method: 'releaseInteraction',
        success: false,
        error: { message: e?.message, _tag: e?._tag, code: e?.code ?? e?.errorCode },
      });
      throw err;
    }
  }

  private async _releaseInteractionConnection(
    interaction: NonNullable<ReturnType<InteractionRegistry['find']>>
  ): Promise<void> {
    const sessionIds = new Set<string>();
    for (const [connectId, sessionId] of this._sessions) {
      if (
        connectId === interaction.connectId ||
        interaction.connectionKeys.includes(connectId) ||
        interaction.connectionKeys.includes(sessionId)
      ) {
        this._sessions.delete(connectId);
        sessionIds.add(sessionId);
      }
    }
    for (const sessionId of sessionIds) {
      await this._runConnectorTeardown(() =>
        this.connector.disconnect(sessionId).catch(() => undefined)
      );
    }
  }

  private async _releaseLostInteractionConnection(interactionId: string): Promise<void> {
    const endedInteraction = this._interactions.end(interactionId, 'disconnect');
    if (!endedInteraction) return;
    this._discoveredDevices.delete(endedInteraction.connectId);
    await this._releaseInteractionConnection(endedInteraction);
  }

  async getDeviceInfo(
    connectIdOrInteractionId: string,
    deviceId: string
  ): Promise<Response<DeviceInfo>> {
    let connectId: string;
    try {
      connectId = isHardwareInteractionId(connectIdOrInteractionId)
        ? this._interactions.resolve(connectIdOrInteractionId).connectId
        : connectIdOrInteractionId;
    } catch (error) {
      return this.errorToFailure<DeviceInfo>(error);
    }
    debugLog('[LedgerAdapter][REQ]', {
      method: 'getDeviceInfo',
      connectId,
      params: { connectId, deviceId },
    });
    try {
      await this._ensureDevicePermission(connectId, deviceId);

      // Look up the device in the cache populated by event handlers / searchDevices.
      // Try connectId first (the USB path), then fall back to scanning by deviceId.
      const cached =
        this._discoveredDevices.get(connectId) ??
        Array.from(this._discoveredDevices.values()).find(d => d.deviceId === deviceId);

      if (cached) {
        const result = success(cached);
        debugLog('[LedgerAdapter][RES]', {
          method: 'getDeviceInfo',
          success: true,
          payload: result,
        });
        return result;
      }

      const notFound = failure(
        HardwareErrorCode.DeviceNotFound,
        'Device not found in cache. Call searchDevices() or wait for a device-connected event first.'
      );
      debugLog('[LedgerAdapter][RES]', {
        method: 'getDeviceInfo',
        success: false,
        payload: notFound,
      });
      return notFound;
    } catch (err) {
      const e = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter][RES]', {
        method: 'getDeviceInfo',
        success: false,
        error: { message: e?.message, _tag: e?._tag, code: e?.code ?? e?.errorCode },
      });
      throw err;
    }
  }

  getSupportedChains(): ChainCapability[] {
    return ['evm', 'btc', 'sol', 'tron', 'zcash'];
  }

  allNetworkGetAddress = createAllNetworkGetAddress({
    callChain: this.callChain.bind(this),
    getChainFingerprint: async (connectId, chain, context) => {
      try {
        const fingerprint = await this._computeChainFingerprint(chain, (method, params) =>
          this.connectorCall(connectId, method, params, undefined, undefined, undefined, context)
        );
        return success(fingerprint);
      } catch (error) {
        return this.errorToFailure<string>(error);
      }
    },
    retainInteraction: interactionId => this._interactions.retain(interactionId),
    errorToFailure: <T>(error: unknown) => this.errorToFailure<T>(error),
  });

  // ---------------------------------------------------------------------------
  // Chain call helper
  // ---------------------------------------------------------------------------

  private async callChain<T>(
    connectId: string,
    deviceId: string,
    chain: string,
    method: string,
    params: unknown,
    commonParams?: ICommonCallParams,
    skipFingerprint = false,
    installContext?: LedgerInstallAppContext
  ): Promise<Response<T>> {
    try {
      const result = await this.connectorCall(
        connectId,
        method,
        params,
        {
          chain: chain as ChainForFingerprint,
          deviceId,
          skipFingerprint,
        },
        undefined,
        commonParams,
        installContext
      );
      return success(result as T);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  private static normalizeCallArgs(
    connectId: NullableCallArg<string>,
    deviceId: NullableCallArg<string>,
    params: NullableCallArg<unknown>
  ): {
    connectId: string;
    deviceId: string;
    params: unknown;
  } {
    return {
      connectId: connectId ?? '',
      deviceId: deviceId ?? '',
      params: params ?? {},
    };
  }

  private static splitCommonParams(params: unknown): {
    commonParams: ICommonCallParams;
    rest: unknown;
  } {
    if (params && typeof params === 'object') {
      const {
        autoInstallApp,
        interactionId,
        passphraseState: _passphraseState,
        useEmptyPassphrase: _useEmptyPassphrase,
        knownConnections,
        extra,
        allowDeviceSelection,
        ...rest
      } = params as Record<string, unknown>;
      return {
        commonParams: {
          autoInstallApp: typeof autoInstallApp === 'boolean' ? autoInstallApp : undefined,
          interactionId: typeof interactionId === 'string' ? interactionId : undefined,
          knownConnections: knownConnections as ICommonCallParams['knownConnections'],
          extra: extra as ICommonCallParams['extra'],
          allowDeviceSelection:
            typeof allowDeviceSelection === 'boolean' ? allowDeviceSelection : undefined,
        },
        rest,
      };
    }
    return { commonParams: {}, rest: params ?? {} };
  }

  private callChainWithMergedParams<T>(
    connectId: NullableCallArg<string>,
    deviceId: NullableCallArg<string>,
    chain: ChainForFingerprint,
    method: string,
    params: NullableCallArg<unknown>
  ): Promise<Response<T>> {
    const normalized = LedgerAdapter.normalizeCallArgs(connectId, deviceId, params);
    const { commonParams, rest } = LedgerAdapter.splitCommonParams(normalized.params);
    return this.callChain<T>(
      normalized.connectId,
      normalized.deviceId,
      chain,
      method,
      rest,
      commonParams
    );
  }

  // ---------------------------------------------------------------------------
  // EVM chain methods
  // ---------------------------------------------------------------------------

  evmGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<EvmGetAddressParams>
  ) {
    return this.callChainWithMergedParams<EvmAddress>(
      connectId,
      deviceId,
      'evm',
      'evmGetAddress',
      params
    );
  }

  evmSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<EvmSignTxLedgerParams>
  ) {
    return this.callChainWithMergedParams<EvmSignedTx>(
      connectId,
      deviceId,
      'evm',
      'evmSignTransaction',
      params
    );
  }

  evmSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<EvmSignMsgParams>
  ) {
    return this.callChainWithMergedParams<EvmSignature>(
      connectId,
      deviceId,
      'evm',
      'evmSignMessage',
      params
    );
  }

  evmSignTypedData(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<EvmSignTypedDataParams>
  ) {
    return this.callChainWithMergedParams<EvmSignature>(
      connectId,
      deviceId,
      'evm',
      'evmSignTypedData',
      params
    );
  }

  // ---------------------------------------------------------------------------
  // BTC chain methods
  // ---------------------------------------------------------------------------

  btcGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<BtcGetAddressParams>
  ) {
    return this.callChainWithMergedParams<BtcAddress>(
      connectId,
      deviceId,
      'btc',
      'btcGetAddress',
      params
    );
  }

  btcGetPublicKey(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<BtcGetPublicKeyParams>
  ) {
    return this.callChainWithMergedParams<BtcPublicKey>(
      connectId,
      deviceId,
      'btc',
      'btcGetPublicKey',
      params
    );
  }

  btcSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<BtcSignTxParams>
  ) {
    return this.callChainWithMergedParams<BtcSignedTx>(
      connectId,
      deviceId,
      'btc',
      'btcSignTransaction',
      params
    );
  }

  btcSignPsbt(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<BtcSignPsbtParams>
  ) {
    return this.callChainWithMergedParams<BtcSignedPsbt>(
      connectId,
      deviceId,
      'btc',
      'btcSignPsbt',
      params
    );
  }

  btcSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<BtcSignMsgParams>
  ) {
    return this.callChainWithMergedParams<BtcSignature>(
      connectId,
      deviceId,
      'btc',
      'btcSignMessage',
      params
    );
  }

  btcGetMasterFingerprint(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCommonParams
  ) {
    return this.callChainWithMergedParams<{ masterFingerprint: string }>(
      connectId,
      deviceId,
      'btc',
      'btcGetMasterFingerprint',
      params
    );
  }

  // ---------------------------------------------------------------------------
  // SOL chain methods
  // ---------------------------------------------------------------------------

  solGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<SolGetAddressParams>
  ) {
    return this.callChainWithMergedParams<SolAddress>(
      connectId,
      deviceId,
      'sol',
      'solGetAddress',
      params
    );
  }

  solSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<SolSignTxParams>
  ) {
    return this.callChainWithMergedParams<SolSignedTx>(
      connectId,
      deviceId,
      'sol',
      'solSignTransaction',
      params
    );
  }

  solSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<SolSignMsgParams>
  ) {
    return this.callChainWithMergedParams<SolSignature>(
      connectId,
      deviceId,
      'sol',
      'solSignMessage',
      params
    );
  }

  // ---------------------------------------------------------------------------
  // TRON chain methods
  // ---------------------------------------------------------------------------

  tronGetAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<TronGetAddressParams>
  ) {
    return this.callChainWithMergedParams<TronAddress>(
      connectId,
      deviceId,
      'tron',
      'tronGetAddress',
      params
    );
  }

  tronSignTransaction(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<TronSignTxParams>
  ) {
    return this.callChainWithMergedParams<TronSignedTx>(
      connectId,
      deviceId,
      'tron',
      'tronSignTransaction',
      params
    );
  }

  tronSignMessage(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<TronSignMsgParams>
  ) {
    return this.callChainWithMergedParams<TronSignature>(
      connectId,
      deviceId,
      'tron',
      'tronSignMessage',
      params
    );
  }

  // ---------------------------------------------------------------------------
  // Zcash chain methods (viewing key + shielded address reads; Zcash app >= 3.8.0)
  // ---------------------------------------------------------------------------

  zcashGetFullViewingKey(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<ZcashGetFullViewingKeyParams>
  ) {
    return this.callChainWithMergedParams<ZcashFullViewingKey>(
      connectId,
      deviceId,
      'zcash',
      'zcashGetFullViewingKey',
      params
    );
  }

  zcashGetShieldedAddress(
    connectId?: string | null,
    deviceId?: string | null,
    params?: LedgerCallParams<ZcashGetShieldedAddressParams>
  ) {
    return this.callChainWithMergedParams<ZcashShieldedAddress>(
      connectId,
      deviceId,
      'zcash',
      'zcashGetShieldedAddress',
      params
    );
  }

  // ---------------------------------------------------------------------------
  // App management — OS-level Ledger app install / list. Bypasses fingerprint
  // and chain-handler dispatch; installApp progress is forwarded to the adapter
  // emitter via 'ui-event' AppInstallProgress events.
  // ---------------------------------------------------------------------------

  async installApp(connectId: string, appName: string): Promise<Response<void>> {
    try {
      // Progress is emitted from the connector via a 'ui-event'
      // AppInstallProgress variant (see uiEventForwarder); no callback is
      // passed here so installApp params stay fully serializable across
      // IHardwareBridge.
      await this.connectorCall(connectId, 'installApp', { appName });
      return success(undefined);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  async listInstalledApps(connectId: string): Promise<Response<AppMetadata[]>> {
    try {
      const result = await this.connectorCall(connectId, 'listInstalledApps', {});
      return success(result as AppMetadata[]);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  // Offline app-presence + unlock probe. No manager-api catalog (unlike listInstalledApps).
  async listInstalledNames(connectId: string): Promise<Response<string[]>> {
    try {
      const result = await this.connectorCall(connectId, 'listInstalledNames', {});
      return success(result as string[]);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  async listAvailableApps(connectId: string): Promise<Response<AppMetadata[]>> {
    try {
      const result = await this.connectorCall(connectId, 'listAvailableApps', {});
      return success(result as AppMetadata[]);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  async getLedgerFirmwareVersion(connectId: string): Promise<Response<FirmwareVersion>> {
    try {
      const result = await this.connectorCall(connectId, 'getFirmwareVersion', {});
      return success(result as FirmwareVersion);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  async getLedgerDeviceInfo(connectId: string): Promise<Response<LedgerDeviceInfo>> {
    try {
      const result = await this.connectorCall(connectId, 'getDeviceInfo', {});
      return success(result as LedgerDeviceInfo);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  /**
   * Runs Ledger's official genuine check (DMK GenuineCheckDeviceAction) over the
   * SAME secure-channel backend as app install
   * (wss://scriptrunner.api.live.ledger.com/update/genuine). It returns Ledger's
   * HSM verdict (`verified`) and a stable per-device id = sha3-256 of the device
   * attestation public key, which DMK reads inside that session. The id survives
   * wipe/recovery and cannot be forged from a seed.
   *
   * Requires network access to Ledger's backend and an on-device
   * "Allow secure connection" confirmation the first time.
   */
  async verifyDeviceAuthenticity(
    connectId: string,
    params: DeviceAuthenticityParams = {}
  ): Promise<Response<DeviceAuthenticityResult>> {
    const waitForPrevious = this._deviceAuthenticityQueueTail;
    let releaseQueue: () => void = () => undefined;
    this._deviceAuthenticityQueueTail = new Promise<void>(resolve => {
      releaseQueue = resolve;
    });
    await waitForPrevious;
    try {
      return await this._verifyDeviceAuthenticityExclusive(connectId, params);
    } finally {
      releaseQueue();
    }
  }

  private async _verifyDeviceAuthenticityExclusive(
    connectId: string,
    params: DeviceAuthenticityParams
  ): Promise<Response<DeviceAuthenticityResult>> {
    const relayUrl = params.ledgerGenuineCheckWebSocketUrl;
    try {
      if (relayUrl) {
        if (!this.connector.configure) {
          return failure(
            HardwareErrorCode.MethodNotSupported,
            'This Ledger connector does not support genuine-check relay configuration'
          );
        }
        await this.connector.configure({ ledgerGenuineCheckWebSocketUrl: relayUrl });
        await this._resetStateAndDisconnectSessions();
      }
      const result = (await this.connectorCall(connectId, 'getDeviceGenuineCheck', {})) as {
        isGenuine: boolean;
        deviceId?: string;
      };
      if (!result.isGenuine) {
        return success({
          vendor: 'ledger' as const,
          verified: false,
        });
      }
      if (!result.deviceId) {
        // The genuine verdict came back, but DMK did not surface a deviceId
        // (server did not drive GET CERTIFICATE, or the certificate failed to
        // parse). Without an id there is nothing to record for accounting.
        return failure(
          HardwareErrorCode.UnknownError,
          `Genuine check completed (isGenuine=${result.isGenuine}) but no deviceId was captured`
        );
      }
      return success({
        vendor: 'ledger' as const,
        verified: result.isGenuine,
        deviceId: result.deviceId,
      });
    } catch (err) {
      return this.errorToFailure(err);
    } finally {
      if (relayUrl) {
        try {
          await this.connector.configure?.({ ledgerGenuineCheckWebSocketUrl: undefined });
          await this._resetStateAndDisconnectSessions();
        } catch {
          // Fail safe: reset() also clears the one-shot relay URL in connectors
          // that implement runtime relay configuration.
          this.connector.reset();
          await this._resetStateAndDisconnectSessions();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  on(event: string, listener: DeviceEventListener): void;

  on(event: string, listener: (event: HardwareEvent) => void): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  off(event: string, listener: DeviceEventListener): void;

  off(event: string, listener: (event: HardwareEvent) => void): void {
    this.emitter.off(event, listener);
  }

  cancel(connectId?: string): void {
    const userAbortReason = Object.assign(new Error('User aborted operation'), {
      code: HardwareErrorCode.UserAborted,
      _tag: ERROR_TAG.UserAborted,
    });

    // Hermes/RN polyfills don't always populate signal.reason from
    // abortController.abort(reason). Cache the reason here so _abortable
    // can fall back to it. Cleared after a short window so a stale reason
    // can't taint an unrelated abort later.
    this._lastCancelReason = userAbortReason;
    setTimeout(() => {
      if (this._lastCancelReason === userAbortReason) {
        this._lastCancelReason = undefined;
      }
    }, 2000);

    this._uiRegistry.cancel();
    this._finishBleBinding('cancelled');

    const activeJobId = this._jobQueue.getActiveJob()?.deviceId;
    let interactionId: string | undefined;
    if (isHardwareInteractionId(connectId)) {
      interactionId = connectId;
    } else if (!connectId && isHardwareInteractionId(activeJobId)) {
      interactionId = activeJobId;
    }
    let resolvedConnectId = connectId;
    if (interactionId) {
      try {
        resolvedConnectId = this._interactions.resolve(interactionId).connectId;
      } catch {
        resolvedConnectId = undefined;
      }
    }

    const interactionForPhysicalId =
      !interactionId && connectId
        ? this._interactions.findActiveByConnectionKey(connectId)
        : undefined;
    const queueKey =
      interactionId ??
      (activeJobId === connectId ? connectId : interactionForPhysicalId?.interactionId) ??
      connectId;

    const pendingInteractionId = interactionId ?? interactionForPhysicalId?.interactionId;
    if (!connectId) this._pendingInteractionBindings.clear();
    else if (pendingInteractionId) {
      this._pendingInteractionBindings.delete(pendingInteractionId);
    }

    // No-connectId path collateral-cancels concurrent silent jobs (known
    // limitation; needs per-job foreground flag to fix).
    if (queueKey) {
      this._jobQueue.cancelActiveAndPending(queueKey, userAbortReason);
    } else {
      this._jobQueue.cancelActiveAndPending(undefined, userAbortReason);
    }

    if (resolvedConnectId) {
      const sessionId = this._sessions.get(resolvedConnectId) ?? resolvedConnectId;
      void this.connector.cancel(sessionId);
    } else {
      for (const sid of this._sessions.values()) void this.connector.cancel(sid);
    }

    // Snapshot guard: only abort if connect is actually in flight (avoids
    // hitting a NEW controller from a restart between resolve and re-entry).
    if (this._connectingPromise) {
      this._doConnectAbortController?.abort(userAbortReason);
    }
  }

  // ---------------------------------------------------------------------------
  // Chain fingerprint
  // ---------------------------------------------------------------------------

  /** A non-empty deviceId is an expected chain fingerprint, not a transport identifier. */
  async getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>> {
    try {
      const fingerprint = await this._computeChainFingerprint(chain, (method, params) =>
        this.connectorCall(connectId, method, params, undefined, deviceId)
      );
      if (deviceId) {
        if (fingerprint !== deviceId) {
          return failure(
            HardwareErrorCode.DeviceMismatch,
            formatDeviceMismatchError(deviceId, fingerprint)
          );
        }
        if (isHardwareInteractionId(connectId)) {
          const interaction = this._interactions.resolve(connectId);
          await this._publishVerifiedBleBinding(
            interaction.connectId,
            chain,
            fingerprint,
            undefined,
            connectId
          );
        }
      }
      return success(fingerprint);
    } catch (err) {
      debugError('[LedgerAdapter] getChainFingerprint error:', chain, err);
      return this.errorToFailure(err);
    }
  }

  /** Discovery may select a BLE target before a later call verifies its wallet. */
  private async _publishVerifiedBleBinding(
    connectId: string,
    chain: ChainForFingerprint,
    fingerprint: string,
    attempt?: LedgerConnectionAttempt,
    interactionId?: string,
    signal?: AbortSignal
  ): Promise<void> {
    const binding = interactionId ? this._pendingInteractionBindings.get(interactionId) : attempt;
    if (!this._isBleConnection() || binding?.selectedConnection?.connectId !== connectId) return;
    try {
      await requestSaveDeviceBinding(
        this.emitter,
        this._uiRegistry,
        {
          selectionRequestId: binding.selectedConnection.requestId,
          connection: { transport: 'ble', connectId },
          identity: { vendor: 'ledger', type: 'chainFingerprint', chain, value: fingerprint },
          extra: binding.extra,
        },
        signal
      );
      if (interactionId) this._interactions.resolve(interactionId);
    } catch (error) {
      if (interactionId) {
        this._pendingInteractionBindings.delete(interactionId);
        this._interactions.end(interactionId, 'explicit');
      }
      const sessionId = this._sessions.get(connectId);
      this._sessions.delete(connectId);
      if (sessionId) {
        const teardown = this._runConnectorTeardown(() =>
          this.connector.disconnect(sessionId)
        ).catch(() => undefined);
        if (!signal?.aborted) await teardown;
      }
      throw error;
    } finally {
      if (this._bindingSelectionRequestId === binding.selectedConnection.requestId) {
        this._bindingSelectionRequestId = undefined;
      }
      if (interactionId) {
        this._pendingInteractionBindings.delete(interactionId);
      }
    }
  }

  /** Verify on the acquired session without re-entering the job queue. */
  private async _verifyDeviceFingerprintWithSession(
    sessionId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<IFingerprintVerifyResult> {
    if (!deviceId) return { success: true };

    const fingerprint = await this._computeChainFingerprint(chain, (method, params) =>
      this._callConnector(sessionId, method, params)
    );
    if (fingerprint === deviceId) {
      return { success: true };
    }
    return { success: false, expected: deviceId, actual: fingerprint };
  }

  /**
   * Compute the chain fingerprint via a caller-supplied call strategy.
   *
   * Chains with a native device-side identity primitive (BTC → BIP32 master
   * fingerprint) short-circuit at the top and return it verbatim, so the value
   * stays reusable for higher-level use (BIP380 descriptors, PSBT signing).
   *
   * All other chains derive a fixed-path address and run it through
   * `deriveDeviceFingerprint` to produce an opaque seed identifier.
   *
   * The two callers (`getChainFingerprint` / `_verifyDeviceFingerprintWithSession`)
   * differ only in the underlying call mechanism, which is injected as `callMethod`
   * to avoid queue deadlocks when running inside `connectorCall`.
   */
  private async _computeChainFingerprint(
    chain: ChainForFingerprint,
    callMethod: (method: string, params: unknown) => Promise<unknown>
  ): Promise<string> {
    // BTC: dedicated device call returns the BIP32 master fingerprint already
    // in the canonical 8-hex form — no further hashing.
    if (chain === 'btc') {
      const result = (await callMethod('btcGetMasterFingerprint', {})) as {
        masterFingerprint: string;
      };
      return result.masterFingerprint;
    }

    const path = CHAIN_FINGERPRINT_PATHS[chain];
    let address: string;
    if (chain === 'evm') {
      // Lowercase per deriveDeviceFingerprint's canonical-form contract.
      address = (
        (await callMethod('evmGetAddress', { path, showOnDevice: false })) as {
          address: string;
        }
      ).address.toLowerCase();
    } else if (chain === 'sol') {
      address = (
        (await callMethod('solGetAddress', { path, showOnDevice: false })) as {
          address: string;
        }
      ).address;
    } else if (chain === 'tron') {
      address = (
        (await callMethod('tronGetAddress', { path, showOnDevice: false })) as {
          address: string;
        }
      ).address;
    } else if (chain === 'zcash') {
      address = (
        (await callMethod('zcashGetShieldedAddress', { path, showOnDevice: false })) as {
          address: string;
        }
      ).address;
    } else {
      throw new Error(`Unsupported chain for fingerprint: ${chain as string}`);
    }

    return deriveDeviceFingerprint(address);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Ensure at least one device is connected and return a valid connectId.
   *
   * - If a session already exists for the given connectId, reuse it.
   * - If ANY session exists (Ledger IDs are ephemeral), reuse it.
   * - Otherwise: search → one USB device auto-connects; multiple asks the host to choose.
   */
  // Mutex for ensureConnected — prevents concurrent calls from establishing duplicate connections
  private _connectingPromise: Promise<string> | null = null;

  // Ledger WebUSB won't expose a locked device, so we can't auto-detect unlock.
  // The user must press Confirm after unlocking, which triggers a search retry.
  // If `signal` is provided, an abort cancels the pending UI request so the
  // registry slot is released and a stale RECEIVE_DEVICE_CONNECT won't land in
  // a future request.
  private async _waitForDeviceConnect(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      LedgerAdapter._throwIfAborted(signal);
    }

    // Register the wait FIRST. A synchronous consumer that calls `uiResponse`
    // inside the emit handler would otherwise resolve before the registry
    // slot exists, and the response would be silently dropped (see
    // UiRequestRegistry.resolve early-return on missing entry).
    const waitPromise = this._uiRegistry.wait<{ confirmed: boolean }>(
      UI_REQUEST.REQUEST_DEVICE_CONNECT
    );

    this.emitter.emit(UI_REQUEST.REQUEST_DEVICE_CONNECT, {
      type: UI_REQUEST.REQUEST_DEVICE_CONNECT,
      payload: {
        vendor: 'ledger',
        reason: 'device-not-found',
        message: 'Please connect and unlock your Ledger device',
      },
    });

    let payload: { confirmed: boolean } | undefined;
    try {
      if (signal) {
        const onAbort = () => {
          this._uiRegistry.cancel(UI_REQUEST.REQUEST_DEVICE_CONNECT);
        };
        signal.addEventListener('abort', onAbort, { once: true });
        try {
          payload = await waitPromise;
        } finally {
          signal.removeEventListener('abort', onAbort);
        }
      } else {
        payload = await waitPromise;
      }
    } catch (err) {
      // External cancel (signal abort / jobQueue cancel) — app's atom may
      // still be set, so signal it to drop the dialog.
      this.emitter.emit(UI_REQUEST.CLOSE_UI_WINDOW, {
        type: UI_REQUEST.CLOSE_UI_WINDOW,
        payload: {},
      });
      // Re-tag as UserAborted so upstream classifiers stop the batch.
      throw Object.assign(new Error('User cancelled Ledger connection'), {
        _tag: ERROR_TAG.UserAborted,
        code: HardwareErrorCode.UserAborted,
        cause: err,
      });
    }

    if (!payload?.confirmed) {
      throw Object.assign(new Error('User cancelled Ledger connection'), {
        _tag: ERROR_TAG.UserAborted,
        code: HardwareErrorCode.UserAborted,
      });
    }

    // BLE peripheral needs a moment to settle after user unlocks the device.
    // Without this delay, the immediate searchDevices() following Confirm
    // often returns 0, forcing another loop iteration.
    await new Promise<void>(resolve => {
      setTimeout(resolve, 800);
    });
  }

  /**
   * Decide whether a BTC pubkey call needs `showOnDevice=true` because of
   * the BTC App's account-index policy, asking the user once per session.
   *
   * Returns the params to pass through (with `showOnDevice` possibly
   * promoted), or `null` if the user declined.
   */
  private async _gateBtcHighIndex(
    params: BtcGetPublicKeyParams
  ): Promise<BtcGetPublicKeyParams | null> {
    const accountIndex = btcAccountIndexFromPath(params.path);
    if (params.showOnDevice) return params;
    if (accountIndex === null || accountIndex < BTC_HIGH_INDEX_THRESHOLD) {
      return params;
    }
    if (this._btcHighIndexConfirmedThisSession) {
      return { ...params, showOnDevice: true };
    }
    const confirmed = await this._waitForBtcHighIndexConfirm(params.path, accountIndex);
    if (!confirmed) return null;
    this._btcHighIndexConfirmedThisSession = true;
    return { ...params, showOnDevice: true };
  }

  private async _waitForBtcHighIndexConfirm(path: string, accountIndex: number): Promise<boolean> {
    // Register the wait FIRST. A synchronous consumer that calls `uiResponse`
    // inside the emit handler would otherwise resolve before the registry
    // slot exists, and the response would be silently dropped (see
    // UiRequestRegistry.resolve early-return on missing entry).
    const waitPromise = this._uiRegistry.wait<{ confirmed: boolean }>(
      UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM
    );

    this.emitter.emit(UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM, {
      type: UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM,
      payload: {
        vendor: 'ledger',
        path,
        accountIndex,
      },
    });

    try {
      const payload = await waitPromise;
      return !!payload?.confirmed;
    } catch (err) {
      this.emitter.emit(UI_REQUEST.CLOSE_UI_WINDOW, {
        type: UI_REQUEST.CLOSE_UI_WINDOW,
        payload: {},
      });
      return false;
    }
  }

  // Ask the user whether to install a missing app (autoInstallApp flow).
  // Same register-then-emit ordering as the BTC high-index gate.
  private async _waitForInstallAppConfirm(appName: string): Promise<boolean> {
    const waitPromise = this._uiRegistry.wait<{ confirmed: boolean }>(
      UI_REQUEST.REQUEST_INSTALL_APP
    );

    this.emitter.emit(UI_REQUEST.REQUEST_INSTALL_APP, {
      type: UI_REQUEST.REQUEST_INSTALL_APP,
      payload: { vendor: 'ledger', appName },
    });

    try {
      const payload = await waitPromise;
      return !!payload?.confirmed;
    } catch (err) {
      this.emitter.emit(UI_REQUEST.CLOSE_UI_WINDOW, {
        type: UI_REQUEST.CLOSE_UI_WINDOW,
        payload: {},
      });
      return false;
    }
  }

  // Layer 1 entry. Caller signal only races the outer awaiter; the shared
  // `_doConnect` runs under its own internal controller so caller A's cancel
  // doesn't kill caller B's await.
  private async ensureConnected(
    connectId: string | undefined,
    signal: AbortSignal,
    allowUsbEphemeralFallback = false,
    preserveInteractionId?: string,
    context?: LedgerConnectionAttempt
  ): Promise<string> {
    if (signal.aborted) LedgerAdapter._throwIfAborted(signal);
    this._assertConnectorReady('connectDevice');

    if (this._isBleConnection() && !connectId && !allowUsbEphemeralFallback) {
      throw Object.assign(new Error('Ledger BLE connectId is required.'), {
        code: HardwareErrorCode.DeviceNotFound,
      });
    }

    if (connectId && this._sessions.has(connectId)) return connectId;
    // Ambient fallback only when the caller gave no target. On an explicit
    // connectId miss, re-resolve THAT device via _doConnect — never route to
    // the first session entry (a stale entry for B once made A's calls hit B).
    if (!connectId && this._sessions.size > 0) {
      // Fail loud rather than route to a wrong device; connectDevice evicts
      // first, so size>1 here should be impossible.
      if (!this._isBleConnection() && this._sessions.size > 1) {
        throw Object.assign(
          new Error(
            'Ledger USB session invariant violated: more than one session is active. Please reconnect the device.'
          ),
          { code: HardwareErrorCode.DeviceOneDeviceOnly }
        );
      }
      return this._sessions.keys().next().value as string;
    }

    if (!this._connectingPromise || this._doConnectAbortController?.signal.aborted) {
      const controller = new AbortController();
      this._doConnectAbortController = controller;
      const innerSignal = controller.signal;
      this._connectingPromise = (async () => {
        try {
          return await this._doConnect(
            innerSignal,
            connectId,
            allowUsbEphemeralFallback,
            preserveInteractionId,
            context
          );
        } finally {
          if (this._doConnectAbortController === controller) {
            this._connectingPromise = null;
            this._doConnectAbortController = null;
          }
        }
      })();
    }

    return this._abortable(signal, this._connectingPromise);
  }

  // Layer 1 main loop — the ONLY place in SDK that emits unlock dialog.
  // Bounded by MAX_DOCONNECT_CONFIRMS — after N Confirms with no progress,
  // throw DeviceNotFound so the user is kicked out of the loop.
  private async _doConnect(
    internalSignal: AbortSignal,
    targetConnectId?: string,
    allowUsbEphemeralFallback = false,
    preserveInteractionId?: string,
    context?: LedgerConnectionAttempt
  ): Promise<string> {
    LedgerAdapter._throwIfAborted(internalSignal);
    if (
      this.connector.availableTransports?.includes('usb') &&
      this.connector.availableTransports.includes('ble')
    ) {
      this._activeConnectionType = 'usb';
      const usbDevices = await this._searchDevices({ transportType: 'usb' }, internalSignal);
      LedgerAdapter._throwIfAborted(internalSignal);
      if (usbDevices.length > 0) {
        const knownUsb = context?.knownConnections?.find(
          connection => connection.transport === 'usb'
        );
        const usbTarget =
          knownUsb?.transport === 'usb'
            ? knownUsb.connectId
            : usbDevices.find(device => device.connectId === targetConnectId)?.connectId;
        return this._connectFirstOrSelect(
          usbDevices,
          usbTarget,
          allowUsbEphemeralFallback,
          preserveInteractionId,
          context,
          internalSignal
        );
      }
      this._activeConnectionType = 'ble';
      const knownBle = context?.knownConnections?.find(
        connection => connection.transport === 'ble'
      );
      if (knownBle?.transport === 'ble') {
        // A saved endpoint follows normal connect/error behavior, never a new binding picker.
        return this._connectDeviceOrThrow(
          knownBle.connectId,
          preserveInteractionId,
          internalSignal
        );
      }
      if (targetConnectId && context?.knownConnections === undefined) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: 'Ledger connection metadata is required before starting Bluetooth binding',
        });
      }
      const bleDevices = await this._searchDevices({ transportType: 'ble' }, internalSignal);
      return this._connectFirstOrSelect(
        bleDevices,
        undefined,
        allowUsbEphemeralFallback,
        preserveInteractionId,
        context,
        internalSignal
      );
    }
    if (this._isBleConnection() && targetConnectId) {
      return this._connectDeviceOrThrow(targetConnectId, preserveInteractionId, internalSignal);
    }

    let confirms = 0;
    while (!internalSignal.aborted) {
      // Tell consumers we're actively scanning. Re-emitted at every iteration
      // so the toast comes back after `_waitForDeviceConnect` closes its
      // dialog — the dialog overrides the searching toast while open, and
      // the next round needs an explicit signal to bring it back.
      this.emitter.emit('ui-event', {
        type: EConnectorInteraction.Searching,
        payload: { sessionId: '' },
      });
      let devices = await this._searchDevices(undefined, internalSignal);
      LedgerAdapter._throwIfAborted(internalSignal);

      // First scan empty? Retry — BLE state can be flaky right after a
      // PairingRefused / Disconnect / fresh app restart, and ble-plx scans
      // sometimes miss a device that's actually advertising. Worth a few
      // extra seconds before bothering the user with a dialog.
      if (devices.length === 0) {
        for (let i = 0; i < 3 && !internalSignal.aborted; i += 1) {
          await new Promise<void>(resolve => {
            setTimeout(resolve, DEVICE_CONNECT_RETRY_DELAY_MS);
          });
          LedgerAdapter._throwIfAborted(internalSignal);
          devices = await this._searchDevices(undefined, internalSignal);
          LedgerAdapter._throwIfAborted(internalSignal);
          if (devices.length > 0) break;
        }
      }

      if (devices.length > 0 || (this._isBleConnection() && allowUsbEphemeralFallback)) {
        try {
          return await this._connectFirstOrSelect(
            devices,
            targetConnectId,
            allowUsbEphemeralFallback,
            preserveInteractionId,
            context,
            internalSignal
          );
        } catch (err) {
          // PairingFailure / DeviceMismatch / unclassified → throw out, no
          // Layer 1 retry. PairingRefused = user declined system pair prompt
          // / didn't confirm on device — edge case, let upstream surface it.
          // Locked / NotAdvertising / Disconnected stay as recoverable since
          // they often clear themselves between attempts.
          if (
            !isDeviceLockedError(err) &&
            !isDeviceNotAdvertisingError(err) &&
            !isDeviceDisconnectedError(err)
          ) {
            throw err;
          }
          this._discoveredDevices.clear();
          if (isDeviceDisconnectedError(err)) {
            try {
              this.connector.reset?.();
            } catch {
              // best-effort
            }
          }
        }
      }

      if (confirms >= LedgerAdapter.MAX_DOCONNECT_CONFIRMS) {
        throw Object.assign(
          new Error(
            'Device not connected after multiple attempts. Please ensure your Ledger is awake, unlocked, and in range, then try again.'
          ),
          { code: HardwareErrorCode.DeviceNotFound }
        );
      }

      await this._waitForDeviceConnect(internalSignal);
      confirms += 1;
    }
    LedgerAdapter._throwIfAborted(internalSignal);
    // Unreachable — _throwIfAborted always throws when aborted.
    throw new Error('_doConnect aborted');
  }

  private async _connectFirstOrSelect(
    devices: DeviceInfo[],
    targetConnectId: string | undefined,
    allowUsbEphemeralFallback: boolean,
    preserveInteractionId: string | undefined,
    context: LedgerConnectionAttempt | undefined,
    signal: AbortSignal
  ): Promise<string> {
    LedgerAdapter._throwIfAborted(signal);
    if (targetConnectId) {
      const target = devices.find(
        d => d.connectId === targetConnectId || d.deviceId === targetConnectId
      );
      if (target) {
        return this._connectDeviceOrThrow(target.connectId, preserveInteractionId, signal);
      }

      // Decision: a stale USB target + fresh search returning exactly one
      // Ledger is not proof that the sole Ledger is the original device. It
      // might be A after a replug (safe to recover), or B after A was unplugged
      // (wrong-device risk).
      //
      // We only take this recovery path when the business call supplied a
      // stable wallet fingerprint (`deviceId`) and did not opt out of
      // fingerprint checks. The connection is then provisional: the caller must
      // run `_verifyDeviceFingerprintWithSession` before sending the real APDU.
      // Calls without that identity check fail closed with DeviceNotFound so
      // the host can ask the user to reconnect/select again.
      if (!this._isBleConnection() && devices.length === 1 && allowUsbEphemeralFallback) {
        debugLog(
          `[LedgerAdapter] target ${targetConnectId} not in fresh enumeration; ` +
            `accepting sole USB device ${devices[0].connectId} for fingerprint-verified recovery`
        );
        return this._connectDeviceOrThrow(devices[0].connectId, preserveInteractionId, signal);
      }

      if (!this._isBleConnection() || !allowUsbEphemeralFallback) {
        const err = Object.assign(new Error(`Target Ledger unavailable: ${targetConnectId}`), {
          code: HardwareErrorCode.DeviceNotFound,
        }) as Error & { _tag?: string };
        if (this._isBleConnection()) {
          err._tag = ERROR_TAG.DeviceNotAdvertising;
        }
        throw err;
      }
    }

    const requiresBleSelection = this._isBleConnection();
    if (requiresBleSelection && !allowUsbEphemeralFallback) {
      throw Object.assign(new Error('Ledger BLE connectId is required.'), {
        code: HardwareErrorCode.DeviceNotFound,
      });
    }

    if (requiresBleSelection && context?.allowDeviceSelection !== false) {
      const bindingSessionId = context?.bindingSessionId ?? this._uiRegistry.createRequestId();
      if (context) context.bindingSessionId = bindingSessionId;
      const allowUsbFallback =
        context?.bindingReason !== 'manual-rebind' &&
        Boolean(this.connector.availableTransports?.includes('usb'));
      const knownUsb = context?.knownConnections?.find(
        connection => connection.transport === 'usb'
      );
      const usbConnectId = knownUsb?.transport === 'usb' ? knownUsb.connectId : targetConnectId;
      const { device, requestId } = await requestBleDeviceSelection({
        emitter: this.emitter,
        registry: this._uiRegistry,
        signal,
        allowUsbFallback,
        scan: async () => {
          if (allowUsbFallback) {
            const usbDevices = await this._searchDevices({ transportType: 'usb' }, signal);
            const candidate =
              usbDevices.find(
                device => device.connectionType === 'usb' && device.connectId === usbConnectId
              ) ??
              (usbDevices.length === 1 && usbDevices[0].connectionType === 'usb'
                ? usbDevices[0]
                : undefined);
            if (candidate) return [candidate];
          }
          return (
            await this._searchDevices({ transportType: 'ble', waitForAllTransports: true }, signal)
          ).filter(device => !context?.rejectedConnectIds?.has(device.connectId));
        },
        request: {
          devices: devices.filter(device => !context?.rejectedConnectIds?.has(device.connectId)),
          bindingSessionId,
          rejectedConnectId: context?.rejectedConnectId,
          context: {
            kind: 'bind-connection',
            transport: 'ble',
            reason:
              context?.bindingReason ??
              (targetConnectId ? 'known-connection-unavailable' : 'missing-binding'),
          },
          extra: context?.extra,
        },
      });
      if (device.connectionType === 'usb') {
        // This is still discovery; the caller verifies the wallet before the business APDU.
        this._activeConnectionType = 'usb';
        if (context) context.selectedConnection = undefined;
        if (preserveInteractionId) this._pendingInteractionBindings.delete(preserveInteractionId);
        this._bindingSelectionRequestId = undefined;
        this.emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
          type: UI_REQUEST.DEVICE_BINDING_STATUS,
          payload: { selectionRequestId: requestId, status: 'cancelled' },
        });
        return this._connectDeviceOrThrow(device.connectId, preserveInteractionId, signal);
      }
      if (context) context.selectedConnection = { connectId: device.connectId, requestId };
      this._bindingSelectionRequestId = requestId;
      return this._connectDeviceOrThrow(device.connectId, preserveInteractionId, signal);
    }

    // An operation-first call has no preselected target. Let the host choose
    // from this scan generation, then connect only the returned candidate.
    if (devices.length > 0 && (devices.length > 1 || requiresBleSelection)) {
      if (
        context?.allowDeviceSelection === false ||
        !this.emitter.listenerCount(UI_REQUEST.REQUEST_SELECT_DEVICE)
      ) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: 'Select a Ledger device before continuing',
        });
      }
      const requestId = this._uiRegistry.createRequestId();
      const waitPromise = this._uiRegistry.wait<{ sdkConnectId: string }>(
        UI_REQUEST.REQUEST_SELECT_DEVICE,
        { requestId }
      );
      this.emitter.emit(UI_REQUEST.REQUEST_SELECT_DEVICE, {
        type: UI_REQUEST.REQUEST_SELECT_DEVICE,
        payload: {
          devices,
          requestId,
          context: requiresBleSelection
            ? {
                kind: 'bind-connection',
                transport: 'ble',
                reason: targetConnectId ? 'known-connection-unavailable' : 'missing-binding',
              }
            : { kind: 'select-device', transport: 'usb', reason: 'multiple-candidates' },
          extra: context?.extra,
        },
      });
      const { sdkConnectId } = await (signal ? this._abortable(signal, waitPromise) : waitPromise);
      if (signal) LedgerAdapter._throwIfAborted(signal);
      const selected = devices.find(device => device.connectId === sdkConnectId);
      if (!selected) {
        throw Object.assign(new Error('Selected Ledger is no longer available'), {
          code: HardwareErrorCode.DeviceNotFound,
        });
      }
      if (context && requiresBleSelection)
        context.selectedConnection = { connectId: selected.connectId, requestId };
      return this._connectDeviceOrThrow(selected.connectId, preserveInteractionId, signal);
    }

    if (devices.length !== 1) {
      throw Object.assign(new Error('Ledger device not found.'), {
        code: HardwareErrorCode.DeviceNotFound,
      });
    }

    return this._connectDeviceOrThrow(devices[0].connectId, preserveInteractionId, signal);
  }

  private async _connectDeviceOrThrow(
    chosenConnectId: string,
    preserveInteractionId?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const result = await this._connectTarget(chosenConnectId, preserveInteractionId, signal);
    if (!result.success) {
      // _tag must survive — _doConnect's catch is _tag-based.
      const payload = result.payload as { error: string; code: number; _tag?: string };
      const rethrow = Object.assign(new Error(payload.error), {
        code: payload.code,
      }) as Error & { _tag?: string };
      if (payload._tag !== undefined) {
        rethrow._tag = payload._tag;
      }
      throw rethrow;
    }
    return result.payload;
  }

  /**
   * Call the connector with automatic session resolution and disconnect retry.
   *
   * 1. Resolves a valid connectId via ensureConnected()
   * 2. Looks up sessionId from _sessions
   * 3. Calls connector.call()
   * 4. On disconnect error: clears stale session, re-connects, retries once
   */
  /**
   * Unwrap a `ConnectorCallResult` back into the throw-based control flow this
   * class relies on. On failure, rehydrate a FLAT Error (lifting `params.*`
   * back to own-properties) so the downstream recovery predicates
   * (`isStuckAppStateError`, `isDeviceLockedError`, …) and `mapLedgerError`
   * (which read `err._tag` / `err.code` / `err.appName` / `err.originalError`)
   * keep working exactly as before — the Result shape is confined to the
   * connector boundary.
   */
  private _unwrapConnectorResult(result: ConnectorCallResult): unknown {
    if (result.success) return result.payload;
    throw rehydrateConnectorError(result.error);
  }

  /**
   * `connector.call` + result unwrap, optionally raced against an abort
   * signal. Returns the call payload or throws the rehydrated error. All
   * `this.connector.call` usage goes through here so the Result→throw seam
   * lives in one place.
   */
  private async _callConnector(
    sessionId: string,
    method: string,
    params: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    this._assertConnectorReady(method);
    const releaseOperation = this._retainConnectorOperation(`call:${sessionId}`);
    let promise: ReturnType<IConnector['call']>;
    try {
      promise = this.connector.call(sessionId, method, params).finally(releaseOperation);
    } catch (error) {
      releaseOperation();
      throw error;
    }
    const result = signal ? await this._abortable(signal, promise) : await promise;
    return this._unwrapConnectorResult(result);
  }

  private _assertConnectorReady(method: string): void {
    if (
      this._resetPromise ||
      this._pendingConnectorTeardowns > 0 ||
      this._unsettledConnectorOperations.size > 0
    ) {
      throw LedgerAdapter._createDeviceBusyError(method);
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
        await this._waitForConnectorOperationsToDrain();
        await task();
      } finally {
        this._pendingConnectorTeardowns -= 1;
        releaseTail();
      }
    })();
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

  private async connectorCall(
    connectId: string,
    method: string,
    params: unknown,
    fingerprint?: ConnectorCallFingerprint,
    permissionDeviceId?: string,
    commonParams?: ICommonCallParams,
    installContext?: LedgerInstallAppContext
  ): Promise<unknown> {
    const positionalInteractionId = isHardwareInteractionId(connectId) ? connectId : undefined;
    if (
      positionalInteractionId &&
      commonParams?.interactionId &&
      positionalInteractionId !== commonParams.interactionId
    ) {
      throw createHwkError({
        code: HardwareErrorCode.InvalidParams,
        message: 'Conflicting Ledger interaction ids',
        params: {
          positionalInteractionId,
          commonInteractionId: commonParams.interactionId,
        },
      });
    }
    const interactionId = commonParams?.interactionId ?? positionalInteractionId;
    const interaction = interactionId ? this._interactions.resolve(interactionId) : undefined;
    const releaseInteractionRetention = interactionId
      ? this._interactions.retain(interactionId)
      : undefined;
    const effectiveConnectId = interaction?.connectId ?? connectId;
    // [REQ] / [RES] are the canonical request/response trace for any operation
    // that hits the device — chain methods, installApp, list*, firmware, etc.
    // Diagnostic / recovery debugLog lines below are NOT a duplicate: they log
    // what the SDK decides to do about an error, not the response itself.
    debugLog('[LedgerAdapter][REQ]', {
      method,
      connectId: effectiveConnectId || '(empty)',
      params,
    });

    // Queue is global serial; deviceId is just a label for inspection / cancellation.
    const queueKey = (interactionId ?? effectiveConnectId) || '__ledger_default__';

    try {
      const result = await this._jobQueue.enqueue(
        queueKey,
        async signal => {
          if (interactionId) this._activeInteractionJobs.add(interactionId);
          try {
            return await this._runConnectorCall(
              effectiveConnectId,
              method,
              params,
              signal,
              fingerprint,
              permissionDeviceId,
              commonParams,
              installContext ?? {},
              interactionId
            );
          } catch (error) {
            this._finishBleBinding(signal.aborted ? 'cancelled' : 'failed');
            throw error;
          } finally {
            if (interactionId) {
              this._activeInteractionJobs.delete(interactionId);
              if (this._pendingInteractionDisconnects.delete(interactionId)) {
                await this._releaseLostInteractionConnection(interactionId);
              }
            }
          }
        },
        {
          label: method,
          rejectIfBusy: true,
          busyError: LedgerAdapter._createDeviceBusyError(method),
        }
      );
      debugLog('[LedgerAdapter][RES]', { method, success: true, payload: result });
      return result;
    } catch (err) {
      const e = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter][RES]', {
        method,
        success: false,
        error: {
          message: e?.message,
          _tag: e?._tag,
          code: e?.code ?? e?.errorCode,
        },
      });
      throw err;
    } finally {
      releaseInteractionRetention?.();
    }
  }

  /**
   * Race a promise against an abort signal. On abort, rejects with
   * signal.reason → instance _lastCancelReason → generic Error('Aborted').
   */
  private _abortable<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
    const getAbortReason = () =>
      (signal as AbortSignal & { reason?: unknown }).reason ??
      this._lastCancelReason ??
      new Error('Aborted');

    if (signal.aborted) {
      void promise.catch(() => undefined);
      return Promise.reject(getAbortReason());
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        reject(getAbortReason());
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

  /** Throw an AbortError if signal is already aborted. */
  private static _throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw (signal as AbortSignal & { reason?: unknown }).reason ?? new Error('Aborted');
    }
  }

  /** Actual work done under the job queue — connection, fingerprint, call, and recovery. */
  private async _runConnectorCall(
    connectId: string,
    method: string,
    params: unknown,
    signal: AbortSignal,
    fingerprint?: ConnectorCallFingerprint,
    permissionDeviceId?: string,
    commonParams?: ICommonCallParams,
    installContext?: LedgerInstallAppContext,
    interactionId?: string,
    lockedRetryBudget = LedgerAdapter.MAX_BUSINESS_RETRY_BUDGET
  ): Promise<unknown> {
    LedgerAdapter._throwIfAborted(signal);
    if (!interactionId) {
      await this._ensureDevicePermission(
        connectId,
        permissionDeviceId ?? fingerprint?.deviceId,
        signal
      );
    }
    LedgerAdapter._throwIfAborted(signal);
    let effectiveParams = params;
    if (method === 'btcGetPublicKey') {
      const gatedParams = await this._gateBtcHighIndex(params as BtcGetPublicKeyParams);
      if (gatedParams === null) {
        throw Object.assign(new Error('User cancelled BTC high-index confirmation'), {
          _tag: ERROR_TAG.UserAborted,
          code: HardwareErrorCode.UserAborted,
        });
      }
      effectiveParams = gatedParams;
    }

    const allowUsbEphemeralFallback = !!fingerprint?.deviceId && !fingerprint.skipFingerprint;
    let businessCallStarted = false;

    // Wrap ensureConnected in _abortable so an abort during device discovery /
    // user-connect UI wait rejects this caller immediately. The underlying
    // _doConnect / _connectingPromise is shared across callers and continues
    // running — other concurrent callers aren't affected.
    const verifiedBleTarget = connectId
      ? this._verifiedBleReconnectTargets.get(connectId)
      : undefined;
    const knownTransport = this._isBleConnection() ? 'ble' : 'usb';
    const hintedConnectId = commonParams?.knownConnections?.find(
      connection => connection.transport === knownTransport
    );
    const inputConnectId =
      hintedConnectId && hintedConnectId.transport !== 'qr' ? hintedConnectId.connectId : connectId;
    const preferredConnectId =
      fingerprint &&
      !fingerprint.skipFingerprint &&
      verifiedBleTarget?.chain === fingerprint.chain &&
      verifiedBleTarget.fingerprint === fingerprint.deviceId
        ? verifiedBleTarget.connectId
        : inputConnectId;
    const connectionAttempt: LedgerConnectionAttempt = { ...commonParams };
    const bundleConnection = installContext?.connection;
    if (
      bundleConnection &&
      this._sessions.get(bundleConnection.connectId) !== bundleConnection.sessionId
    ) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceDisconnected,
        message: 'Ledger all-network connection ended',
      });
    }
    let resolvedConnectId = interactionId
      ? this._interactions.resolve(interactionId).connectId
      : bundleConnection?.connectId ??
        (await this.ensureConnected(
          preferredConnectId,
          signal,
          allowUsbEphemeralFallback,
          undefined,
          connectionAttempt
        ));
    let sessionId = this._sessions.get(resolvedConnectId);
    if (sessionId && installContext && !installContext.connection) {
      installContext.connection = { connectId: resolvedConnectId, sessionId };
    }
    if (!sessionId) {
      if (interactionId) {
        this._interactions.end(interactionId, 'disconnect');
        throw createHwkError({
          code: HardwareErrorCode.InteractionEnded,
          message: 'Ledger interaction connection is no longer active',
          params: { interactionId, reason: 'disconnect' },
        });
      }
      throw Object.assign(new Error('Auto-connect succeeded but no session found'), {
        _tag: ERROR_TAG.DeviceSessionNotFound,
      });
    }

    // Fingerprint verification inside the session — atomic with the actual call
    try {
      // Fingerprint verification lives inside the same try/catch as the main
      // call so that transport-level errors raised by `_computeChainFingerprint`
      // (e.g. "Device communication interrupted") flow through the recovery
      // path below — clearing session + resetting connector. Without this,
      // a stuck DMK transport during fingerprint check leaks the dead
      // session to subsequent retries (they keep using the same broken
      // sessionId until the user replugs).
      if (fingerprint && !fingerprint.skipFingerprint && fingerprint.deviceId) {
        for (;;) {
          const fp = await this._abortable(
            signal,
            this._verifyDeviceFingerprintWithSession(
              sessionId,
              fingerprint.deviceId,
              fingerprint.chain
            )
          );
          if (fp.success) break;
          const binding = interactionId
            ? this._pendingInteractionBindings.get(interactionId)
            : connectionAttempt;
          if (
            !this._isBleConnection() ||
            binding?.selectedConnection?.connectId !== resolvedConnectId
          ) {
            throw Object.assign(new Error(formatDeviceMismatchError(fp.expected, fp.actual)), {
              code: HardwareErrorCode.DeviceMismatch,
            });
          }
          // Only an unverified binding may replace its provisional endpoint.
          // A known/pinned verified connection still fails closed on mismatch.
          binding.rejectedConnectIds ??= new Set();
          binding.rejectedConnectIds.add(resolvedConnectId);
          binding.rejectedConnectId = resolvedConnectId;
          this._sessions.delete(resolvedConnectId);
          await this.connector.disconnect(sessionId);
          if (interactionId) this._pendingInteractionDisconnects.delete(interactionId);
          LedgerAdapter._throwIfAborted(signal);
          resolvedConnectId = await this._connectFirstOrSelect(
            [],
            undefined,
            true,
            interactionId,
            binding,
            signal
          );
          const selectedSession = this._sessions.get(resolvedConnectId);
          const selectedDevice = this._discoveredDevices.get(resolvedConnectId);
          if (!selectedSession || !selectedDevice)
            throw createHwkError({
              code: HardwareErrorCode.DeviceDisconnected,
              message: 'Selected Ledger connection ended',
            });
          sessionId = selectedSession;
          if (interactionId)
            this._interactions.rebind(interactionId, {
              connectId: resolvedConnectId,
              device: selectedDevice,
              connectionKeys: [sessionId],
            });
          if (installContext)
            installContext.connection = { connectId: resolvedConnectId, sessionId };
        }
        await this._publishVerifiedBleBinding(
          resolvedConnectId,
          fingerprint.chain,
          fingerprint.deviceId,
          connectionAttempt,
          interactionId,
          signal
        );
        if (
          !interactionId &&
          connectionAttempt.selectedConnection?.connectId === resolvedConnectId &&
          this._isBleConnection()
        ) {
          this._verifiedBleReconnectTargets.set(connectId, {
            connectId: resolvedConnectId,
            chain: fingerprint.chain,
            fingerprint: fingerprint.deviceId,
          });
        }
      }
      businessCallStarted = true;
      return await this._callConnector(sessionId, method, effectiveParams, signal);
    } catch (err) {
      // If the abort fired, surface it directly — skip recovery paths.
      if (signal.aborted) throw err;
      // Once a session is acquired, a lost connection ends even a one-shot call.
      // Never rediscover/rebind and replay it on a fresh USB/BLE session.
      if (
        isDeviceDisconnectedError(err) ||
        isDeviceNotAdvertisingError(err) ||
        isTimeoutError(err) ||
        isConnectionLevelError(err)
      ) {
        this._discoveredDevices.delete(resolvedConnectId);
        if (interactionId) await this._releaseLostInteractionConnection(interactionId);
        else {
          this._sessions.delete(resolvedConnectId);
          await this.connector.disconnect(sessionId).catch(() => undefined);
        }
        const ambiguous =
          businessCallStarted && !canReplayHardwareMethodAfterTransportFailure(method);
        const interactionParams = interactionId
          ? { interactionId, reason: 'disconnect' }
          : undefined;
        throw createHwkError({
          code: interactionId ? HardwareErrorCode.InteractionEnded : mapLedgerError(err).code,
          message: 'Ledger operation connection was lost; start a new operation',
          params: ambiguous
            ? operationMayHaveCompletedParams(method, { interactionId })
            : interactionParams,
          recovery: ambiguous ? { scope: 'unknown' } : undefined,
        });
      }
      const errObj = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter] connectorCall error:', method, {
        message: errObj?.message,
        _tag: errObj?._tag,
        errorCode: errObj?.errorCode,
        statusCode: errObj?.statusCode,
        isDisconnected: isDeviceDisconnectedError(err),
        isLocked: isDeviceLockedError(err),
        isNotAdvertising: isDeviceNotAdvertisingError(err),
        isStuckApp: isStuckAppStateError(err),
      });

      // A precise DeviceLocked response means the business APDU was rejected
      // before execution. Keep the pinned session, ask the user to unlock, and
      // retry within a bounded budget without searching or reconnecting.
      if (
        (isDeviceLockedError(err) || errObj?.code === HardwareErrorCode.DeviceLocked) &&
        lockedRetryBudget > 0
      ) {
        await this._waitForDeviceConnect(signal);
        if (this._sessions.get(resolvedConnectId) !== sessionId) {
          throw createHwkError({
            code: interactionId
              ? HardwareErrorCode.InteractionEnded
              : HardwareErrorCode.DeviceDisconnected,
            message: 'Ledger connection ended while waiting for unlock',
          });
        }
        return this._runConnectorCall(
          resolvedConnectId,
          method,
          effectiveParams,
          signal,
          fingerprint,
          permissionDeviceId,
          commonParams,
          installContext,
          interactionId,
          lockedRetryBudget - 1
        );
      }

      if (businessCallStarted && isStuckAppStateError(err)) {
        await this._sleepAbortable(LedgerAdapter.STUCK_APP_RETRY_DELAY_MS, signal);
        if (this._sessions.get(resolvedConnectId) !== sessionId) {
          throw createHwkError({
            code: interactionId
              ? HardwareErrorCode.InteractionEnded
              : HardwareErrorCode.DeviceDisconnected,
            message: 'Ledger connection ended during the app transition',
          });
        }
        try {
          return await this._callConnector(sessionId, method, effectiveParams, signal);
        } catch (retryErr) {
          if (isStuckAppStateError(retryErr)) throw err;
          if (
            isDeviceDisconnectedError(retryErr) ||
            isDeviceNotAdvertisingError(retryErr) ||
            isTimeoutError(retryErr) ||
            isConnectionLevelError(retryErr)
          ) {
            if (interactionId) await this._releaseLostInteractionConnection(interactionId);
            else {
              this._sessions.delete(resolvedConnectId);
              this._discoveredDevices.delete(resolvedConnectId);
              await this.connector.disconnect(sessionId).catch(() => undefined);
            }
            throw createHwkError({
              code: interactionId
                ? HardwareErrorCode.InteractionEnded
                : mapLedgerError(retryErr).code,
              message: `Ledger ${method} may have completed before the connection was lost`,
              params: !canReplayHardwareMethodAfterTransportFailure(method)
                ? operationMayHaveCompletedParams(method, {
                    interactionId,
                    reason: 'disconnect',
                  })
                : { interactionId, reason: 'disconnect' },
              recovery: !canReplayHardwareMethodAfterTransportFailure(method)
                ? { scope: 'unknown' }
                : undefined,
            });
          }
          throw retryErr;
        }
      }

      if (
        !interactionId &&
        (err as { code?: number } | null | undefined)?.code === HardwareErrorCode.DeviceMismatch
      ) {
        this._sessions.delete(resolvedConnectId);
        this._discoveredDevices.delete(resolvedConnectId);
        await this.connector.disconnect(sessionId).catch(() => undefined);
        throw err;
      }

      // Auto-install: required app missing + caller opted in via commonParams.
      // Ask the user, install (DMK returns to dashboard then installs, streaming
      // AppInstallProgress ui-events), then retry the original op once. The
      // install runs as a direct connector call within THIS queue slot — going
      // through the public installApp/connectorCall would re-enter the serial
      // job queue and reject as busy.
      const autoInstallApp = commonParams?.autoInstallApp ?? this._defaultAutoInstallApp;
      const isAppMissing =
        isAppNotInstalledError(err) ||
        (err as { code?: number })?.code === HardwareErrorCode.AppNotInstalled;
      if (autoInstallApp && isAppMissing) {
        if (installContext?.deviceOutOfMemoryError) {
          throw installContext.deviceOutOfMemoryError;
        }
        const appName = (err as { appName?: string })?.appName ?? mapLedgerError(err).appName;
        if (appName) {
          // Loop guard: if installApp already resolved once this bundle but
          // the app is STILL missing, DMK is lying about success. Don't
          // re-prompt — surface a clear failure so the bundle moves on.
          if (installContext?.installAttemptedAppNames?.has(appName)) {
            throw createHwkError({
              code: HardwareErrorCode.AppNotInstalled,
              message: `${appName} install reported success but the app is still missing on device`,
              _tag: ERROR_TAG.AppInstallVerifyFailed,
              appName,
            });
          }
          const confirmed = await this._waitForInstallAppConfirm(appName);
          if (!confirmed) {
            throw createHwkError({
              code: HardwareErrorCode.UserAborted,
              message: `User declined to install ${appName}`,
              _tag: ERROR_TAG.UserAborted,
              appName,
            });
          }
          // Emit progress 0 immediately so the confirm dialog morphs into the
          // "installing" view with no blank gap — DMK's setup (go-to-dashboard,
          // metadata, build plan, secure channel) can take several seconds
          // before the first real progress arrives.
          this.emitter.emit('ui-event', {
            type: EConnectorInteraction.AppInstallProgress,
            payload: { connectId: resolvedConnectId, appName, progress: 0 },
          });
          try {
            await this._callConnector(sessionId, 'installApp', { appName }, signal);
          } catch (installErr) {
            if (mapLedgerError(installErr).code === HardwareErrorCode.DeviceOutOfMemory) {
              if (installContext) {
                installContext.deviceOutOfMemoryError = installErr as Error;
              }
            }
            throw installErr;
          }
          if (installContext) {
            installContext.installAttemptedAppNames =
              installContext.installAttemptedAppNames ?? new Set();
            installContext.installAttemptedAppNames.add(appName);
          }
          // Close the install UI before retrying so the retried operation's own
          // device prompts (e.g. confirm-on-device) render normally instead of
          // being absorbed by the install dialog.
          this.emitter.emit(UI_REQUEST.CLOSE_UI_WINDOW, {
            type: UI_REQUEST.CLOSE_UI_WINDOW,
            payload: {},
          });
          return await this._runConnectorCall(
            resolvedConnectId,
            method,
            effectiveParams,
            signal,
            fingerprint,
            permissionDeviceId,
            commonParams,
            installContext,
            interactionId
          );
        }
      }

      // Business errors (BlindSigning, AppStuck, etc.) propagate untouched.
      throw err;
    }
  }

  private _sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject((signal.reason as Error | undefined) ?? new Error('Aborted'));
        return;
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject((signal.reason as Error | undefined) ?? new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Ensure OS-level device permission (Bluetooth / USB) before proceeding.
   *
   * Emits `REQUEST_DEVICE_PERMISSION` and awaits the consumer's
   * `RECEIVE_DEVICE_PERMISSION` reply (60s budget covers "probe → system
   * prompt → user tap" plus a generous margin). If the consumer never wires
   * a handler or never replies, the wait times out and the operation fails
   * fast so scanners/callers don't hang silently.
   *
   * - No connectId (searchDevices): environment-level permission
   * - With connectId (business methods): device-level permission
   */
  private async _ensureDevicePermission(
    connectId?: string,
    deviceId?: string,
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      LedgerAdapter._throwIfAborted(signal);
    }
    const transportType: TransportType = this.activeTransport ?? 'hid';

    // Register the wait before emitting — a synchronous listener that replies
    // immediately (e.g. in tests or a same-process consumer) would otherwise
    // resolve before any pending entry exists and the response would drop.
    const waitPromise = this._uiRegistry.wait<DevicePermissionResponse>(
      UI_REQUEST.REQUEST_DEVICE_PERMISSION,
      { timeoutMs: 60_000 }
    );

    this.emitter.emit(UI_REQUEST.REQUEST_DEVICE_PERMISSION, {
      type: UI_REQUEST.REQUEST_DEVICE_PERMISSION,
      payload: { transportType, connectId, deviceId },
    });

    let response: DevicePermissionResponse;
    const onAbort = () => {
      this._uiRegistry.cancel(UI_REQUEST.REQUEST_DEVICE_PERMISSION);
    };
    try {
      signal?.addEventListener('abort', onAbort, { once: true });
      response = await waitPromise;
    } catch (err) {
      if (signal?.aborted) {
        LedgerAdapter._throwIfAborted(signal);
      }
      // Defensive: same-type re-fire of REQUEST_DEVICE_PERMISSION could
      // preempt this wait. Surface as UserAborted so upstream classifiers
      // stop the batch cleanly instead of bubbling an unmapped tag.
      if ((err as { _tag?: string })?._tag === UI_REQUEST_PREEMPTED_TAG) {
        this.emitter.emit(UI_REQUEST.CLOSE_UI_WINDOW, {
          type: UI_REQUEST.CLOSE_UI_WINDOW,
          payload: {},
        });
        throw Object.assign(new Error('Device permission request superseded'), {
          _tag: ERROR_TAG.UserAborted,
          code: HardwareErrorCode.UserAborted,
          cause: err,
        });
      }
      throw err;
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }

    const { granted, reason, message } = response;

    if (!granted) {
      throw Object.assign(new Error(message ?? 'Device permission denied'), {
        code: HardwareErrorCode.DevicePermissionDenied,
        reason,
      });
    }
  }

  /**
   * Convert a thrown error to a Response failure.
   * Uses mapLedgerError to parse Ledger DMK error codes into HardwareErrorCode values.
   */
  private errorToFailure<T>(err: unknown): Response<T> {
    debugError('[LedgerAdapter] error:', err);

    // Preserve `_tag` so SDK classifiers survive the Failure round-trip.
    const tag = err && typeof err === 'object' ? (err as { _tag?: string })._tag : undefined;

    // If the error carries an explicit HardwareErrorCode (e.g. validation errors
    // thrown by connector chain methods), use it directly.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'number'
    ) {
      const e = err as {
        code: number;
        message?: string;
        appName?: string;
        reason?: string;
        params?: Record<string, unknown>;
        recovery?: unknown;
      };
      const params =
        e.code === HardwareErrorCode.DevicePermissionDenied && e.reason
          ? { permissionDeniedReason: e.reason }
          : e.params;
      return ledgerFailure(
        e.code,
        e.message ?? 'Unknown error',
        e.appName,
        tag,
        params,
        undefined,
        isHwkRecoveryHint(e.recovery) ? e.recovery : undefined
      );
    }

    const mapped = mapLedgerError(err);

    // DeviceLocked is handled by connectorCall retry logic (_waitForDeviceConnect).
    // Do NOT emit UI events here — it would show UI and return error simultaneously.

    return ledgerFailure(mapped.code, mapped.message, mapped.appName, tag);
  }

  // ---------------------------------------------------------------------------
  // Event translation
  // ---------------------------------------------------------------------------

  private deviceConnectHandler = (data: { device: ConnectorDevice }): void => {
    const deviceInfo = this.connectorDeviceToDeviceInfo(data.device);
    this._discoveredDevices.set(deviceInfo.connectId, deviceInfo);
    // Clear any stale session for this connectId so ensureConnected() does a fresh connect.
    // This handles the case where the connector reconnected internally (e.g. TRON app switch).
    this._sessions.delete(deviceInfo.connectId);
    this.emitter.emit(DEVICE.CONNECT, {
      type: DEVICE.CONNECT,
      payload: deviceInfo,
    });
  };

  private deviceDisconnectHandler = (data: { connectId: string }): void => {
    const activeInteraction = this._interactions.findActiveByConnectionKey(data.connectId);
    if (activeInteraction && this._activeInteractionJobs.has(activeInteraction.interactionId)) {
      this._pendingInteractionDisconnects.add(activeInteraction.interactionId);
    } else {
      this._interactions.endByConnectionKey(data.connectId, 'disconnect');
    }
    this._discoveredDevices.delete(data.connectId);
    this._sessions.delete(data.connectId);
    this.emitter.emit(DEVICE.DISCONNECT, {
      type: DEVICE.DISCONNECT,
      payload: { connectId: data.connectId },
    });
  };

  // Forward connector `ui-event` to the public hw.emitter so consumers only
  // need to subscribe in one place. For the AppInstallProgress variant we
  // re-key sessionId → connectId via the live _sessions map; if no mapping
  // exists (race during teardown) we drop. All other variants pass through
  // unchanged.
  private uiEventForwarder = (event: ConnectorUiEvent): void => {
    if (event.type === EConnectorInteraction.AppInstallProgress) {
      let connectId: string | undefined;
      for (const [cid, sid] of this._sessions) {
        if (sid === event.payload.sessionId) {
          connectId = cid;
          break;
        }
      }
      if (!connectId) {
        debugLog(
          '[LedgerAdapter] dropping AppInstallProgress: no connectId for sessionId',
          event.payload.sessionId
        );
        return;
      }
      const { appName, progress } = event.payload;
      const key = `${connectId}:${appName}`;
      // Reset baseline on app/device switch — and after the prior stream
      // finished — so the next install of the same app emits intermediate
      // frames instead of staying stuck at the final 1.0 baseline.
      if (this._installProgressLastKey !== key || this._installProgressLastEmittedValue >= 1) {
        this._installProgressLastEmittedValue = -Infinity;
        this._installProgressLastKey = key;
      }
      const delta = progress - this._installProgressLastEmittedValue;
      if (delta < LedgerAdapter.APP_INSTALL_PROGRESS_MIN_DELTA && progress < 1) {
        return;
      }
      this._installProgressLastEmittedValue = progress;
      this.emitter.emit('ui-event', {
        type: EConnectorInteraction.AppInstallProgress,
        payload: {
          connectId,
          appName,
          progress,
        },
      });
      return;
    }
    this.emitter.emit('ui-event', event);
  };

  private registerEventListeners(): void {
    this.connector.on('device-connect', this.deviceConnectHandler);
    this.connector.on('device-disconnect', this.deviceDisconnectHandler);
    this.connector.on('ui-event', this.uiEventForwarder);
  }

  private unregisterEventListeners(): void {
    this.connector.off('device-connect', this.deviceConnectHandler);
    this.connector.off('device-disconnect', this.deviceDisconnectHandler);
    this.connector.off('ui-event', this.uiEventForwarder);
  }

  // ---------------------------------------------------------------------------
  // Device info mapping
  // ---------------------------------------------------------------------------

  private connectorDeviceToDeviceInfo(device: ConnectorDevice): DeviceInfo {
    return {
      vendor: 'ledger',
      model: device.model ?? 'unknown',
      modelName: device.modelName,
      firmwareVersion: '',
      deviceId: device.deviceId,
      connectId: device.connectId,
      label: device.name,
      connectionType: device.connectionType ?? this.connector.connectionType,
      rssi: device.rssi,
      isConnectable: device.isConnectable,
      serialNumber: device.serialNumber,
      capabilities: device.capabilities,
    };
  }
}
