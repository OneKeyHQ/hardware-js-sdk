import { LedgerDeviceManager } from '../device/LedgerDeviceManager';
import { SignerManager } from '../signer/SignerManager';
import { mapLedgerError } from '../errors';
import { debugLog } from '../utils/debugLog';
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
  solGetAddress,
  solSignMessage,
  solSignTransaction,
  tronGetAddress,
  tronSignMessage,
  tronSignTransaction,
} from './chains';

import type { ConnectorContext } from './chains/types';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type {
  ConnectionType,
  ConnectorDevice,
  ConnectorEventMap,
  ConnectorEventType,
  ConnectorSession,
  DeviceDescriptor,
  IConnector,
  TronSignMsgParams,
  UiResponseEvent,
} from '@onekeyfe/hwk-adapter-core';
import type {
  BtcGetAddressCallParams,
  BtcGetPublicKeyCallParams,
  BtcSignMessageCallParams,
  BtcSignPsbtCallParams,
  BtcSignTransactionCallParams,
  EvmGetAddressCallParams,
  EvmSignMessageCallParams,
  EvmSignTransactionCallParams,
  EvmSignTypedDataCallParams,
  SolGetAddressCallParams,
  SolSignMessageCallParams,
  SolSignTransactionCallParams,
  TronGetAddressCallParams,
  TronSignMessageCallParams,
  TronSignTransactionCallParams,
} from './chains';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A function that lazily loads and returns the transport factory
 * for the Ledger DMK builder (e.g. webHidTransportFactory, rnBleTransportFactory).
 */
export type TransportFactory = () => Promise<unknown>;

export interface LedgerConnectorBaseOptions {
  /**
   * Pre-built DMK instance. If not provided, a DMK will be created
   * lazily on first use via the transport factory.
   */
  dmk?: DeviceManagementKit;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type EventHandler<K extends ConnectorEventType> = (data: ConnectorEventMap[K]) => void;

// ---------------------------------------------------------------------------
// Default signer kit importer (webpack/rspack — uses "exports" field)
// ---------------------------------------------------------------------------

/**
 * Default importer for Ledger signer kit packages.
 * Uses bare module specifiers — works with bundlers that support "exports".
 * Metro (React Native) can't resolve these; pass a custom importer that
 * uses CJS paths (e.g. `@ledgerhq/device-signer-kit-ethereum/lib/cjs/index.js`).
 */
async function defaultLedgerKitImporter(pkg: string): Promise<any> {
  switch (pkg) {
    case '@ledgerhq/device-management-kit':
      return import('@ledgerhq/device-management-kit');
    case '@ledgerhq/device-signer-kit-ethereum':
      return import('@ledgerhq/device-signer-kit-ethereum');
    case '@ledgerhq/device-signer-kit-bitcoin':
      return import('@ledgerhq/device-signer-kit-bitcoin');
    case '@ledgerhq/device-signer-kit-solana':
      return import('@ledgerhq/device-signer-kit-solana');
    default:
      throw new Error(`Unknown Ledger kit package: ${pkg}`);
  }
}

// ---------------------------------------------------------------------------
// LedgerConnectorBase
// ---------------------------------------------------------------------------

/**
 * Shared base class for Ledger IConnector implementations.
 *
 * Encapsulates all shared logic: device discovery, connection management,
 * method dispatch (EVM / BTC / SOL / TRON), signer lifecycle, event emission,
 * and error handling.
 *
 * Chain-specific method implementations live in `./chains/` and receive
 * a ConnectorContext that exposes shared helpers.
 *
 * Subclasses only need to:
 * 1. Supply a transport factory via the constructor.
 * 2. Optionally override `_resolveConnectId()` for transport-specific
 *    device identity resolution (e.g. BLE hex ID extraction).
 */
export class LedgerConnectorBase implements IConnector {
  private _deviceManager: LedgerDeviceManager | null = null;

  private _signerManager: SignerManager | null = null;

  private _dmk: DeviceManagementKit | null = null;

  private readonly _eventHandlers = new Map<
    ConnectorEventType,
    Set<EventHandler<ConnectorEventType>>
  >();

