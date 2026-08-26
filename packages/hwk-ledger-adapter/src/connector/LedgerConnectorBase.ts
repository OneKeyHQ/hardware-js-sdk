import {
  EConnectorInteraction,
  HardwareErrorCode,
  isKnownNonTargetHardwareVendor,
  serializeConnectorError,
} from '@onekeyfe/hwk-adapter-core';

import { LedgerDeviceManager } from '../device/LedgerDeviceManager';
import { SignerManager } from '../signer/SignerManager';
import {
  ERROR_TAG,
  isAppStuckByApdu,
  isKnownConnectionTag,
  isTransportStuck,
  mapLedgerError,
} from '../errors';
import { debugLog } from '../utils/debugLog';
import { isLedgerBleConnectionType } from '../utils/ledgerDmkTransport';
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
import { DeviceAppsManager } from '../device-apps/DeviceAppsManager';
import { collapseSignerInteraction } from './chains/utils';
import { deviceActionToPromise } from '../signer/deviceActionToPromise';

import type {
  DeviceApps,
  InstallAppCallParams,
  ListInstalledAppsCallParams,
} from '../device-apps/DeviceApps';
import type { ConnectorContext } from './chains/types';
import type { WrapErrorOptions } from '../errors';
import type { CancelReason } from '../signer/deviceActionToPromise';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type {
  ConnectionType,
  ConnectorCallResult,
  ConnectorConfig,
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

/**
 * Method-name prefix → Ledger app name. Keeps chain handlers free of
 * per-site `defaultAppName` boilerplate; `_ctxForMethod` injects it.
 */
const METHOD_PREFIX_TO_APP_NAME: Record<string, string> = {
  evm: 'Ethereum',
  btc: 'Bitcoin',
  sol: 'Solana',
  tron: 'Tron',
};

const HARDWARE_ERROR_CODE_VALUES = new Set<number>(
  Object.values(HardwareErrorCode).filter((value): value is number => typeof value === 'number')
);

// Slow-advertising peripherals (screensaver, post-unpair) can advertise on
// ~1s intervals, so the 800ms list-scan window is too tight at connect time.
const BLE_CONNECT_SCAN_TIMEOUT_MS = 1500;

// ---------------------------------------------------------------------------
// Ledger genuine-check relay allowlist
//
// `configure({ ledgerGenuineCheckWebSocketUrl })` rebuilds DMK to route the
// genuine-check session (device attestation transcript) through this URL.
// The SDK, not the caller, must own which origins are trusted: a caller that
// could point this at an arbitrary host would leak the attestation transcript
// to it and let that host dictate the "isGenuine" verdict. The hostname must
// be, or be a subdomain of, one of these OneKey-owned root domains — not
// pinned to any specific subdomain name, since that's an operational detail
// that can change without this allowlist needing a code update. The path
// must still be the relay's session-token route with no userinfo/query/
// fragment/non-default port.
const LEDGER_RELAY_ALLOWED_ROOT_DOMAINS = ['onekeytest.com', 'onekey.com'];

function isAllowedLedgerRelayHost(hostname: string): boolean {
  return LEDGER_RELAY_ALLOWED_ROOT_DOMAINS.some(
    root => hostname === root || hostname.endsWith(`.${root}`)
  );
}
const LEDGER_RELAY_PATH_PREFIX = '/v1/ledger/session/';
const LEDGER_RELAY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const MAX_LEDGER_RELAY_URL_LENGTH = 2048;

function assertAllowedLedgerRelayUrl(rawUrl: string): void {
  if (!rawUrl || rawUrl.length > MAX_LEDGER_RELAY_URL_LENGTH) {
    throw new Error('Ledger genuine-check relay URL is invalid');
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Ledger genuine-check relay URL is invalid');
  }
  const token = parsed.pathname.startsWith(LEDGER_RELAY_PATH_PREFIX)
    ? parsed.pathname.slice(LEDGER_RELAY_PATH_PREFIX.length)
    : '';
  if (
    parsed.protocol !== 'wss:' ||
    !isAllowedLedgerRelayHost(parsed.hostname) ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    !LEDGER_RELAY_TOKEN_PATTERN.test(token)
  ) {
    throw new Error('Ledger genuine-check relay URL is not allowed');
  }
}

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
    case '@ledgerhq/context-module':
      return import('@ledgerhq/context-module');
    default:
      throw new Error(`Unknown Ledger kit package: ${pkg}`);
  }
}

