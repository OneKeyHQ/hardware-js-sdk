import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  TypedEventEmitter,
  UI_REQUEST,
  UiRequestRegistry,
  deriveDeviceFingerprint,
  failure,
  success,
} from '@onekeyfe/hwk-adapter-core';

import {
  isDeviceDisconnectedError,
  isDeviceLockedError,
  isTimeoutError,
  ledgerFailure,
  mapLedgerError,
} from '../errors';
import { debugError, debugLog } from '../utils/debugLog';

import type {
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
  ConnectorDevice,
  ConnectorUiEvent,
  DeviceEventListener,
  DeviceInfo,
  EvmAddress,
  EvmGetAddressParams,
  EvmSignMsgParams,
  EvmSignTxParams,
  EvmSignTypedDataParams,
  EvmSignature,
  EvmSignedTx,
  HardwareEvent,
  HardwareEventMap,
  IConnector,
  IHardwareWallet,
  Interruptibility,
  ProgressCallback,
  Response,
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
} from '@onekeyfe/hwk-adapter-core';

export interface LedgerAdapterOptions {
  /**
   * `true` — emit `REQUEST_SELECT_DEVICE` on multi-device discovery and await
   * `uiResponse({ type: RECEIVE_SELECT_DEVICE, payload: { sdkConnectId } })`.
   * `false` (default) — silently pick the first device.
   */
  handleSelectDevice?: boolean;
}

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

/**
 * Single source of truth for the `DeviceMismatch` error message.
 * Both fingerprints are 16-char deterministic hashes of fixed-path
 * testnet addresses — not secrets — so they're safe to surface in logs.
 */
function formatDeviceMismatchError(expected: string, actual: string): string {
  return `Wrong device: expected ${expected}, got ${actual}`;
}

/**
 * Ledger hardware wallet adapter that delegates to an IConnector.
 *
 * This is a thin translation layer that:
 * - Accepts a pre-configured IConnector (transport decisions are made at connector creation time)
 * - Translates IHardwareWallet method calls to connector.call() invocations
 * - Maps connector results/errors to our Response<T> format with enriched error messages
 * - Translates connector events to HardwareEventMap events
 * - Emits `REQUEST_DEVICE_PERMISSION` for OS-level permission checks
 */
export class LedgerAdapter implements IHardwareWallet {
  readonly vendor = 'ledger' as const;

  private readonly connector: IConnector;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _handleSelectDevice: boolean;

  // Device cache: tracks discovered devices from connector events
  private _discoveredDevices = new Map<string, DeviceInfo>();

  // Session tracking: maps connectId -> sessionId
  private _sessions = new Map<string, string>();

  private readonly _uiRegistry = new UiRequestRegistry();

  // Per-device serial job queue. Operations for the same device run sequentially;
  // conflicting ops are dispatched per `interruptibility` (see _getInterruptibility).
  private readonly _jobQueue: DeviceJobQueue;

  constructor(connector: IConnector, options?: LedgerAdapterOptions) {
    this.connector = connector;
    this._handleSelectDevice = options?.handleSelectDevice ?? false;
    this._jobQueue = new DeviceJobQueue({
      emit: (event, data) => this.emitter.emit(event, data),
      uiRegistry: this._uiRegistry,
    });
    this.registerEventListeners();
  }