  private readonly _providedDmk: DeviceManagementKit | undefined;

  private readonly _createTransport: TransportFactory;

  public readonly connectionType: ConnectionType;

  // ---------------------------------------------------------------------------
  // ConnectId <-> DMK path mapping
  //
  // DMK uses internal paths (BLE MAC, USB UUID) that may change across sessions.
  // _resolveConnectId() maps these to stable external IDs (BLE: "A58F", USB: same).
  // This bidirectional map is the SINGLE SOURCE OF TRUTH for all connectId usage.
  // ---------------------------------------------------------------------------
  private _connectIdToPath = new Map<string, string>(); // "A58F" -> "D5:75:7D:4B:51:E8"

  private _pathToConnectId = new Map<string, string>(); // "D5:75:7D:4B:51:E8" -> "A58F"

  /** Register a connectId <-> path mapping from a device descriptor. */
  private _registerDeviceId(descriptor: DeviceDescriptor): string {
    const connectId = this._resolveConnectId(descriptor);
    this._connectIdToPath.set(connectId, descriptor.path);
    this._pathToConnectId.set(descriptor.path, connectId);
    return connectId;
  }

  /** Get DMK path from external connectId. Falls back to connectId itself. */
  private _getPathForConnectId(connectId: string): string {
    return this._connectIdToPath.get(connectId) ?? connectId;
  }

  /** Get external connectId from DMK path. Falls back to path itself. */
  private _getConnectIdForPath(path: string): string {
    return this._pathToConnectId.get(path) ?? path;
  }

  // ---------------------------------------------------------------------------
  // Per-session DeviceAction cancellers
  //
  // Each chain handler registers its active DeviceAction's canceller via
  // ctx.registerCanceller(sessionId, cancel) and clears it on completion.
  // IConnector.cancel(sessionId) invokes the registered canceller, which
  // unsubscribes the observable and releases DMK's IntentQueue slot.
  // ---------------------------------------------------------------------------
  private readonly _cancellers = new Map<string, () => void>();

  /**
   * Resolves a Ledger signer kit module by package name.
   * Override via constructor to use CJS paths for Metro (React Native).
   * Default: dynamic import with bare specifier (webpack/rspack).
   */
  protected _importLedgerKit: (pkg: string) => Promise<any>;

  /** Context object passed to per-chain handler functions. */
  private readonly _ctx: ConnectorContext;