// Mirrors _getEthSigner in chains/evm.ts.
async function _getDeviceApps(ctx: ConnectorContext, sessionId: string): Promise<DeviceApps> {
  const manager = await ctx.getDeviceAppsManager();
  const apps = await manager.getOrCreate(sessionId);
  apps.onInteraction = (interaction: string) => {
    ctx.emit('ui-event', {
      type: collapseSignerInteraction(interaction),
      payload: { sessionId },
    });
  };
  apps.onRegisterCanceller = cancel => {
    ctx.registerCanceller(sessionId, cancel);
  };
  return apps;
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
 *    device identity resolution.
 *
 * Invariant: one instance = one transport. `connectionType` is fixed at
 * construction. To switch transport (e.g. desktop BLE ↔ WebHID), the host
 * must build a new connector instance and replace the old one — don't add
 * multiple transports to a single instance. Lifting this constraint would
 * require routing `connectionType` from `descriptor.transport` per-device
 * and updating every `this.connectionType` branch in this file.
 */
export class LedgerConnectorBase implements IConnector {
  private _deviceManager: LedgerDeviceManager | null = null;

  private _signerManager: SignerManager | null = null;

  private _deviceAppsManager: DeviceAppsManager | null = null;

  private _dmk: DeviceManagementKit | null = null;

  private readonly _eventHandlers = new Map<
    ConnectorEventType,
    Set<EventHandler<ConnectorEventType>>
  >();

  private readonly _providedDmk: DeviceManagementKit | undefined;

  private readonly _createTransport: TransportFactory;

  private _ledgerGenuineCheckWebSocketUrl: string | undefined;

  public readonly connectionType: ConnectionType;

  // ---------------------------------------------------------------------------
  // Per-session DeviceAction cancellers
  //
  // Each chain handler registers its active DeviceAction's canceller via
  // ctx.registerCanceller(sessionId, cancel) and clears it on completion.
  // IConnector.cancel(sessionId) invokes the registered canceller, which
  // unsubscribes the observable and releases DMK's IntentQueue slot.
  // ---------------------------------------------------------------------------
  private readonly _cancellers = new Map<string, (reason?: CancelReason) => void>();

  // ---------------------------------------------------------------------------
  // Per-session DMK state subscriptions
  //
  // DMK only emits `device-disconnect` on the connector when `disconnect()`
  // is called explicitly. To pick up autonomous disconnects (USB unplug,
  // BLE drop, device sleep, DMK transport reset) we subscribe to
  // `_dmk.getDeviceSessionState({sessionId})` per active session and emit
  // `device-disconnect` ourselves the moment DMK reports the device went
  // to NOT_CONNECTED. The subscription is torn down on disconnect /
  // reset / observable completion to avoid leaks.
  // ---------------------------------------------------------------------------
  private readonly _sessionStateSubs = new Map<string, { unsubscribe: () => void }>();

  /**
   * Resolves a Ledger signer kit module by package name.
   * Override via constructor to use CJS paths for Metro (React Native).
   * Default: dynamic import with bare specifier (webpack/rspack).
   */
  protected _importLedgerKit: (pkg: string) => Promise<any>;

  /** Context object passed to per-chain handler functions. */
  private readonly _ctx: ConnectorContext;

  /** When true, BLE direct-connect throws NotAdvertising if the pre-flight
   *  scan can't see the device — guard for GATT stacks that wedge on
   *  non-advertising peripherals (iOS). */
  private readonly _requirePreFlightScan: boolean;

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
      /** Default false. RN-iOS subclass should pass `true`. */
      requirePreFlightScan?: boolean;
    }
  ) {
    this._createTransport = createTransport;
    this.connectionType = options?.connectionType ?? 'usb';
    this._providedDmk = options?.dmk;
    this._importLedgerKit = options?.importLedgerKit ?? defaultLedgerKitImporter;
    this._requirePreFlightScan = options?.requirePreFlightScan ?? false;
    if (this._providedDmk) {
      this._initManagers(this._providedDmk);
    }

    // Build the context that chain handlers use
    this._ctx = {
      emit: <K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]) =>
        this._emit(event, data),
      invalidateSession: sid => this._invalidateSession(sid),
      wrapError: (err, opts) => this._wrapError(err, opts),
      getOrCreateDmk: () => this._getOrCreateDmk(),
      getDeviceManager: () => this._getDeviceManager(),
      getSignerManager: () => this._getSignerManager(),
      getDeviceAppsManager: () => this._getDeviceAppsManager(),
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
   * Override in subclasses only when the public connectId differs from the transport path.
   */
  protected _resolveConnectId(descriptor: DeviceDescriptor): string {
    return descriptor.path;
  }

  /**
   * Authoritative discovery for this transport. Default = enumerate snapshot
   * (USB/HID). BLE overrides to drive from a live scan window since DMK's
   * enumerate() cache survives peripherals going offline.
   */
  protected async _discoverDescriptors(dm: LedgerDeviceManager): Promise<DeviceDescriptor[]> {
    let descriptors = await dm.enumerate();
    if (descriptors.length === 0) {
      try {
        await dm.requestDevice();
      } catch {
        // User may cancel the permission dialog
      }
      descriptors = await dm.enumerate();
    }
    return descriptors;
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Device discovery
  //
  // Discovery never throws on multiple USB devices — it returns the full list.
  // The "connect exactly one device" rule is enforced upstream: an explicit
  // connectId connects that device (or fails as not-found), and only the
  // no-connectId USB path rejects when more than one device is present
  // (see LedgerAdapter._connectFirstOrSelect).
  // ---------------------------------------------------------------------------

  async searchDevices(): Promise<ConnectorDevice[]> {
    const dm = await this._getDeviceManager();

    const descriptors = await this._discoverDescriptors(dm);
    const resolvedDescriptors = descriptors
      .filter(d => !isKnownNonTargetHardwareVendor(d, 'ledger'))
      .map(d => ({
        descriptor: d,
        connectId: this._resolveConnectId(d),
      }));
    const result: ConnectorDevice[] = resolvedDescriptors.map(({ descriptor: d, connectId }) => ({
      connectId,
      deviceId: d.path,
      name: d.name || d.type || 'Ledger',
      model: d.type,
      modelName: d.modelName,
      rssi: d.rssi,
      isConnectable: d.isConnectable,
      serialNumber: d.serialNumber,
    }));
    debugLog(
      `[DMK] connector.searchDevices() return count=${result.length} ids=[${result
        .map(r => r.connectId)
        .join(',')}] paths=[${result.map(r => r.deviceId).join(',')}]`
    );
    return result;
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Connection
  // ---------------------------------------------------------------------------

  async connect(deviceId?: string): Promise<ConnectorSession> {
    // Trust caller's deviceId — search has already happened upstream
    // (UI scan flow). When caller didn't specify, fall back to a fresh
    // search so we have something to connect to.
    //
    // Only the explicit-connectId path gets the BLE direct-connect treatment.
    const callerSuppliedConnectId = Boolean(deviceId);
    let targetPath = deviceId;
    if (!targetPath) {
      const discovered = await this.searchDevices();
      if (discovered.length === 0) {
        throw new Error(
          `No Ledger device found. Make sure the device is connected${
            isLedgerBleConnectionType(this.connectionType)
              ? ' nearby with Bluetooth enabled'
              : ' via USB'
          } and unlocked.`
        );
      }
      targetPath = discovered[0].deviceId;
    }

    const externalConnectId = targetPath;

    // No active SMP timeout — let dm.connect resolve/reject naturally based
    // on what DMK / iOS BLE stack actually report. iOS has its own ~30s SMP
    // timeout; we trust it. The previous active 30s timer mis-judged slow-
    // but-successful pairings (user took 35s to confirm passkey).
    // 5min hang ceiling only catches genuine DMK stuck-promise (very rare).
    const HANG_CEILING_MS = 5 * 60_000;
    const dmConnectWithObserve = async (dm: LedgerDeviceManager, path: string): Promise<string> => {
      if (!isLedgerBleConnectionType(this.connectionType)) return dm.connect(path);

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;
      const connectPromise = dm.connect(path);
      const hangPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          const err = new Error(
            `Ledger BLE connect did not return within ${
              HANG_CEILING_MS / 60_000
            }min — DMK hang fallback.`
          ) as Error & { _tag?: string; code?: number };
          err._tag = ERROR_TAG.BlePairingTimeout;
          err.code = HardwareErrorCode.BlePairingTimeout;
          reject(err);
        }, HANG_CEILING_MS);
      });
      try {
        return await Promise.race([connectPromise, hangPromise]);
      } catch (err) {
        const e = err as {
          _tag?: string;
          message?: string;
          errorCode?: unknown;
          statusCode?: unknown;
          originalError?: { _tag?: string; message?: string };
        };
        debugLog('[DMK] dm.connect rejected — observed:', {
          _tag: e?._tag,
          message: e?.message,
          errorCode: e?.errorCode,
          statusCode: e?.statusCode,
          originalTag: e?.originalError?._tag,
          originalMessage: e?.originalError?.message,
        });
        if (timedOut) {
          void connectPromise.then(
            sessionId => dm.disconnect(sessionId).catch(() => undefined),
            () => undefined
          );
        }
        throw err;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    // Resolve dm lazily — _resetSignersAndSessions during retry replaces
    // _deviceManager, so capturing it in a closure would use a stale instance
    // whose _discovered Map has been disposed.
    // BLE direct-connect: caller supplied a connectId on a BLE transport.
    const isBleDirectConnect =
      isLedgerBleConnectionType(this.connectionType) && callerSuppliedConnectId;

    const throwNotAdvertising = (): never => {
      const err = new Error(
        'Ledger device is not currently advertising. Wake up and unlock the device, keep it nearby, then try again.'
      ) as Error & { _tag?: string; code?: number };
      err._tag = ERROR_TAG.DeviceNotAdvertising;
      err.code = HardwareErrorCode.DeviceNotFound;
      throw err;
    };

    const doConnect = async (path: string): Promise<ConnectorSession> => {
      const dm = await this._getDeviceManager();
      // BLE direct-connect: refresh _discovered (DMK requires it before connect).
      // iOS throws early on empty scan to avoid the ~30s GATT/SMP wedge;
      // others trust the caller and let dm.connect() surface its own error.
      if (isBleDirectConnect && !dm.hasDiscoveredDevice(path)) {
        const live = await dm.getLiveDevices(BLE_CONNECT_SCAN_TIMEOUT_MS);
        if (this._requirePreFlightScan && !live.some(d => d.id === path)) {
          throwNotAdvertising();
        }
      }
      let sessionId: string;
      try {
        sessionId = await dmConnectWithObserve(dm, path);
      } catch (err) {
        // LedgerDeviceManager.connect() tags this when path isn't in _discovered.
        if (
          isBleDirectConnect &&
          (err as { _tag?: string } | null)?._tag === ERROR_TAG.DeviceNotInDiscoveryCache
        ) {
          throwNotAdvertising();
        }
        throw err;
      }
      try {
        this._watchSessionState(sessionId, externalConnectId);
      } catch (subErr) {
        // Subscription failure is fatal (see _watchSessionState) — disconnect
        // the just-created DMK session so connect()'s catch wraps it normally.
        debugLog('[DMK] state subscription failed during connect; disconnecting session:', subErr);
        try {
          await dm.disconnect(sessionId);
        } catch {
          // best-effort cleanup
        }
        throw subErr;
      }
      const info = dm.getDiscoveredDeviceInfo(path);
      const session: ConnectorSession = {
        sessionId,
        deviceInfo: {
          vendor: 'ledger',
          model: info?.model ?? 'unknown',
          modelName: info?.modelName,
          firmwareVersion: 'unknown',
          deviceId: path,
          connectId: externalConnectId,
          connectionType: this.connectionType,
          rssi: info?.rssi,
          capabilities: { persistentDeviceIdentity: false },
        },
      };
      // dm.connect() requires the descriptor in _discovered, so name lookup
      // will succeed; fallback covers any transient race.
      const name = dm.getDeviceName(path) ?? 'Ledger';
      this._emit('device-connect', {
        device: { connectId: externalConnectId, deviceId: path, name },
      });
      return session;
    };

    try {
      return await doConnect(targetPath);
    } catch (err) {
      // GATT failed — clean up local state and let the adapter own recovery.
      // We don't search-and-retry here: Layer 1 (`_doConnect` in LedgerAdapter)
      // is the single recovery owner. Doing a second doConnect here just
      // doubles the timeout the user sees before the unlock dialog appears.
      this._resetSignersAndSessions();

      // BLE GATT failures split into 3 tags:
      //   BlePairingTimeout — our 30s timeout (pre-classified above)
      //   BleGattBondingFailed — anything else (PeerRemoved / BleError /
      //                          iOS SMP reject / unknown transport)
      //   DeviceNotAdvertising — pre-GATT scan miss (only from connectDevice)
      if (isLedgerBleConnectionType(this.connectionType)) {
        const tag = (err as { _tag?: string } | null | undefined)?._tag;

        // If DMK already gave a recognized tag (locked / disconnected / pairing
        // / transport-class), pass through untouched so SDK classifiers can
        // route on the real cause. We only wrap completely untagged errors.
        if (isKnownConnectionTag(tag)) {
          throw err;
        }

        // Untagged failure — wrap as BleGattBondingFailed so upstream still
        // has a code path. Original error preserved on `originalError`.
        const wrapped = new Error(
          'Ledger Bluetooth pairing failed. Make sure the device is unlocked and nearby, then try again.'
        ) as Error & { _tag?: string; code?: number; originalError?: unknown };
        wrapped._tag = ERROR_TAG.BleGattBondingFailed;
        wrapped.code = HardwareErrorCode.BlePairingTimeout;
        wrapped.originalError = err;
        throw wrapped;
      }

      // USB/HID: typed errors flow through unchanged so APDU/transport
      // diagnostics aren't masked. Unknown failure → "unplugged".
      if (err && typeof err === 'object' && (err as { _tag?: string })._tag) {
        const taggedError =
          err instanceof Error
            ? err
            : Object.assign(
                new Error((err as { message?: string }).message ?? 'Ledger device error'),
                err
              );
        throw taggedError;
      }
      throw new Error('Ledger device appears unplugged. Plug in the device and try again.');
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    if (!this._deviceManager) return;

    const deviceId = this._deviceManager.getDeviceId(sessionId);
    this._signerManager?.invalidate(sessionId);
    this._unwatchSessionState(sessionId);
    await this._deviceManager.disconnect(sessionId);

    if (deviceId) {
      this._emit('device-disconnect', { connectId: deviceId });
    }
  }

  /**
   * Subscribe to DMK's per-session state observable so that any autonomous
   * disconnect (USB unplug, BLE drop, device sleep, transport reset) is
   * surfaced as a `device-disconnect` event — without this, the upstream
   * `LedgerAdapter._sessions` map would hold a dead session entry until
   * the next call hit `DeviceSessionNotFound`.
   *
   * Subscribe failure is fatal — see the inline note at the subscribe call.
   */
  private _watchSessionState(sessionId: string, externalConnectId: string): void {
    const dmk = this._dmk;
    if (!dmk) return;
    const previous = this._sessionStateSubs.get(sessionId);
    if (previous) {
      try {
        previous.unsubscribe();
      } catch {
        // ignore
      }
    }
    // Subscribe failure is fatal: without this subscription we can't detect
    // autonomous disconnect (USB unplug, BLE drop, sleep), which leaks ghost
    // entries into the adapter's _sessions map and can route subsequent calls
    // to the wrong device. Let the error propagate so connect() cleans up the
    // just-created DMK session and fails loudly.
    const sub = dmk.getDeviceSessionState({ sessionId }).subscribe({
      next: (state: { deviceStatus?: string }) => {
        // String-compare against DeviceStatus.NOT_CONNECTED ("NOT CONNECTED")
        // to avoid pulling the runtime enum import (kept type-only for
        // Metro/RN compatibility — see _importLedgerKit).
        if (state?.deviceStatus === 'NOT CONNECTED') {
          this._handleAutonomousDisconnect(sessionId, externalConnectId);
        }
      },
      error: () => {
        // DMK closed the observable abnormally — treat as disconnect.
        this._handleAutonomousDisconnect(sessionId, externalConnectId);
      },
      complete: () => {
        // Observable completed — session is gone from DMK's POV.
        this._handleAutonomousDisconnect(sessionId, externalConnectId);
      },
    });
    this._sessionStateSubs.set(sessionId, sub);
  }

  private _unwatchSessionState(sessionId: string): void {
    const sub = this._sessionStateSubs.get(sessionId);
    if (!sub) return;
    try {
      sub.unsubscribe();
    } catch {
      // ignore
    }
    this._sessionStateSubs.delete(sessionId);
  }

  private _handleAutonomousDisconnect(sessionId: string, externalConnectId: string): void {
    if (!this._sessionStateSubs.has(sessionId)) return; // already handled
    debugLog(
      '[DMK] autonomous disconnect detected — sessionId:',
      sessionId,
      'connectId:',
      externalConnectId
    );
    this._unwatchSessionState(sessionId);
    this._signerManager?.invalidate(sessionId);
    this._cancellers.get(sessionId)?.({
      code: HardwareErrorCode.DeviceDisconnected,
      tag: 'DeviceDisconnected',
      message: 'Device disconnected',
    });
    this._cancellers.delete(sessionId);
    this._emit('device-disconnect', { connectId: externalConnectId });
  }

  // ---------------------------------------------------------------------------
  // IConnector -- Method dispatch
  // ---------------------------------------------------------------------------

  // Device failures are returned as a `ConnectorCallResult` (success:false),
  // never thrown — so they cross the IHardwareBridge / extension offscreen↔SW
  // boundary as plain data instead of being mangled by the JsBridge error
  // whitelist (`toPlainError`). The SW-side adapter rehydrates and re-throws
  // locally (see LedgerAdapter._unwrapConnectorResult).
  async call(sessionId: string, method: string, params: unknown): Promise<ConnectorCallResult> {
    debugLog('[DMK] call:', method, JSON.stringify(params));
    try {
      const payload = await this._dispatch(sessionId, method, params);
      return { success: true, payload };
    } catch (err) {
      // True chain-app stuck (APDU 0x6901): user must back out of the
      // app on the device — keep the "press both buttons to exit" message.
      if (isAppStuckByApdu(err)) {
        return {
          success: false,
          error: serializeConnectorError(
            Object.assign(new Error('Ledger app is unresponsive'), {
              code: HardwareErrorCode.DeviceAppStuck,
              _tag: ERROR_TAG.DeviceAppStuck,
              originalError: err,
            })
          ),
        };
      }
      // DMK transport queue wedged (AlreadySendingApdu / UnknownDeviceExchange):
      // device + app are fine, only our SDK-side comms got tangled. Surface
      // as TransportError so the user sees a "communication interrupted,
      // please retry" message instead of a misleading "exit app" prompt.
      // Layer 2 (LedgerAdapter._runConnectorCall) will reset the connector
      // before re-throwing so the next call rebuilds a clean DMK instance.
      if (isTransportStuck(err)) {
        return {
          success: false,
          error: serializeConnectorError(
            Object.assign(new Error('Device communication interrupted, please retry'), {
              code: HardwareErrorCode.TransportError,
              _tag: ERROR_TAG.DeviceTransportStuck,
              originalError: err,
            })
          ),
        };
      }
      return { success: false, error: serializeConnectorError(err) };
    }
  }

  private async _dispatch(sessionId: string, method: string, params: unknown): Promise<unknown> {
    // Bind the chain's Ledger app name to ctx.wrapError once per dispatch so
    // chain handlers can call `ctx.wrapError(err)` with no per-site appName.
    const ctx = this._ctxForMethod(method);
    switch (method) {
      // EVM
      case 'evmGetAddress':
        return evmGetAddress(ctx, sessionId, params as EvmGetAddressCallParams);
      case 'evmSignTransaction':
        return evmSignTransaction(ctx, sessionId, params as EvmSignTransactionCallParams);
      case 'evmSignMessage':
        return evmSignMessage(ctx, sessionId, params as EvmSignMessageCallParams);
      case 'evmSignTypedData':
        return evmSignTypedData(ctx, sessionId, params as EvmSignTypedDataCallParams);
      // BTC
      case 'btcGetAddress':
        return btcGetAddress(ctx, sessionId, params as BtcGetAddressCallParams);
      case 'btcGetPublicKey':
        return btcGetPublicKey(ctx, sessionId, params as BtcGetPublicKeyCallParams);
      case 'btcSignTransaction':
        return btcSignTransaction(ctx, sessionId, params as BtcSignTransactionCallParams);
      case 'btcSignPsbt':
        return btcSignPsbt(ctx, sessionId, params as BtcSignPsbtCallParams);
      case 'btcSignMessage':
        return btcSignMessage(ctx, sessionId, params as BtcSignMessageCallParams);
      case 'btcGetMasterFingerprint':
        return btcGetMasterFingerprint(
          ctx,
          sessionId,
          params as { skipOpenApp?: boolean } | undefined
        );
      // SOL
      case 'solGetAddress':
        return solGetAddress(ctx, sessionId, params as SolGetAddressCallParams);
      case 'solSignTransaction':
        return solSignTransaction(ctx, sessionId, params as SolSignTransactionCallParams);
      case 'solSignMessage':
        return solSignMessage(ctx, sessionId, params as SolSignMessageCallParams);
      // TRON
      case 'tronGetAddress':
        return tronGetAddress(ctx, sessionId, params as TronGetAddressCallParams);
      case 'tronSignTransaction':
        return tronSignTransaction(ctx, sessionId, params as TronSignTransactionCallParams);
      case 'tronSignMessage': {
        // Explicit public→internal mapping so a field-name drift fails at
        // compile time, not silently at runtime (see bug: public `messageHex`
        // vs internal `messageHex` field name enforcement).
        const p = params as TronSignMsgParams;
        const internalParams: TronSignMessageCallParams = {
          path: p.path,
          messageHex: p.messageHex,
        };
        return tronSignMessage(ctx, sessionId, internalParams);
      }
      // OS-level device management — symmetric to chain handlers.
      // Each case uses try/catch/finally to mirror chain handlers: catch wraps
      // raw DMK errors (so mapLedgerError / isOutOfMemoryError run) and
      // invalidates the session (so a stale sid isn't reused by subsequent
      // listInstalledApps / signTransaction calls).
      case 'installApp': {
        const p = params as InstallAppCallParams;
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          // Progress callback is built here (not on params) so the function ref
          // never crosses the IHardwareBridge boundary. Emits as a `ui-event`
          // AppInstallProgress variant; the adapter re-keys sessionId →
          // connectId before re-emitting to its public typed emitter.
          return await apps.install(p.appName, ({ progress }) => {
            ctx.emit('ui-event', {
              type: EConnectorInteraction.AppInstallProgress,
              payload: {
                sessionId,
                appName: p.appName,
                progress,
              },
            });
          });
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'listInstalledApps': {
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          return await apps.listInstalled(params as ListInstalledAppsCallParams);
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'listInstalledNames': {
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          return await apps.listInstalledNames(params as ListInstalledAppsCallParams);
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'listAvailableApps': {
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          return await apps.listAvailable();
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'getFirmwareVersion': {
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          return await apps.getFirmwareVersion();
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'getDeviceInfo': {
        const apps = await _getDeviceApps(ctx, sessionId);
        try {
          return await apps.getDeviceInfo();
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
      }
      case 'getDeviceGenuineCheck': {
        // Ledger official genuine check, over the SAME secure-channel pipeline
        // as app install (DMK → wss://scriptrunner.api.live.ledger.com/update/genuine).
        // DMK reads the device attestation certificate inside that session and
        // emits deviceId = sha3_256(attestation pubkey) in the Pending
        // intermediateValue (NOT the final output) — captured below. The final
        // output carries the { isGenuine } verdict from Ledger's HSM.
        try {
          const dmk = await ctx.getOrCreateDmk();
          const kit = await ctx.importLedgerKit('@ledgerhq/device-management-kit');
          const action = (
            dmk as unknown as {
              // Loose return: deviceActionToPromise narrows the observable shape.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              executeDeviceAction(args: { sessionId: string; deviceAction: unknown }): any;
            }
          ).executeDeviceAction({
            sessionId,
            deviceAction: new kit.GenuineCheckDeviceAction({ input: {} }),
          });

          let deviceId: string | undefined;
          const output = await deviceActionToPromise<{ isGenuine: boolean }>(
            action,
            (interaction: string) =>
              ctx.emit('ui-event', {
                type: collapseSignerInteraction(interaction),
                payload: { sessionId },
              }),
            // Generous timeout: covers websocket round-trips + the on-device
            // "Allow secure connection" tap (the idle watchdog does not pause
            // for it, only for unlock-device).
            5 * 60_000,
            cancel => ctx.registerCanceller(sessionId, cancel),
            intermediateValue => {
              const iv = intermediateValue as { deviceId?: Uint8Array } | undefined;
              if (iv?.deviceId instanceof Uint8Array && iv.deviceId.length === 32 && !deviceId) {
                deviceId = Buffer.from(iv.deviceId).toString('hex');
              }
            }
          );

          return { isGenuine: output.isGenuine, deviceId };
        } catch (err) {
          ctx.invalidateSession(sessionId);
          throw ctx.wrapError(err);
        } finally {
          ctx.clearCanceller(sessionId);
        }
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
    // A relay URL is a single-use capability. Any lifecycle reset must restore
    // the official Ledger default so it cannot bleed into a later operation.
    this._ledgerGenuineCheckWebSocketUrl = undefined;
    this._resetAll();
  }

  async configure(config: ConnectorConfig): Promise<void> {
    const nextUrl = config.ledgerGenuineCheckWebSocketUrl;
    if (nextUrl) {
      assertAllowedLedgerRelayUrl(nextUrl);
      if (this._providedDmk) {
        throw new Error('Cannot change Ledger genuine-check relay on a pre-built DMK');
      }
    }
    if (nextUrl === this._ledgerGenuineCheckWebSocketUrl) {
      return;
    }
    this._resetAll();
    this._ledgerGenuineCheckWebSocketUrl = nextUrl;
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

    const builder = new DeviceManagementKitBuilder().addTransport(transportFactory);
    if (this._ledgerGenuineCheckWebSocketUrl) {
      builder.addConfig({ webSocketUrl: this._ledgerGenuineCheckWebSocketUrl });
    }
    const dmk: DeviceManagementKit = builder.build();
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
    this._deviceAppsManager = new DeviceAppsManager(dmk, importKit);
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

  private async _getDeviceAppsManager(): Promise<DeviceAppsManager> {
    if (!this._deviceAppsManager) {
      const dmk = await this._getOrCreateDmk();
      this._initManagers(dmk);
    }
    return this._deviceAppsManager!;
  }

  private _invalidateSession(sessionId: string): void {
    this._signerManager?.invalidate(sessionId);
  }

  /**
   * Replace an old session with a new one after app switch.
   * Emits device-connect so the adapter updates its _sessions Map.
   */
  private _replaceSession(oldSessionId: string, _newSessionId: string): void {
    const dm = this._deviceManager;
    if (!dm) return;

    const oldDeviceId = dm.getDeviceId(oldSessionId);
    const connectId = oldDeviceId;

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
   * Light reset: clear signer/session state but keep DMK alive.
   * Used by connect() retry — we want to re-discover with the same transport.
   *
   * Note: drops the device manager but tears down its RxJS subs first via
   * disposeKeepingDmk(). Bare null-assignment would leak _listenSub /
   * _discoverySub and double-scan after the next _initManagers().
   */
  private _resetSignersAndSessions(): void {
    debugLog('[DMK] _resetSignersAndSessions called');
    this._signerManager?.clearAll();
    this._signerManager = null;
    this._deviceAppsManager?.clearAll();
    this._deviceAppsManager = null;
    this._deviceManager?.disposeKeepingDmk();
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
    // Tear down per-session state subscriptions so we don't keep observing
    // a DMK we're about to drop.
    for (const sub of this._sessionStateSubs.values()) {
      try {
        sub.unsubscribe();
      } catch {
        // ignore
      }
    }
    this._sessionStateSubs.clear();
    this._signerManager?.clearAll();
    this._deviceAppsManager?.clearAll();
    this._deviceManager?.dispose();
    this._deviceManager = null;
    this._signerManager = null;
    this._deviceAppsManager = null;
    this._dmk = null;
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

  /**
   * Return a per-call ctx with the chain's Ledger app name pre-bound to
   * wrapError, so chain handlers don't need to repeat `{ defaultAppName: 'X' }`
   * at every catch site. Falls through unchanged for unknown methods.
   */
  private _ctxForMethod(method: string): ConnectorContext {
    const prefix = /^(evm|btc|sol|tron)/.exec(method)?.[1];
    const defaultAppName = prefix ? METHOD_PREFIX_TO_APP_NAME[prefix] : undefined;
    if (!defaultAppName) return this._ctx;
    return {
      ...this._ctx,
      wrapError: (err, opts) => this._wrapError(err, { defaultAppName, ...opts }),
    };
  }

  private _wrapError(err: unknown, opts?: WrapErrorOptions): Error {
    const src = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
    const hasSerializedCode =
      typeof src.code === 'number' && HARDWARE_ERROR_CODE_VALUES.has(src.code);
    const mapped = hasSerializedCode
      ? {
          code: src.code as HardwareErrorCode,
          message: typeof src.message === 'string' ? src.message : 'Unknown Ledger error',
          appName: typeof src.appName === 'string' ? src.appName : opts?.defaultAppName,
        }
      : mapLedgerError(err, opts);
    const error = new Error(mapped.message);
    // Preserve DMK / EthAppCommandError fields so downstream classifiers
    // (including cross-layer `wrapError` → caller re-classification) can still
    // key on APDU code and step context attached by deviceActionToPromise.
    Object.assign(error, {
      code: mapped.code,
      appName: mapped.appName,
      _tag: src._tag,
      errorCode: src.errorCode,
      _lastStep: src._lastStep,
      _deviceActionSteps: src._deviceActionSteps,
    });
    // Non-enumerable: DMK errors can carry APDU payloads / signing
    // intermediates that shouldn't leak into JSON.stringify / log transports.
    Object.defineProperty(error, 'originalError', {
      value: err,
      configurable: true,
      enumerable: false,
      writable: true,
    });
    return error;
  }
}
