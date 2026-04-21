import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
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
  ConnectionType,
  ConnectorDevice,
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
  IUiHandler,
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
 * - Integrates with IUiHandler for permission flows
 */
export class LedgerAdapter implements IHardwareWallet {
  readonly vendor = 'ledger' as const;

  private readonly connector: IConnector;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private _uiHandler: Partial<IUiHandler> | null = null;

  private readonly _handleSelectDevice: boolean;

  // Device cache: tracks discovered devices from connector events
  private _discoveredDevices = new Map<string, DeviceInfo>();

  // Session tracking: maps connectId -> sessionId
  private _sessions = new Map<string, string>();

  private readonly _uiRegistry = new UiRequestRegistry();

  constructor(connector: IConnector, options?: LedgerAdapterOptions) {
    this.connector = connector;
    this._handleSelectDevice = options?.handleSelectDevice ?? false;
    this.registerEventListeners();
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------
  // Transport is decided at connector creation time. These methods
  // satisfy the IHardwareWallet interface with sensible defaults.

  get activeTransport(): TransportType | null {
    return 'hid';
  }

  getAvailableTransports(): TransportType[] {
    return ['hid'];
  }

  async switchTransport(_type: TransportType): Promise<void> {
    // Transport is fixed at connector creation time.
    // To switch transport, create a new LedgerAdapter with a different connector.
  }

  // ---------------------------------------------------------------------------
  // UI handler
  // ---------------------------------------------------------------------------

  setUiHandler(handler: Partial<IUiHandler>): void {
    this._uiHandler = handler;
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
  }

  async dispose(): Promise<void> {
    this._uiRegistry.reset();
    this.unregisterEventListeners();
    this.connector.reset();
    this._uiHandler = null;
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
    debugLog(
      '[LedgerAdapter] getChainFingerprint permission ok, calling _deriveAddressForFingerprint'
    );
    try {
      const raw = await this._deriveAddressForFingerprint(connectId, chain);
      debugLog('[LedgerAdapter] getChainFingerprint raw:', raw?.substring(0, 20));
      // BTC raw is already the BIP32 master fingerprint (8 hex) — use as-is
      // so the caller can reuse it for BIP380 descriptors / PSBT signing.
      // Other chains: FNV-hash the derived address for an opaque seed identifier.
      return success(chain === 'btc' ? raw : deriveDeviceFingerprint(raw));
    } catch (err) {
      debugError(
        '[LedgerAdapter] getChainFingerprint error in _deriveAddressForFingerprint:',
        chain,
        err
      );
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
      const raw = await this._deriveAddressWithSession(sessionId, chain);
      // Match getChainFingerprint's format: BTC uses raw master fingerprint,
      // other chains use the FNV-derived identifier.
      const fingerprint = chain === 'btc' ? raw : deriveDeviceFingerprint(raw);
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
   * Derive an address at the fixed testnet path for fingerprint generation.
   * Uses connectorCall (goes through ensureConnected). For public API use.
   */
  private async _deriveAddressForFingerprint(
    connectId: string,
    chain: ChainForFingerprint
  ): Promise<string> {
    const path = CHAIN_FINGERPRINT_PATHS[chain];

    if (chain === 'evm') {
      const result = (await this.connectorCall(connectId, 'evmGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    if (chain === 'btc') {
      // BTC fingerprint = BIP32 master fingerprint (8 hex). Dedicated device
      // call; reusable as the xfp in BIP380 descriptors and PSBT signing.
      const result = (await this.connectorCall(connectId, 'btcGetMasterFingerprint', {})) as {
        masterFingerprint: string;
      };
      return result.masterFingerprint;
    }

    if (chain === 'sol') {
      const result = (await this.connectorCall(connectId, 'solGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    if (chain === 'tron') {
      const result = (await this.connectorCall(connectId, 'tronGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    throw new Error(`Unsupported chain for fingerprint: ${chain as string}`);
  }

  /**
   * Derive an address using an existing sessionId directly.
   * Does NOT go through connectorCall — safe to call inside connectorCall
   * without causing queue deadlock.
   */
  private async _deriveAddressWithSession(
    sessionId: string,
    chain: ChainForFingerprint
  ): Promise<string> {
    const path = CHAIN_FINGERPRINT_PATHS[chain];

    if (chain === 'evm') {
      const result = (await this.connector.call(sessionId, 'evmGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    if (chain === 'btc') {
      // Mirrors _deriveAddressForFingerprint: BTC returns the BIP32 master
      // fingerprint directly, so verification also compares it verbatim.
      const result = (await this.connector.call(sessionId, 'btcGetMasterFingerprint', {})) as {
        masterFingerprint: string;
      };
      return result.masterFingerprint;
    }

    if (chain === 'sol') {
      const result = (await this.connector.call(sessionId, 'solGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    if (chain === 'tron') {
      const result = (await this.connector.call(sessionId, 'tronGetAddress', {
        path,
        showOnDevice: false,
      })) as { address: string };
      return result.address;
    }

    throw new Error(`Unsupported chain for fingerprint: ${chain as string}`);
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
  private async _waitForDeviceConnect(attempt: number): Promise<void> {
    this.emitter.emit(UI_REQUEST.REQUEST_DEVICE_CONNECT, {
      type: UI_REQUEST.REQUEST_DEVICE_CONNECT,
      payload: {
        message: 'Please connect and unlock your Ledger device',
        retryCount: attempt,
        maxRetries: LedgerAdapter.MAX_DEVICE_RETRY,
      },
    });

    const payload = await this._uiRegistry.wait<{ confirmed: boolean }>(
      UI_REQUEST.REQUEST_DEVICE_CONNECT
    );

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
        await this._waitForDeviceConnect(attempt + 1);
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
    const resolvedConnectId = await this.ensureConnected(connectId);
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
      const fp = await this._verifyDeviceFingerprintWithSession(
        sessionId,
        fingerprint.deviceId,
        fingerprint.chain
      );
      if (!fp.success) {
        throw Object.assign(new Error(formatDeviceMismatchError(fp.expected, fp.actual)), {
          code: HardwareErrorCode.DeviceMismatch,
        });
      }
    }

    try {
      return await this.connector.call(sessionId, method, params);
    } catch (err) {
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
        return this._retryWithFreshConnection(resolvedConnectId, method, params, err);
      }
      if (isDeviceLockedError(err)) {
        await this._waitForDeviceConnect(0);
        return this.connector.call(sessionId, method, params);
      }
      if (isTimeoutError(err)) {
        debugLog('[LedgerAdapter] timeout, retrying with fresh connection...');
        this._discoveredDevices.delete(resolvedConnectId);
        return this._retryWithFreshConnection(resolvedConnectId, method, params, err);
      }
      throw err;
    }
  }

  /** Clear stale session, reconnect, and retry the call. */
  private async _retryWithFreshConnection(
    resolvedConnectId: string,
    method: string,
    params: unknown,
    originalErr: unknown
  ): Promise<unknown> {
    this._sessions.delete(resolvedConnectId);
    const retryConnectId = await this.ensureConnected();
    const retrySessionId = this._sessions.get(retryConnectId);
    if (!retrySessionId) {
      throw originalErr;
    }
    return this.connector.call(retrySessionId, method, params);
  }

  /**
   * Ensure device permission before proceeding.
   * - No connectId (searchDevices): check environment-level permission
   * - With connectId (business methods): check device-level permission
   * If not granted, calls onDevicePermission so the consumer can request access.
   */
  private async _ensureDevicePermission(connectId?: string, deviceId?: string): Promise<void> {
    const transportType: TransportType = 'hid';
    let granted = false;
    let context: Record<string, unknown> | undefined;

    if (this._uiHandler?.checkDevicePermission) {
      try {
        const result = await this._uiHandler.checkDevicePermission({
          transportType,
          connectId,
          deviceId,
        });
        granted = result.granted;
        context = result.context;
      } catch {
        granted = false;
      }
    }

    if (!granted) {
      try {
        await this._uiHandler?.onDevicePermission?.({ transportType, context });
      } catch {
        // UI handler cancelled or failed
      }
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
      return failure(e.code, e.message ?? 'Unknown error', e.appName);
    }

    const mapped = mapLedgerError(err);

    // DeviceLocked is handled by connectorCall retry logic (_waitForDeviceConnect).
    // Do NOT emit UI events here — it would show UI and return error simultaneously.

    return failure(mapped.code, mapped.message, mapped.appName);
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

  private uiRequestHandler = (data: { type: string; payload?: unknown }): void => {
    this.handleUiEvent(data);
  };

  private uiEventHandler = (data: { type: string; payload?: unknown }): void => {
    this.handleUiEvent(data);
  };

  private registerEventListeners(): void {
    this.connector.on('device-connect', this.deviceConnectHandler);
    this.connector.on('device-disconnect', this.deviceDisconnectHandler);
    this.connector.on('ui-request', this.uiRequestHandler);
    this.connector.on('ui-event', this.uiEventHandler);
  }

  private unregisterEventListeners(): void {
    this.connector.off('device-connect', this.deviceConnectHandler);
    this.connector.off('device-disconnect', this.deviceDisconnectHandler);
    this.connector.off('ui-request', this.uiRequestHandler);
    this.connector.off('ui-event', this.uiEventHandler);
  }

  private handleUiEvent(event: { type: string; payload?: unknown }): void {
    if (!event.type) return;

    const payload = event.payload as Record<string, unknown> | undefined;
    const deviceInfo = payload ? this.extractDeviceInfoFromPayload(payload) : this.unknownDevice();

    switch (event.type) {
      case 'ui-request_confirmation':
        this.emitter.emit(UI_REQUEST.REQUEST_BUTTON, {
          type: UI_REQUEST.REQUEST_BUTTON,
          payload: { device: deviceInfo },
        });
        break;
    }
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

  private extractDeviceInfoFromPayload(payload: Record<string, unknown>): DeviceInfo {
    return {
      vendor: 'ledger',
      model: (payload.model as string) ?? 'unknown',
      firmwareVersion: '',
      deviceId: (payload.deviceId as string) ?? (payload.id as string) ?? '',
      connectId: (payload.connectId as string) ?? (payload.path as string) ?? '',
      label: payload.label as string,
      connectionType: 'usb' as ConnectionType,
    };
  }

  private unknownDevice(): DeviceInfo {
    return {
      vendor: 'ledger',
      model: 'unknown',
      firmwareVersion: '',
      deviceId: '',
      connectId: '',
      connectionType: 'usb',
    };
  }
}