  constructor(
    createTransport: TransportFactory,
    options?: {
      connectionType?: ConnectionType;
      dmk?: DeviceManagementKit;
      /**
       * Override how `@ledgerhq/device-signer-kit-*` packages are imported.
       * Default: `(pkg) => import(pkg)` — works with webpack/rspack.
       * For Metro (React Native): pass a resolver that uses CJS paths.
       */
      importLedgerKit?: (pkg: string) => Promise<any>;
    }
  ) {
    this._createTransport = createTransport;
    this.connectionType = options?.connectionType ?? 'usb';
    this._providedDmk = options?.dmk;
    this._importLedgerKit = options?.importLedgerKit ?? defaultLedgerKitImporter;
    if (this._providedDmk) {
      this._initManagers(this._providedDmk);
    }

    // Build the context that chain handlers use
    this._ctx = {
      emit: <K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]) =>
        this._emit(event, data),
      invalidateSession: sid => this._invalidateSession(sid),
      wrapError: err => this._wrapError(err),
      getOrCreateDmk: () => this._getOrCreateDmk(),
      getDeviceManager: () => this._getDeviceManager(),
      getSignerManager: () => this._getSignerManager(),
      clearAllSigners: () => this._signerManager?.clearAll(),
      replaceSession: (oldSid, newSid) => this._replaceSession(oldSid, newSid),
      registerCanceller: (sid, cancel) => this._cancellers.set(sid, cancel),
      clearCanceller: sid => this._cancellers.delete(sid),
      importLedgerKit: this._importLedgerKit,
    };
  }

  // ---------------------------------------------------------------------------
  // Protected — hooks for subclasses
  // ---------------------------------------------------------------------------

  /**
   * Resolve the connectId for a discovered device descriptor.
   * Default: use the DMK path (ephemeral UUID).
   * Override in subclasses to extract stable identifiers (e.g. BLE hex ID).
   */
  protected _resolveConnectId(descriptor: DeviceDescriptor): string {
    return descriptor.path;
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Device discovery
  // ---------------------------------------------------------------------------

  async searchDevices(): Promise<ConnectorDevice[]> {
    const dm = await this._getDeviceManager();

    let descriptors = await dm.enumerate();

    // If no devices found, trigger permission dialog / BLE scanning via startDiscovering
    if (descriptors.length === 0) {
      try {
        await dm.requestDevice();
      } catch {
        // User may cancel the permission dialog -- that's OK
      }
      descriptors = await dm.enumerate();
    }

    const result: ConnectorDevice[] = descriptors.map(d => {
      const connectId = this._registerDeviceId(d);
      return {
        connectId,
        deviceId: d.path,
        name: d.name || d.type || 'Ledger',
        model: d.type,
      };
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Connection
  // ---------------------------------------------------------------------------

  async connect(deviceId?: string): Promise<ConnectorSession> {
    const dm = await this._getDeviceManager();
    await this.searchDevices();

    // Resolve external connectId -> DMK path via mapping table
    const dmkPath = deviceId ? this._getPathForConnectId(deviceId) : undefined;

    // If no path found, pick first available device
    let targetPath = dmkPath;
    if (!targetPath) {
      const descriptors = await dm.enumerate();
      if (descriptors.length === 0) {
        throw new Error(
          `No Ledger device found. Make sure the device is connected${
            this.connectionType === 'ble' ? ' nearby with Bluetooth enabled' : ' via USB'
          } and unlocked.`
        );
      }
      targetPath = descriptors[0].path;
    }

    // External connectId for session/events — always use the mapped ID
    const externalConnectId = this._getConnectIdForPath(targetPath);

    const doConnect = async (path: string): Promise<ConnectorSession> => {
      const sessionId = await dm.connect(path);
      const session: ConnectorSession = {
        sessionId,
        deviceInfo: {
          vendor: 'ledger',
          model: 'unknown',
          firmwareVersion: 'unknown',
          deviceId: path,
          connectId: externalConnectId,
          connectionType: this.connectionType,
          capabilities: { persistentDeviceIdentity: false },
        },
      };
      this._emit('device-connect', {
        device: {
          connectId: externalConnectId,
          deviceId: path,
          name: 'Ledger',
        },
      });
      return session;
    };

    try {
      return await doConnect(targetPath);
    } catch {
      // Retry once: clear signer state but keep DMK (and BLE scan) alive
      this._resetSignersAndSessions();
      const dm2 = await this._getDeviceManager();
      await this.searchDevices();

      // Re-resolve path — device may have been re-discovered with new DMK path
      const retryPath = this._getPathForConnectId(externalConnectId);
      if (!retryPath || retryPath === externalConnectId) {
        // Mapping not found — try first available
        const descriptors = await dm2.enumerate();
        if (descriptors.length === 0) {
          throw new Error(
            `No Ledger device found after retry. Make sure the device is connected${
              this.connectionType === 'ble' ? ' nearby with Bluetooth enabled' : ' via USB'
            } and unlocked.`
          );
        }
        return doConnect(descriptors[0].path);
      }
      return doConnect(retryPath);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    if (!this._deviceManager) return;

    const deviceId = this._deviceManager.getDeviceId(sessionId);
    this._signerManager?.invalidate(sessionId);
    await this._deviceManager.disconnect(sessionId);

    if (deviceId) {
      this._emit('device-disconnect', { connectId: deviceId });
    }
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Method dispatch
  // ---------------------------------------------------------------------------

  async call(sessionId: string, method: string, params: unknown): Promise<unknown> {
    debugLog('[DMK] call:', method, JSON.stringify(params));
    switch (method) {
      // EVM
      case 'evmGetAddress':
        return evmGetAddress(this._ctx, sessionId, params as EvmGetAddressCallParams);
      case 'evmSignTransaction':
        return evmSignTransaction(this._ctx, sessionId, params as EvmSignTransactionCallParams);
      case 'evmSignMessage':
        return evmSignMessage(this._ctx, sessionId, params as EvmSignMessageCallParams);
      case 'evmSignTypedData':
        return evmSignTypedData(this._ctx, sessionId, params as EvmSignTypedDataCallParams);
      // BTC
      case 'btcGetAddress':
        return btcGetAddress(this._ctx, sessionId, params as BtcGetAddressCallParams);
      case 'btcGetPublicKey':
        return btcGetPublicKey(this._ctx, sessionId, params as BtcGetPublicKeyCallParams);
      case 'btcSignTransaction':
        return btcSignTransaction(this._ctx, sessionId, params as BtcSignTransactionCallParams);
      case 'btcSignPsbt':
        return btcSignPsbt(this._ctx, sessionId, params as BtcSignPsbtCallParams);
      case 'btcSignMessage':
        return btcSignMessage(this._ctx, sessionId, params as BtcSignMessageCallParams);
      case 'btcGetMasterFingerprint':
        return btcGetMasterFingerprint(
          this._ctx,
          sessionId,
          params as { skipOpenApp?: boolean } | undefined
        );
      // SOL
      case 'solGetAddress':
        return solGetAddress(this._ctx, sessionId, params as SolGetAddressCallParams);
      case 'solSignTransaction':
        return solSignTransaction(this._ctx, sessionId, params as SolSignTransactionCallParams);
      case 'solSignMessage':
        return solSignMessage(this._ctx, sessionId, params as SolSignMessageCallParams);
      // TRON
      case 'tronGetAddress':
        return tronGetAddress(this._ctx, sessionId, params as TronGetAddressCallParams);
      case 'tronSignTransaction':
        return tronSignTransaction(this._ctx, sessionId, params as TronSignTransactionCallParams);
      case 'tronSignMessage': {
        // Explicit public→internal mapping so a field-name drift fails at
        // compile time, not silently at runtime (see bug: public `messageHex`
        // vs internal `messageHex` field name enforcement).
        const p = params as TronSignMsgParams;
        const internalParams: TronSignMessageCallParams = {
          path: p.path,
          messageHex: p.messageHex,
        };
        return tronSignMessage(this._ctx, sessionId, internalParams);
      }
      default:
        throw new Error(`LedgerConnector: unknown method "${method}"`);
    }
  }

  async cancel(sessionId: string): Promise<void> {
    // Invoke the active DeviceAction canceller (registered by the chain handler).
    // This unsubscribes the observable and releases DMK's IntentQueue slot so
    // the next call on this session isn't blocked behind an orphaned intent.
    //
    // Note: Ledger devices have no hardware-level APDU abort. If the user has
    // an on-device confirmation prompt pending, it will remain until the user
    // presses Reject or the device times out.
    const cancel = this._cancellers.get(sessionId);
    if (cancel) {
      this._cancellers.delete(sessionId);
      try {
        cancel();
      } catch {
        // canceller may have already been invoked; ignore
      }
    }
  }

  uiResponse(_response: UiResponseEvent): void {
    // Ledger does not use interactive UI responses (PIN/passphrase)
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Events
  // ---------------------------------------------------------------------------

  on<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler as EventHandler<ConnectorEventType>);
  }

  off<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    this._eventHandlers.get(event)?.delete(handler as EventHandler<ConnectorEventType>);
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this._resetAll();
  }

  // ---------------------------------------------------------------------------
  // Private -- DMK / Manager lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Lazily create or return the DMK instance.
   * If a DMK was provided via constructor, it is used directly.
   * Otherwise, one is created via the transport factory.
   */
  protected async _getOrCreateDmk(): Promise<DeviceManagementKit> {
    debugLog(
      '[DMK] _getOrCreateDmk called, _dmk exists:',
      !!this._dmk,
      '_providedDmk exists:',
      !!this._providedDmk
    );
    if (this._dmk) return this._dmk;

    if (this._providedDmk) {
      this._dmk = this._providedDmk;
      return this._dmk;
    }

    const { DeviceManagementKitBuilder } = await this._importLedgerKit(
      '@ledgerhq/device-management-kit'
    );
    const transportFactory = await this._createTransport();

    debugLog('[DMK] _getOrCreateDmk: transportFactory type:', typeof transportFactory);

    const dmk: DeviceManagementKit = new DeviceManagementKitBuilder()
      .addTransport(transportFactory)
      .build();
    this._dmk = dmk;

    debugLog('[DMK] _getOrCreateDmk: DMK created');

    return dmk;
  }

  private _initManagers(dmk: DeviceManagementKit): void {
    this._dmk = dmk;
    this._deviceManager = new LedgerDeviceManager(dmk);

    // Pass a custom ETH signer builder that uses _importLedgerKit,
    // so the BLE connector's CJS override applies to ETH too.
    const importKit = this._importLedgerKit;
    this._signerManager = new SignerManager(dmk, async args => {
      const mod = await importKit('@ledgerhq/device-signer-kit-ethereum');
      return new mod.SignerEthBuilder(args);
    });
  }

  private async _getDeviceManager(): Promise<LedgerDeviceManager> {
    if (this._deviceManager) return this._deviceManager;

    const dmk = await this._getOrCreateDmk();
    this._initManagers(dmk);
    return this._deviceManager!;
  }

  private async _getSignerManager(): Promise<SignerManager> {
    if (!this._signerManager) {
      const dmk = await this._getOrCreateDmk();
      this._initManagers(dmk);
    }
    return this._signerManager!;
  }

  private _invalidateSession(sessionId: string): void {
    this._signerManager?.invalidate(sessionId);
  }

  /**
   * Replace an old session with a new one after app switch.
   * Updates the connectId→path mapping so subsequent calls() use the new session,
   * and emits device-connect so the adapter updates its _sessions Map.
   */
  private _replaceSession(oldSessionId: string, _newSessionId: string): void {
    // Find the connectId that was mapped to the old session's device path
    const dm = this._deviceManager;
    if (!dm) return;

    const oldDeviceId = dm.getDeviceId(oldSessionId);
    const connectId = oldDeviceId ? this._pathToConnectId.get(oldDeviceId) : undefined;

    // Invalidate old signer cache
    this._signerManager?.invalidate(oldSessionId);

    // Emit device-connect so the adapter picks up the new session
    if (connectId) {
      this._emit('device-connect', {
        device: {
          connectId,
          deviceId: connectId,
          name: 'Ledger',
        },
      });
    }
  }

  /**
   * Light reset: clear signer/session state but keep DMK, BLE scan, and ID mapping alive.
   * Used by connect() retry — we want to re-discover with the same transport.
   */
  private _resetSignersAndSessions(): void {
    debugLog('[DMK] _resetSignersAndSessions called');
    this._signerManager?.clearAll();
    this._signerManager = null;
    this._deviceManager = null;
  }

  private _resetAll(): void {
    debugLog('[DMK] _resetAll called');
    // Cancel any in-flight DeviceActions so their observables unsubscribe
    // and DMK's intent queues don't keep orphaned slots alive.
    for (const cancel of this._cancellers.values()) {
      try {
        cancel();
      } catch {
        // already cancelled / settled — ignore
      }
    }
    this._cancellers.clear();
    this._signerManager?.clearAll();
    this._deviceManager?.dispose();
    this._deviceManager = null;
    this._signerManager = null;
    this._dmk = null;
    this._connectIdToPath.clear();
    this._pathToConnectId.clear();
  }

  // ---------------------------------------------------------------------------
  // Private -- Events
  // ---------------------------------------------------------------------------

  protected _emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch {
          // Don't let listener errors break the connector
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private -- Error handling
  // ---------------------------------------------------------------------------

  private _wrapError(err: unknown): Error {
    const mapped = mapLedgerError(err);
    const error = new Error(mapped.message);
    const src = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
    // Preserve DMK / EthAppCommandError fields so downstream classifiers
    // (including cross-layer `wrapError` → caller re-classification) can still
    // key on APDU code and step context attached by deviceActionToPromise.
    Object.assign(error, {
      code: mapped.code,
      appName: mapped.appName,
      _tag: src._tag,
      errorCode: src.errorCode,
      _lastStep: src._lastStep,
      originalError: err,
    });
    return error;
  }
}