  /**
   * Classify a method's interruptibility.
   * - Signing / typed data / transaction → 'confirm' (user may decide via preemption UI)
   * - Read-only queries (getAddress / getPublicKey / getMasterFingerprint) → 'safe'
   *   (auto-cancels any pending read for the same device)
   */
  private static _getInterruptibility(method: string): Interruptibility {
    if (method.toLowerCase().includes('sign')) return 'confirm';
    return 'safe';
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------
  // Transport is decided at connector creation time. These methods
  // satisfy the IHardwareWallet interface with sensible defaults.

  get activeTransport(): TransportType | null {
    // Ledger all-current-models use USB-HID for wired connection.
    return this.connector.connectionType === 'ble' ? 'ble' : 'hid';
  }

  getAvailableTransports(): TransportType[] {
    return this.activeTransport ? [this.activeTransport] : [];
  }

  async switchTransport(_type: TransportType): Promise<void> {
    // Ledger binds a single connector (transport) at construction time.
    // To use a different transport, create a new adapter with a different connector.
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async init(_config?: unknown): Promise<void> {
    // Connector is injected via constructor, already initialized.
    // Nothing to do here.
  }

  /**
   * Clear cached device/session state without tearing down the adapter.
   * Call before retrying after errors or when the device state may be stale.
   * The next operation will re-discover and re-connect automatically.
   */
  resetState(): void {
    this._discoveredDevices.clear();
    this._sessions.clear();
    this._connectingPromise = null;
    this._uiRegistry.reset();
    this._jobQueue.clear();
  }

  async dispose(): Promise<void> {
    this._uiRegistry.reset();
    this._jobQueue.clear();
    this.unregisterEventListeners();
    this.connector.reset();
    this._discoveredDevices.clear();
    this._sessions.clear();
    this.emitter.removeAllListeners();
  }

  uiResponse(response: UiResponseEvent): void {
    this._uiRegistry.resolve(response.type, response.payload);
  }

  // ---------------------------------------------------------------------------
  // Device management
  // ---------------------------------------------------------------------------

  async searchDevices(): Promise<DeviceInfo[]> {
    await this._ensureDevicePermission();

    const devices = await this.connector.searchDevices();
    debugLog('[DMK] adapter.searchDevices raw:', JSON.stringify(devices));

    // Update cache with scan results. connectId is now consistent
    // (BLE: "A58F" from _resolveConnectId, USB: DMK path) across all write points.
    for (const d of devices) {
      if (d.connectId) {
        this._discoveredDevices.set(d.connectId, this.connectorDeviceToDeviceInfo(d));
      }
    }

    // If no devices found, ensure permission (no connectId = search context)
    if (this._discoveredDevices.size === 0) {
      await this._ensureDevicePermission();
    }

    return Array.from(this._discoveredDevices.values());
  }

  async connectDevice(connectId: string): Promise<Response<string>> {
    await this._ensureDevicePermission(connectId);
    try {
      const session = await this.connector.connect(connectId);
      this._sessions.set(connectId, session.sessionId);

      // Update device cache with richer info from session
      if (session.deviceInfo) {
        this._discoveredDevices.set(connectId, session.deviceInfo);
      }

      return success(connectId);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  async disconnectDevice(connectId: string): Promise<void> {
    const sessionId = this._sessions.get(connectId);
    if (sessionId) {
      await this.connector.disconnect(sessionId);
      this._sessions.delete(connectId);
    }
  }

  async getDeviceInfo(connectId: string, deviceId: string): Promise<Response<DeviceInfo>> {
    await this._ensureDevicePermission(connectId, deviceId);

    // Look up the device in the cache populated by event handlers / searchDevices.
    // Try connectId first (the USB path), then fall back to scanning by deviceId.
    const cached =
      this._discoveredDevices.get(connectId) ??
      Array.from(this._discoveredDevices.values()).find(d => d.deviceId === deviceId);

    if (cached) {
      return success(cached);
    }

    return failure(
      HardwareErrorCode.DeviceNotFound,
      'Device not found in cache. Call searchDevices() or wait for a device-connected event first.'
    );
  }

  getSupportedChains(): ChainCapability[] {
    return ['evm', 'btc', 'sol', 'tron'];
  }

  // ---------------------------------------------------------------------------
  // Chain call helper
  // ---------------------------------------------------------------------------

  private async callChain<T>(
    connectId: string,
    deviceId: string,
    chain: string,
    method: string,
    params: unknown,
    skipFingerprint = false
  ): Promise<Response<T>> {
    await this._ensureDevicePermission(connectId, deviceId);
    try {
      const result = await this.connectorCall(connectId, method, params, {
        chain: chain as ChainForFingerprint,
        deviceId,
        skipFingerprint,
      });
      return success(result as T);
    } catch (err) {
      return this.errorToFailure(err);
    }
  }

  /**
   * Batch version of callChain — checks permission once,
   * fingerprint is verified on the first call inside connectorCall.
   */
  private async callChainBatch<TParam, TResult>(
    connectId: string,
    deviceId: string,
    chain: string,
    method: string,
    params: TParam[],
    onProgress?: ProgressCallback,
    skipFingerprint = false
  ): Promise<Response<TResult[]>> {
    await this._ensureDevicePermission(connectId, deviceId);
    const results: TResult[] = [];
    for (let i = 0; i < params.length; i++) {
      try {
        const result = await this.connectorCall(connectId, method, params[i], {
          chain: chain as ChainForFingerprint,
          deviceId,
          // Only verify fingerprint on the first call in the batch
          skipFingerprint: skipFingerprint || i > 0,
        });
        results.push(result as TResult);
        onProgress?.({ index: i, total: params.length });
      } catch (err) {
        return this.errorToFailure(err);
      }
    }
    return success(results);
  }

  // ---------------------------------------------------------------------------
  // EVM chain methods
  // ---------------------------------------------------------------------------

  evmGetAddress(connectId: string, deviceId: string, params: EvmGetAddressParams) {
    return this.callChain<EvmAddress>(connectId, deviceId, 'evm', 'evmGetAddress', params);
  }

  evmGetAddresses(
    connectId: string,
    deviceId: string,
    params: EvmGetAddressParams[],
    onProgress?: ProgressCallback
  ) {
    return this.callChainBatch<EvmGetAddressParams, EvmAddress>(
      connectId,
      deviceId,
      'evm',
      'evmGetAddress',
      params,
      onProgress
    );
  }

  evmSignTransaction(connectId: string, deviceId: string, params: EvmSignTxParams) {
    return this.callChain<EvmSignedTx>(connectId, deviceId, 'evm', 'evmSignTransaction', params);
  }

  evmSignMessage(connectId: string, deviceId: string, params: EvmSignMsgParams) {
    return this.callChain<EvmSignature>(connectId, deviceId, 'evm', 'evmSignMessage', params);
  }

  evmSignTypedData(connectId: string, deviceId: string, params: EvmSignTypedDataParams) {
    return this.callChain<EvmSignature>(connectId, deviceId, 'evm', 'evmSignTypedData', params);
  }

  // ---------------------------------------------------------------------------
  // BTC chain methods
  // ---------------------------------------------------------------------------

  btcGetAddress(connectId: string, deviceId: string, params: BtcGetAddressParams) {
    return this.callChain<BtcAddress>(connectId, deviceId, 'btc', 'btcGetAddress', params);
  }

  btcGetAddresses(
    connectId: string,
    deviceId: string,
    params: BtcGetAddressParams[],
    onProgress?: ProgressCallback
  ) {
    return this.callChainBatch<BtcGetAddressParams, BtcAddress>(
      connectId,
      deviceId,
      'btc',
      'btcGetAddress',
      params,
      onProgress
    );
  }

  btcGetPublicKey(connectId: string, deviceId: string, params: BtcGetPublicKeyParams) {
    return this.callChain<BtcPublicKey>(connectId, deviceId, 'btc', 'btcGetPublicKey', params);
  }

  btcSignTransaction(connectId: string, deviceId: string, params: BtcSignTxParams) {
    return this.callChain<BtcSignedTx>(connectId, deviceId, 'btc', 'btcSignTransaction', params);
  }

  btcSignPsbt(connectId: string, deviceId: string, params: BtcSignPsbtParams) {
    return this.callChain<BtcSignedPsbt>(connectId, deviceId, 'btc', 'btcSignPsbt', params);
  }

  btcSignMessage(connectId: string, deviceId: string, params: BtcSignMsgParams) {
    return this.callChain<BtcSignature>(connectId, deviceId, 'btc', 'btcSignMessage', params);
  }

  btcGetMasterFingerprint(connectId: string, deviceId: string) {
    return this.callChain<{ masterFingerprint: string }>(
      connectId,
      deviceId,
      'btc',
      'btcGetMasterFingerprint',
      {}
    );
  }

  // ---------------------------------------------------------------------------
  // SOL chain methods
  // ---------------------------------------------------------------------------

  solGetAddress(connectId: string, deviceId: string, params: SolGetAddressParams) {
    return this.callChain<SolAddress>(connectId, deviceId, 'sol', 'solGetAddress', params);
  }

  solGetAddresses(
    connectId: string,
    deviceId: string,
    params: SolGetAddressParams[],
    onProgress?: ProgressCallback
  ) {
    return this.callChainBatch<SolGetAddressParams, SolAddress>(
      connectId,
      deviceId,
      'sol',
      'solGetAddress',
      params,
      onProgress
    );
  }

  solSignTransaction(connectId: string, deviceId: string, params: SolSignTxParams) {
    return this.callChain<SolSignedTx>(connectId, deviceId, 'sol', 'solSignTransaction', params);
  }

  solSignMessage(connectId: string, deviceId: string, params: SolSignMsgParams) {
    return this.callChain<SolSignature>(connectId, deviceId, 'sol', 'solSignMessage', params);
  }

  // ---------------------------------------------------------------------------
  // TRON chain methods
  // ---------------------------------------------------------------------------

  tronGetAddress(connectId: string, deviceId: string, params: TronGetAddressParams) {
    return this.callChain<TronAddress>(connectId, deviceId, 'tron', 'tronGetAddress', params, true);
  }

  tronGetAddresses(
    connectId: string,
    deviceId: string,
    params: TronGetAddressParams[],
    onProgress?: ProgressCallback
  ) {
    return this.callChainBatch<TronGetAddressParams, TronAddress>(
      connectId,
      deviceId,
      'tron',
      'tronGetAddress',
      params,
      onProgress,
      true
    );
  }

  tronSignTransaction(connectId: string, deviceId: string, params: TronSignTxParams) {
    return this.callChain<TronSignedTx>(
      connectId,
      deviceId,
      'tron',
      'tronSignTransaction',
      params,
      true
    );
  }

  tronSignMessage(connectId: string, deviceId: string, params: TronSignMsgParams) {
    return this.callChain<TronSignature>(
      connectId,
      deviceId,
      'tron',
      'tronSignMessage',
      params,
      true
    );
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

  cancel(connectId: string): void {
    const sessionId = this._sessions.get(connectId) ?? connectId;
    // Force-cancel the active job so in-flight signer work aborts even if it's
    // marked non-interruptible; queue.clear would kill queued follow-ups too.
    this._jobQueue.forceCancelActive(connectId || '__ledger_default__');
    void this.connector.cancel(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Chain fingerprint
  // ---------------------------------------------------------------------------

  async getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>> {
    debugLog(
      '[LedgerAdapter] getChainFingerprint called, chain:',
      chain,
      'connectId:',
      connectId || '(empty)',
      'sessions:',
      this._sessions.size
    );
    await this._ensureDevicePermission(connectId, deviceId);
    debugLog('[LedgerAdapter] getChainFingerprint permission ok, computing fingerprint');
    try {
      const fingerprint = await this._computeChainFingerprint(chain, (method, params) =>
        this.connectorCall(connectId, method, params)
      );
      debugLog('[LedgerAdapter] getChainFingerprint result:', fingerprint?.substring(0, 20));
      return success(fingerprint);
    } catch (err) {
      debugError('[LedgerAdapter] getChainFingerprint error:', chain, err);
      return this.errorToFailure(err);
    }
  }

  /**
   * Verify fingerprint using an existing sessionId directly.
   * Safe to call inside connectorCall without causing queue deadlock.
   */
  private async _verifyDeviceFingerprintWithSession(
    sessionId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<IFingerprintVerifyResult> {
    if (!deviceId) return { success: true };

    try {
      const fingerprint = await this._computeChainFingerprint(chain, (method, params) =>
        this.connector.call(sessionId, method, params)
      );
      if (fingerprint === deviceId) {
        return { success: true };
      }
      return { success: false, expected: deviceId, actual: fingerprint };
    } catch (err) {
      const mapped = mapLedgerError(err);
      if (
        mapped.code === HardwareErrorCode.WrongApp ||
        mapped.code === HardwareErrorCode.DeviceLocked
      ) {
        return { success: true };
      }
      throw err;
    }
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
   * - Otherwise: search → 1 device: auto-connect, multiple: ask user, 0: throw.
   */
  private static readonly MAX_DEVICE_RETRY = 3;

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

    this.emitter.emit(UI_REQUEST.REQUEST_DEVICE_CONNECT, {
      type: UI_REQUEST.REQUEST_DEVICE_CONNECT,
      payload: {
        message: 'Please connect and unlock your Ledger device',
      },
    });

    const waitPromise = this._uiRegistry.wait<{ confirmed: boolean }>(
      UI_REQUEST.REQUEST_DEVICE_CONNECT
    );

    let payload: { confirmed: boolean } | undefined;
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

    if (!payload?.confirmed) {
      throw Object.assign(new Error('User cancelled Ledger connection'), {
        _tag: 'DeviceNotRecognizedError',
      });
    }
  }

  private async ensureConnected(connectId?: string): Promise<string> {
    // 1. Exact match — no mutex needed
    if (connectId && this._sessions.has(connectId)) {
      return connectId;
    }

    // 2. Any existing session (Ledger IDs are temporary, any session is fine)
    if (this._sessions.size > 0) {
      // size > 0 guarantees .next().value is defined
      const firstKey = this._sessions.keys().next().value as string;
      return firstKey;
    }

    // 3. No session — use mutex to prevent concurrent connection attempts
    if (this._connectingPromise) {
      return this._connectingPromise;
    }

    this._connectingPromise = this._doConnect();
    try {
      return await this._connectingPromise;
    } finally {
      this._connectingPromise = null;
    }
  }

  private async _doConnect(): Promise<string> {
    for (let attempt = 0; attempt < LedgerAdapter.MAX_DEVICE_RETRY; attempt++) {
      const devices = await this.searchDevices();

      if (devices.length > 0) {
        // Found device(s), continue to connection below
        return this._connectFirstOrSelect(devices);
      }

      // No device found — prompt user (except on last attempt)
      if (attempt < LedgerAdapter.MAX_DEVICE_RETRY - 1) {
        await this._waitForDeviceConnect();
      }
    }

    throw Object.assign(
      new Error(
        'No Ledger device found after multiple attempts. Please connect and unlock your device.'
      ),
      { _tag: 'DeviceNotRecognizedError' }
    );
  }

  private async _connectFirstOrSelect(devices: DeviceInfo[]): Promise<string> {
    const chosenConnectId =
      devices.length === 1 ? devices[0].connectId : await this._chooseDeviceFromList(devices);

    const result = await this.connectDevice(chosenConnectId);
    if (!result.success) {
      throw Object.assign(new Error(result.payload.error), {
        _tag: 'DeviceNotRecognizedError',
      });
    }
    return chosenConnectId;
  }

  private async _chooseDeviceFromList(devices: DeviceInfo[]): Promise<string> {
    if (!this._handleSelectDevice) {
      debugLog(
        `[DMK] Multiple Ledger devices found (${devices.length}); handleSelectDevice=false, picking first (${devices[0].connectId}).`
      );
      return devices[0].connectId;
    }

    this.emitter.emit(UI_REQUEST.REQUEST_SELECT_DEVICE, {
      type: UI_REQUEST.REQUEST_SELECT_DEVICE,
      payload: { devices },
    });

    const response = await this._uiRegistry.wait<{ sdkConnectId: string }>(
      UI_REQUEST.REQUEST_SELECT_DEVICE
    );

    const chosen = devices.find(d => d.connectId === response?.sdkConnectId);
    if (!chosen) {
      throw Object.assign(
        new Error(`Selected sdkConnectId '${response?.sdkConnectId}' not in discovered list`),
        { _tag: 'DeviceNotRecognizedError' }
      );
    }
    return chosen.connectId;
  }

  /**
   * Call the connector with automatic session resolution and disconnect retry.
   *
   * 1. Resolves a valid connectId via ensureConnected()
   * 2. Looks up sessionId from _sessions
   * 3. Calls connector.call()
   * 4. On disconnect error: clears stale session, re-connects, retries once
   */
  private async connectorCall(
    connectId: string,
    method: string,
    params: unknown,
    fingerprint?: {
      chain: ChainForFingerprint;
      deviceId: string;
      skipFingerprint: boolean;
    }
  ): Promise<unknown> {
    debugLog('[LedgerAdapter] connectorCall:', method, 'connectId:', connectId || '(empty)');

    // Queue key: prefer the supplied connectId; fall back to a shared bucket so that
    // calls made before any session exists still serialize (Ledger only has one active device).
    const queueKey = connectId || '__ledger_default__';
    const interruptibility = LedgerAdapter._getInterruptibility(method);

    return this._jobQueue.enqueue(
      queueKey,
      async signal => this._runConnectorCall(connectId, method, params, signal, fingerprint),
      { interruptibility, label: method }
    );
  }

  /**
   * Race a promise against an abort signal. If the signal fires, rejects with the
   * signal's reason (or a generic Error). The underlying connector.call() cannot
   * actually be cancelled on Ledger DMK, but the caller gets the abort immediately.
   */
  private static _abortable<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
    if (signal.aborted) {
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
    fingerprint?: {
      chain: ChainForFingerprint;
      deviceId: string;
      skipFingerprint: boolean;
    }
  ): Promise<unknown> {
    LedgerAdapter._throwIfAborted(signal);
    // Wrap ensureConnected in _abortable so an abort during device discovery /
    // user-connect UI wait rejects this caller immediately. The underlying
    // _doConnect / _connectingPromise is shared across callers and continues
    // running — other concurrent callers aren't affected.
    const resolvedConnectId = await LedgerAdapter._abortable(
      signal,
      this.ensureConnected(connectId)
    );
    LedgerAdapter._throwIfAborted(signal);
    const sessionId = this._sessions.get(resolvedConnectId);
    debugLog(
      '[LedgerAdapter] connectorCall resolved:',
      method,
      'resolvedConnectId:',
      resolvedConnectId,
      'sessionId:',
      sessionId
    );
    if (!sessionId) {
      throw Object.assign(new Error('Auto-connect succeeded but no session found'), {
        _tag: 'DeviceSessionNotFound',
      });
    }

    // Fingerprint verification inside the session — atomic with the actual call
    if (fingerprint && !fingerprint.skipFingerprint && fingerprint.deviceId) {
      const fp = await LedgerAdapter._abortable(
        signal,
        this._verifyDeviceFingerprintWithSession(sessionId, fingerprint.deviceId, fingerprint.chain)
      );
      if (!fp.success) {
        throw Object.assign(new Error(formatDeviceMismatchError(fp.expected, fp.actual)), {
          code: HardwareErrorCode.DeviceMismatch,
        });
      }
    }

    try {
      return await LedgerAdapter._abortable(signal, this.connector.call(sessionId, method, params));
    } catch (err) {
      // If the abort fired, surface it directly — skip recovery paths.
      if (signal.aborted) throw err;
      const errObj = err as Record<string, unknown> | null | undefined;
      debugLog('[LedgerAdapter] connectorCall error:', method, {
        message: errObj?.message,
        _tag: errObj?._tag,
        errorCode: errObj?.errorCode,
        statusCode: errObj?.statusCode,
        isDisconnected: isDeviceDisconnectedError(err),
        isLocked: isDeviceLockedError(err),
      });
      if (isDeviceDisconnectedError(err)) {
        debugLog('[LedgerAdapter] disconnected, retrying with fresh connection...');
        this._discoveredDevices.clear();
        return this._retryWithFreshConnection(resolvedConnectId, method, params, signal, err);
      }
      if (isDeviceLockedError(err)) {
        await this._waitForDeviceConnect(signal);
        LedgerAdapter._throwIfAborted(signal);
        return LedgerAdapter._abortable(signal, this.connector.call(sessionId, method, params));
      }
      if (isTimeoutError(err)) {
        debugLog('[LedgerAdapter] timeout, retrying with fresh connection...');
        this._discoveredDevices.delete(resolvedConnectId);
        return this._retryWithFreshConnection(resolvedConnectId, method, params, signal, err);
      }
      throw err;
    }
  }

  /** Clear stale session, reconnect, and retry the call. */
  private async _retryWithFreshConnection(
    resolvedConnectId: string,
    method: string,
    params: unknown,
    signal: AbortSignal,
    originalErr: unknown
  ): Promise<unknown> {
    this._sessions.delete(resolvedConnectId);
    LedgerAdapter._throwIfAborted(signal);
    const retryConnectId = await this.ensureConnected();
    LedgerAdapter._throwIfAborted(signal);
    const retrySessionId = this._sessions.get(retryConnectId);
    if (!retrySessionId) {
      throw originalErr;
    }
    return LedgerAdapter._abortable(signal, this.connector.call(retrySessionId, method, params));
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
  private async _ensureDevicePermission(connectId?: string, deviceId?: string): Promise<void> {
    const transportType: TransportType = this.activeTransport ?? 'hid';

    // Register the wait before emitting — a synchronous listener that replies
    // immediately (e.g. in tests or a same-process consumer) would otherwise
    // resolve before any pending entry exists and the response would drop.
    const waitPromise = this._uiRegistry.wait<{ granted: boolean }>(
      UI_REQUEST.REQUEST_DEVICE_PERMISSION,
      { timeoutMs: 60_000 }
    );

    this.emitter.emit(UI_REQUEST.REQUEST_DEVICE_PERMISSION, {
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

  /**
   * Convert a thrown error to a Response failure.
   * Uses mapLedgerError to parse Ledger DMK error codes into HardwareErrorCode values.
   */
  private errorToFailure<T>(err: unknown): Response<T> {
    debugError('[LedgerAdapter] error:', err);

    // If the error carries an explicit HardwareErrorCode (e.g. validation errors
    // thrown by connector chain methods), use it directly.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'number'
    ) {
      const e = err as { code: number; message?: string; appName?: string };
      return ledgerFailure(e.code, e.message ?? 'Unknown error', e.appName);
    }

    const mapped = mapLedgerError(err);

    // DeviceLocked is handled by connectorCall retry logic (_waitForDeviceConnect).
    // Do NOT emit UI events here — it would show UI and return error simultaneously.

    return ledgerFailure(mapped.code, mapped.message, mapped.appName);
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
    this._discoveredDevices.delete(data.connectId);
    this._sessions.delete(data.connectId);
    this.emitter.emit(DEVICE.DISCONNECT, {
      type: DEVICE.DISCONNECT,
      payload: { connectId: data.connectId },
    });
  };

  // Forward low-level connector 'ui-event' (the four EConnectorInteraction values)
  // to the public hw.emitter so consumers only need to subscribe in one place
  // (hw.on instead of also reaching into connector.on).
  private uiEventForwarder = (event: ConnectorUiEvent): void => {
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
    // BLE connectId is a stable 4-digit HEX (e.g. "A58F") from device name.
    // USB connectId is an ephemeral UUID. Use this to infer connectionType.
    const isBle = device.connectId && /^[0-9A-Fa-f]{4}$/.test(device.connectId);

    return {
      vendor: 'ledger',
      model: device.model ?? 'unknown',
      firmwareVersion: '',
      deviceId: device.deviceId,
      connectId: device.connectId,
      label: device.name,
      connectionType: isBle ? 'ble' : 'usb',
      capabilities: device.capabilities,
    };
  }
}
