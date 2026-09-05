import {
  TREZOR_BLE_PACKET_SIZE,
  TREZOR_BLE_UUIDS,
  isTrezorBleServiceUuid,
  isTrezorSafe7BleName,
} from '@onekeyfe/hwk-trezor-adapter';
import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import {
  TREZOR_BLE_DEVICE_TTL_MS,
  TREZOR_BLE_POWER_ON_TIMEOUT_MS,
  TREZOR_BLE_SCAN_DURATION_MS,
  TREZOR_BLE_SCAN_IDLE_STOP_MS,
  TREZOR_BLE_WRITE_CHUNK_DELAY_MS,
} from './constants';

import type { TrezorBleAvailability, TrezorBleDeviceInfo } from './types/desktop-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Subset of @stoprocent/noble we touch. We type as `any` to keep the package
 * installable without the native module — it's loaded lazily inside main().
 */
export interface NobleLike {
  state: string;
  on(event: string, handler: (...args: any[]) => void): NobleLike;
  removeListener(event: string, handler: (...args: any[]) => void): NobleLike;
  startScanningAsync(serviceUuids: string[], allowDuplicates: boolean): Promise<void>;
  stopScanningAsync(): Promise<void>;
  stop?(): void;
  /**
   * Connect by id/address with NO scan. Both native backends support this and
   * emit a `discover` for the peripheral as a side effect: Windows synthesizes
   * one for an unknown address (`BLEManager::Connect`, lib/win/src/ble_manager.cc)
   * and macOS resolves it via `retrievePeripheralsWithIdentifiers`
   * (lib/mac/src/ble_manager.mm). Optional so a stub noble can omit it.
   */
  connectAsync?(idOrAddress: string): Promise<NoblePeripheralLike | undefined>;
  cancelConnect?(idOrAddress: string): void;
  reset?(): Promise<void>;
}

export interface NoblePeripheralLike {
  id: string;
  // The full noble advertisement. We capture every field noble surfaces so
  // the host can hunt for a cross-transport identity (e.g. a device serial
  // baked into manufacturerData) without another scan.
  advertisement: {
    localName?: string;
    serviceUuids?: string[];
    manufacturerData?: Buffer;
    serviceData?: Array<{ uuid: string; data: Buffer }>;
    txPowerLevel?: number;
    serviceSolicitationUuids?: string[];
  };
  /** Some noble builds expose the BLE MAC/address separately from `id`. */
  address?: string;
  addressType?: string;
  connectable?: boolean;
  rssi: number;
  state: string;
  connectAsync(): Promise<void>;
  cancelConnect?(): void;
  disconnectAsync(): Promise<void>;
  discoverSomeServicesAndCharacteristicsAsync(
    serviceUuids: string[],
    characteristicUuids: string[]
  ): Promise<{ characteristics: NobleCharacteristicLike[] }>;
  /** Read live RSSI from the connected peripheral. Returns dBm. */
  updateRssiAsync?(): Promise<number>;
  on(event: string, handler: (...args: any[]) => void): NoblePeripheralLike;
  removeListener(event: string, handler: (...args: any[]) => void): NoblePeripheralLike;
}

export interface NobleCharacteristicLike {
  uuid: string;
  subscribeAsync(): Promise<void>;
  unsubscribeAsync(): Promise<void>;
  writeAsync(data: Buffer, withoutResponse: boolean): Promise<void>;
  on(
    event: 'data',
    handler: (data: Buffer, isNotification: boolean) => void
  ): NobleCharacteristicLike;
  removeListener(
    event: 'data',
    handler: (data: Buffer, isNotification: boolean) => void
  ): NobleCharacteristicLike;
}

export type NobleFactory = () => NobleLike;

const DEFAULT_NOBLE_FACTORY: NobleFactory = () => {
  // Lazy require so packagers don't bundle the native module at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const noble = require('@stoprocent/noble') as NobleLike;
  return noble;
};

interface DeviceEntry {
  peripheral: NoblePeripheralLike;
  writeChar?: NobleCharacteristicLike;
  notifyChar?: NobleCharacteristicLike;
  notifyHandler?: (data: Buffer, isNotification: boolean) => void;
  disconnectHandler?: () => void;
}

const normalizeUuid = (uuid: string): string => uuid.replace(/-/g, '').toLowerCase();

/**
 * Is this advertisement a Trezor? Stands in for the service-UUID scan filter,
 * which we cannot use (see `scan`). Matches the name carried in the ADV packet,
 * or the service UUID once a scan response has merged into the peripheral.
 */
const isTrezorPeripheral = (p: NoblePeripheralLike): boolean => {
  const adv = p.advertisement ?? {};
  if (isTrezorSafe7BleName(adv.localName)) return true;
  return (adv.serviceUuids ?? []).some(uuid => isTrezorBleServiceUuid(uuid));
};

/**
 * Map a noble peripheral to the serializable info we ship over IPC. Buffers
 * are hex-encoded so they survive the structured-clone boundary, and every
 * advertisement field is forwarded — the renderer/connector decides which
 * one is a usable cross-transport identity.
 */
const peripheralToInfo = (p: NoblePeripheralLike): TrezorBleDeviceInfo => {
  const adv = p.advertisement ?? {};
  return {
    id: p.id,
    name: adv.localName,
    localName: adv.localName,
    rssi: p.rssi,
    isConnectable: p.connectable ?? null,
    advertisedServiceUuids: adv.serviceUuids,
    serviceSolicitationUuids: adv.serviceSolicitationUuids,
    txPowerLevel: adv.txPowerLevel,
    manufacturerDataHex: adv.manufacturerData
      ? Buffer.from(adv.manufacturerData).toString('hex')
      : undefined,
    serviceData: adv.serviceData?.map(entry => ({
      uuid: entry.uuid,
      dataHex: Buffer.from(entry.data).toString('hex'),
    })),
    address: p.address,
    addressType: p.addressType,
    state: p.state,
  };
};

/**
 * Sleep helper without taking a dep on timers/promises. Microtask-friendly.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Radio-settle wait between stopping the scan and opening a GATT connection.
const BLE_CONNECT_SETTLE_MS = 300;
// Hard cap on the connect — noble has none, so a stale bond hangs forever
// without this. Set to the Bluetooth SMP (Security Manager) pairing timeout
// (30s, the OS pairing dialog's own limit) + 1s, so a real first-time pairing
// is never cut off before the system itself gives up.
const BLE_CONNECT_TIMEOUT_MS = 31_000;
// Cap on a cleanup disconnectAsync — it hangs on a just-failed connect.
const BLE_DISCONNECT_TIMEOUT_MS = 2_000;

/** Floor between noble rebuilds, so a persistent failure can't thrash. */
const NOBLE_RECOVER_COOLDOWN_MS = 10_000;

export interface NobleBleHandlerOptions {
  /** Override for tests; defaults to `require('@stoprocent/noble')`. */
  nobleFactory?: NobleFactory;
  /** Override BLE service+char UUIDs (defaults to Trezor Safe 7). */
  uuids?: typeof TREZOR_BLE_UUIDS;
  /** Override the 244-byte chunk size. */
  chunkSize?: number;
  /** Override the overall connect timeout (tests only; defaults to 31s). */
  connectTimeoutMs?: number;
  logger?: TrezorDebugLogger;
}

/**
 * Core BLE logic, decoupled from Electron's IPC layer so it can be unit
 * tested with a fake noble. Mirrors the OneKey `noble-ble-handler.ts`
 * pattern (a single class that owns the peripheral cache + disconnect
 * callbacks), but trimmed to the minimum surface we expose.
 */
export class NobleBleHandler {
  private _noble: NobleLike | undefined;

  private readonly _factory: NobleFactory;

  private readonly _uuids: typeof TREZOR_BLE_UUIDS;

  private readonly _chunkSize: number;

  private readonly _connectTimeoutMs: number;

  private readonly _logger?: NobleBleHandlerOptions['logger'];

  private readonly _discovered = new Map<string, NoblePeripheralLike>();

  // id -> last advertisement time (snapshot TTL).
  private readonly _lastSeen = new Map<string, number>();

  private readonly _connected = new Map<string, DeviceEntry>();

  private _discoverHandler?: (peripheral: NoblePeripheralLike) => void;

  private _scanning = false;

  private _idleStopTimer?: ReturnType<typeof setTimeout>;

  private _onNotification?: (id: string, hexData: string) => void;

  private _onDeviceDisconnected?: (id: string) => void;

  private _initialized = false;

  private _disposed = false;

  private _disposePromise?: Promise<void>;

  private _releasePromise?: Promise<void>;

  private _initPromise?: Promise<void>;

  private readonly _nobleInstances = new Set<NobleLike>();

  private readonly _pendingCancellations = new Set<() => void>();

  private readonly _connectAttempts = new Set<{
    id: string;
    abandon: (error: Error) => void;
    cancelNative: () => void;
    settled: Promise<unknown>;
  }>();

  private _nativeReleased = false;

  private _lastNobleRecoverAt?: number;

  /** The connect currently in flight, so cancelPairing can abandon it. */
  private _activeConnect?: { id: string; abandon: (error: Error) => void };

  constructor(options: NobleBleHandlerOptions = {}) {
    this._factory = options.nobleFactory ?? DEFAULT_NOBLE_FACTORY;
    this._uuids = options.uuids ?? TREZOR_BLE_UUIDS;
    this._chunkSize = options.chunkSize ?? TREZOR_BLE_PACKET_SIZE;
    this._connectTimeoutMs = options.connectTimeoutMs ?? BLE_CONNECT_TIMEOUT_MS;
    this._logger = options.logger;
  }

  setNotificationListener(handler: (id: string, hexData: string) => void): void {
    this._onNotification = handler;
  }

  setDisconnectedListener(handler: (id: string) => void): void {
    this._onDeviceDisconnected = handler;
  }

  async init(): Promise<void> {
    this._assertActive();
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      this._noble ??= this._factory();
      this._nobleInstances.add(this._noble);
      this._discoverHandler ??= peripheral => {
        this._discovered.set(peripheral.id, peripheral);
        this._lastSeen.set(peripheral.id, Date.now());
      };
      this._noble.removeListener('discover', this._discoverHandler);
      this._noble.on('discover', this._discoverHandler);
      await this._waitForPoweredOn(TREZOR_BLE_POWER_ON_TIMEOUT_MS);
      this._assertActive();
      this._initialized = true;
    })();
    try {
      await this._initPromise;
    } finally {
      this._initPromise = undefined;
    }
  }

  async checkAvailability(): Promise<TrezorBleAvailability> {
    this._assertActive();
    if (!this._noble) {
      try {
        this._noble = this._factory();
        this._nobleInstances.add(this._noble);
      } catch {
        return { available: false, state: 'unsupported', initialized: false };
      }
    }
    const state = this._noble?.state ?? 'unknown';
    return {
      available: state === 'poweredOn',
      state,
      initialized: this._initialized,
    };
  }

  /**
   * Lazy-start a continuous scan and return the current snapshot immediately.
   *
   * Scans UNFILTERED and filters for Trezor in `_snapshot()` instead. A
   * service-UUID filter cannot be used here: noble's Windows backend applies it
   * per RECEIVED PACKET (`BLEManager::OnScanResult`, lib/win/src/ble_manager.cc),
   * and a Safe 7's ADV packet carries only its name — the service UUID lives in
   * the scan response, which arrives as a separate, irregularly-timed event. So
   * a filtered scan drops every ADV packet and the device appears to be
   * undiscoverable for minutes at a time while it is plainly on air. (OneKey's
   * own devices do advertise their service UUID, which is why the same filter is
   * safe in `hd-transport-electron` and was copied here by mistake.)
   */
  async scan(options?: {
    /** Accepted for IPC compatibility with older renderers, but ALWAYS ignored — see the doc comment above. */
    serviceUuids?: string[];
    durationMs?: number;
  }): Promise<TrezorBleDeviceInfo[]> {
    await this.init();
    if (!this._scanning) {
      this._scanning = true;
      // allowDuplicates=true keeps advertisements flowing so we can age out gone devices.
      try {
        await this._requireNoble().startScanningAsync([], true);
        // warn: unfiltered scan on the noble instance shared with the OneKey
        // handler — must always be visible for cross-correlation.
        this._log('warn', 'scan.start', {
          ignoredServiceUuids: options?.serviceUuids,
          allowDuplicates: true,
        });
      } catch (error) {
        this._scanning = false;
        this._log('warn', 'scan.start.error', { error: String(error) });
        await this._recoverNobleIfStuck(String(error));
      }
    }
    this._assertActive();
    this._armIdleStop();
    const devices = this._snapshot();
    // raw vs kept. An empty result now has two very different causes and the log
    // must say which: raw=0 means nothing is on air at all (radio, or the device
    // simply is not advertising); raw>0 with kept=0 means WE are dropping it —
    // the Trezor name/uuid filter is wrong. Without this the two look identical.
    if (devices.length === 0) {
      // Counts only: the scan is unfiltered, so naming what it saw would put
      // bystanders' devices in a log the user hands to support.
      this._log('warn', 'scan.empty', {
        raw: this._discovered.size,
        kept: 0,
        named: [...this._discovered.values()].filter(p => p.advertisement?.localName).length,
      });
    }
    return devices;
  }

  /**
   * Current in-range Trezor devices, dropping any that aged past the liveness
   * TTL. The Trezor test replaces the service-UUID scan filter we cannot use
   * (see `scan`): it matches the name from the ADV packet, or the service UUID
   * once a scan response has merged into the same peripheral.
   *
   * Note the TTL only prunes what the CALLER sees. `_discovered` is a cache, not
   * the source of truth for reachability — a device missing from here can still
   * be connected to by id (`_directConnect`).
   */
  private _snapshot(): TrezorBleDeviceInfo[] {
    const now = Date.now();
    const result: TrezorBleDeviceInfo[] = [];
    for (const [id, peripheral] of this._discovered) {
      if (now - (this._lastSeen.get(id) ?? 0) > TREZOR_BLE_DEVICE_TTL_MS) {
        this._discovered.delete(id);
        this._lastSeen.delete(id);
        continue;
      }
      if (!isTrezorPeripheral(peripheral)) continue;
      result.push(peripheralToInfo(peripheral));
    }
    // A device WE hold a link to stops advertising (standard BLE), so it ages
    // out of the scan cache above within the TTL — exactly while keep-alive
    // holds the link for up to minutes. Without this merge, the one device the
    // user is actively using vanishes from the device list. Field-verified:
    // pairing/THP handshake alone does NOT silence a Safe 7; holding the
    // connection does.
    for (const [id, entry] of this._connected) {
      if (result.some(info => info.id === id)) continue;
      result.push(peripheralToInfo(entry.peripheral));
    }
    return result;
  }

  /** A noble instance with its own bindings, so a stuck one can be replaced. */
  private _createFreshNoble(): NobleLike {
    const candidate = this._factory() as NobleLike & {
      withBindings?: () => NobleLike;
    };
    return typeof candidate.withBindings === 'function' ? candidate.withBindings() : candidate;
  }

  /**
   * Rebuild noble when its adapter state is stuck. Re-enumerating the Windows
   * BLE stack (pairing, or removing the device from OS settings) can catch
   * noble's RadioWatcher mid-churn: it latches `unsupported` and never
   * re-evaluates, so every later scan fails until the process restarts. Fresh
   * bindings restart that watcher, which is the in-process equivalent of the
   * app restart that is otherwise the only cure.
   */
  private async _recoverNobleIfStuck(reason: string): Promise<void> {
    if (this._disposed) return;
    const state = this._noble?.state;
    if (state === 'poweredOn' || !this._initialized) return;
    // Never tear down bindings out from under a live link.
    if (this._connected.size > 0) {
      this._log('warn', 'noble.recover.skip', {
        reason,
        state,
        connected: this._connected.size,
      });
      return;
    }
    const now = Date.now();
    if (this._lastNobleRecoverAt && now - this._lastNobleRecoverAt < NOBLE_RECOVER_COOLDOWN_MS) {
      return;
    }
    this._lastNobleRecoverAt = now;
    this._log('warn', 'noble.recover.start', { reason, state });
    try {
      const previous = this._noble;
      if (previous && this._discoverHandler) {
        previous.removeListener('discover', this._discoverHandler);
      }
      // The default factory returns noble's module singleton — the very object
      // that is stuck — so rebuilding needs `withBindings()`, which mints a new
      // instance (and with it a new RadioWatcher). Injected factories are
      // assumed to already hand back a fresh instance.
      const fresh = this._createFreshNoble();
      this._noble = fresh;
      this._nobleInstances.add(fresh);
      if (this._discoverHandler) {
        fresh.on('discover', this._discoverHandler);
      }
      this._scanning = false;
      this._discovered.clear();
      this._lastSeen.clear();
      await this._waitForPoweredOn(TREZOR_BLE_POWER_ON_TIMEOUT_MS);
      this._log('warn', 'noble.recover.done', { state: this._noble?.state });
    } catch (error) {
      // Recovery is best-effort; the caller already reported the scan failure.
      this._log('warn', 'noble.recover.error', { error: String(error) });
    }
  }

  private _armIdleStop(): void {
    if (this._disposed) return;
    this._clearIdleStop();
    this._idleStopTimer = setTimeout(() => {
      void this._stopContinuousScan();
    }, TREZOR_BLE_SCAN_IDLE_STOP_MS);
  }

  private _clearIdleStop(): void {
    if (this._idleStopTimer) {
      clearTimeout(this._idleStopTimer);
      this._idleStopTimer = undefined;
    }
  }

  /** Stop scanning but keep the discovered cache (used before connect). */
  private async _pauseScan(): Promise<void> {
    this._clearIdleStop();
    if (!this._scanning) return;
    this._scanning = false;
    await this._noble?.stopScanningAsync().catch(() => undefined);
  }

  /** Stop scanning and forget discovered devices (idle timeout / teardown). */
  private async _stopContinuousScan(): Promise<void> {
    await this._pauseScan();
    this._discovered.clear();
    this._lastSeen.clear();
  }

  async stopScan(): Promise<void> {
    await this._stopContinuousScan();
  }

  /**
   * Look up a previously-scanned device by id (no extra BLE traffic).
   * Returns null if the device hasn't been seen by a recent scan.
   */
  getDevice(id: string): TrezorBleDeviceInfo | null {
    const p = this._discovered.get(id);
    if (!p) return null;
    return peripheralToInfo(p);
  }

  /**
   * Read the current RSSI (in dBm) for a connected peripheral. Requires
   * the device to be connected — noble can't read RSSI off a scan-only
   * peripheral. Falls back to the cached scan-time rssi when the noble
   * peripheral doesn't expose updateRssiAsync.
   */
  async readRssi(id: string): Promise<number> {
    const entry = this._requireEntry(id);
    if (entry.peripheral.updateRssiAsync) {
      return entry.peripheral.updateRssiAsync();
    }
    return entry.peripheral.rssi;
  }

  /**
   * Abort the in-flight pairing flow: abandon a connect that is still running,
   * stop scanning, disconnect every peripheral the host currently has open.
   * Caller is responsible for surfacing the cancellation to the upper UI layer.
   *
   * Abandoning the connect is what actually ends the flow. Pairing happens
   * inside connectAsync and the entry only reaches _connected after service
   * discovery, so the loop below never sees the device being paired — without
   * the abandon the caller waits out the full connect timeout, which is sized
   * to the OS pairing window and so feels like a hang.
   */
  async cancelPairing(): Promise<void> {
    const attempt = this._activeConnect;
    if (attempt) {
      this._activeConnect = undefined;
      // connect()'s catch tears down the half-open peripheral from _discovered.
      attempt.abandon(new Error(`connect cancelled: ${attempt.id}`));
    }
    await this.stopScan();
    for (const id of Array.from(this._connected.keys())) {
      await this.disconnect(id).catch(() => undefined);
    }
  }

  /**
   * Scan for a specific peripheral id and resolve THE MOMENT it's discovered,
   * stopping the scan immediately (don't wait out the full window). The fast
   * reconnect path for a stored connectId when the device IS advertising.
   *
   * This used to be the only reconnect path, on two assumptions that are both
   * false: that noble cannot connect by id without a scan (it can — see
   * `_directConnect`), and that "the device advertises continuously" (a bonded
   * Safe 7 does not — it holds the link and goes silent). Callers must fall
   * back to `_directConnect` when this returns undefined.
   */
  private async _scanUntilFound(
    id: string,
    timeoutMs: number
  ): Promise<NoblePeripheralLike | undefined> {
    await this.init();
    const existing = this._discovered.get(id);
    if (existing) return existing;
    const noble = this._requireNoble();
    return new Promise<NoblePeripheralLike | undefined>(resolve => {
      let done = false;
      const finish = (p?: NoblePeripheralLike) => {
        if (done) return;
        done = true;
        this._pendingCancellations.delete(cancel);
        clearTimeout(timer);
        noble.removeListener('discover', onDiscover);
        void noble.stopScanningAsync().catch(() => undefined);
        resolve(p);
      };
      const onDiscover = (peripheral: NoblePeripheralLike) => {
        this._discovered.set(peripheral.id, peripheral);
        if (peripheral.id === id) finish(peripheral);
      };
      const timer = setTimeout(() => finish(this._discovered.get(id)), timeoutMs);
      const cancel = () => finish();
      this._pendingCancellations.add(cancel);
      noble.on('discover', onDiscover);
      // Unfiltered, for the same reason as `scan()` — a service-UUID filter
      // drops the Safe 7's ADV packets outright on Windows.
      void noble.startScanningAsync([], false).catch(() => finish());
    });
  }

  /**
   * Connect by id with no scan and no advertisement.
   *
   * This is the ONLY path that reaches a device which is connected but silent.
   * A Trezor Safe 7 stops advertising while it HOLDS A LINK (standard BLE; its
   * screen says "wait connection") — field-verified: bonding/THP handshake
   * alone does NOT silence it, holding the connection does. So while a link is
   * up, no amount of scanning will rediscover it — `_scanUntilFound` alone
   * dead-ends with "device not found" on a device that is sitting right there,
   * connected and reachable.
   *
   * noble supports this: `noble.connectAsync(id)` needs no prior `discover`,
   * because both native backends materialize the peripheral themselves (Windows
   * synthesizes one for an unknown address, macOS retrieves it by identifier)
   * and then emit a `discover`, which our own handler turns back into a
   * `_discovered` entry. OneKey's own noble handler calls this "direct
   * connection mode"; Trezor Suite's equivalent is asking the adapter for its
   * peripheral list instead of keeping a cache.
   *
   * Returns undefined (not throw) so the caller reports the normal
   * "device not found" rather than a confusing noble-internal error.
   */
  private async _directConnect(id: string): Promise<NoblePeripheralLike | undefined> {
    const noble = this._requireNoble();
    if (typeof noble.connectAsync !== 'function') {
      // An old/stub noble. Say so explicitly — otherwise this is indistinguishable
      // in the log from "the device wasn't there", which is a different problem.
      this._log('warn', 'connect.direct.unavailable', { id });
      return undefined;
    }
    // warn, not info: this call is the load-bearing assumption of the whole fix —
    // that noble can still reach a bonded device which has STOPPED ADVERTISING.
    // It has never been proven against real hardware, so it must always be in the
    // log, not only when debug logging happens to be on.
    this._log('warn', 'connect.direct.start', { id });
    const startedAt = Date.now();
    try {
      // Bounded by the overall connect timeout in `connect()` — noble itself has
      // none, and the macOS backend silently never resolves when it cannot
      // retrieve the peripheral.
      const peripheral = await noble.connectAsync(id);
      const resolved = peripheral ?? this._discovered.get(id);
      this._log('warn', 'connect.direct.done', {
        id,
        elapsedMs: Date.now() - startedAt,
        found: Boolean(resolved),
        // The one field that says whether the fix actually worked: an open link,
        // or merely an object. Anything other than 'connected' is a failure that
        // would otherwise surface later as a confusing service-discovery error.
        state: resolved?.state,
        fromNoble: Boolean(peripheral),
      });
      return resolved;
    } catch (error) {
      this._log('warn', 'connect.direct.error', {
        id,
        elapsedMs: Date.now() - startedAt,
        error: String(error),
      });
      return undefined;
    }
  }

  // noble's disconnectAsync hangs on a peripheral whose connect just failed (it
  // waits for a CoreBluetooth disconnect event that never comes); bound it so a
  // cleanup disconnect can't hang the connect flow.
  private async _safeDisconnect(peripheral: NoblePeripheralLike): Promise<void> {
    if (this._nativeReleased) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        peripheral.disconnectAsync().catch(() => undefined),
        new Promise<void>(resolve => {
          timeout = setTimeout(resolve, BLE_DISCONNECT_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  // noble has no connect timeout, so a stale bond hangs anywhere — connectAsync
  // OR the post-connect (encrypted) service discovery. One overall timeout
  // covers the whole flow. Two distinct failures reach the connector: a `timed
  // out` reject (device unreachable) vs a connectAsync `connection failed`
  // reject (link refused / stale bond) — mapped to different error codes there.
  async connect(id: string): Promise<{ id: string; name?: string }> {
    this._assertActive();
    // Promise.race only times out the CALLER — it cannot cancel the in-flight
    // _connectInner. Native cancellation is handled separately during disposal.
    // Without the claim token a late
    // connectAsync success would still discover services and commit to
    // _connected: an open GATT link nobody owns, and since a linked Safe 7
    // stops advertising, every retry then dead-ends until app restart. The
    // token flags the attempt as abandoned so a late success tears the link
    // down instead of committing it.
    const claim: { abandoned: boolean; cancelNative?: () => void } = { abandoned: false };
    // The timeout is one way to abandon the attempt; cancelPairing is the other,
    // so the rejection is hoisted out of the timer and both share it.
    let abandon!: (error: Error) => void;
    const abandoned = new Promise<never>((_, reject) => {
      abandon = (error: Error) => {
        claim.abandoned = true;
        reject(error);
      };
    });
    const timer = setTimeout(
      () => abandon(new Error(`connect timed out after ${this._connectTimeoutMs}ms`)),
      this._connectTimeoutMs
    );
    const attempt = {
      id,
      abandon,
      cancelNative: () => claim.cancelNative?.(),
      settled: Promise.resolve<unknown>(undefined),
    };
    this._activeConnect = attempt;
    this._connectAttempts.add(attempt);
    const nativeOperation = this._connectInner(id, claim);
    const caller = (async () => {
      try {
        return await Promise.race([nativeOperation, abandoned]);
      } catch (error) {
        const peripheral = this._discovered.get(id);
        if (peripheral) await this._safeDisconnect(peripheral);
        throw error;
      } finally {
        clearTimeout(timer);
        if (this._activeConnect === attempt) this._activeConnect = undefined;
      }
    })();
    // A rejected caller can still have a native connect or disconnect in flight.
    attempt.settled = Promise.allSettled([nativeOperation, caller]).finally(() => {
      this._connectAttempts.delete(attempt);
    });
    return caller;
  }

  private async _connectInner(
    id: string,
    claim: { abandoned: boolean; cancelNative?: () => void }
  ): Promise<{ id: string; name?: string }> {
    await this.init();
    // Stop scanning (keep the cache) and let the radio settle before connecting.
    await this._pauseScan();
    await delay(BLE_CONNECT_SETTLE_MS);
    this._assertActive();
    // Which of the three routes got us a peripheral is THE diagnostic for this
    // whole area: a cache hit means the happy path; a scan hit means the device
    // was still advertising; `direct` means it had gone silent and only
    // connect-by-id could reach it; `none` means we are back to the old dead end.
    let route: 'cache' | 'scan' | 'direct' | 'none' = 'cache';
    let peripheral = this._discovered.get(id);
    if (!peripheral) {
      route = 'scan';
      peripheral = await this._scanUntilFound(id, TREZOR_BLE_SCAN_DURATION_MS);
    }
    if (!peripheral) {
      route = 'direct';
    }
    if (!peripheral) {
      // Last resort, and the only path that works for a bonded-but-silent
      // device. See _directConnect.
      //
      // Deliberately AFTER the scan, even though that costs the full scan window
      // on this path: macOS's noble backend never resolves connect-by-id for a
      // peripheral CoreBluetooth cannot retrieve (it drops the failure on the
      // floor — `NobleMac::Connect`, lib/mac/src/noble_mac.mm), so trying it
      // first would risk hanging where a scan would simply have found the device.
      const native = this._requireNoble();
      claim.cancelNative = () => native.cancelConnect?.(id);
      peripheral = await this._directConnect(id);
    }
    if (!peripheral) {
      // Every route exhausted. Log what we could see, so "device not found" is
      // never again a dead end with nothing behind it: `discoveredCount` says
      // whether the scan saw ANY BLE traffic (0 = radio/scan problem) and
      // `trezorCount` whether the name/uuid filter is rejecting our own device.
      // Counts only — see scan.empty. The target id is ours to log; the rest of
      // the unfiltered scan is not.
      this._log('warn', 'connect.notFound', {
        id,
        route: 'none',
        discoveredCount: this._discovered.size,
        trezorCount: [...this._discovered.values()].filter(isTrezorPeripheral).length,
      });
      throw new Error(`Trezor BLE device not found: ${id}`);
    }

    // Checked after every await that can outlive the caller's timeout. The
    // rejection thrown here is unobservable (Promise.race already settled) —
    // its only job is to stop the flow before it commits an unowned link.
    const abortIfAbandoned = async (stage: string) => {
      if (!claim.abandoned && !this._disposed) return;
      // Tear down only a link nobody owns: if a previous connect still holds
      // this id in _connected, its keep-alive timers manage the link.
      if (peripheral && peripheral.state === 'connected' && !this._connected.has(id)) {
        await this._safeDisconnect(peripheral);
      }
      this._log('warn', 'connect.abandoned', { id, route, stage });
      throw new Error(`connect abandoned after timeout: ${id}`);
    };
    await abortIfAbandoned('resolve');

    const wasConnected = peripheral.state === 'connected';
    const connectingPeripheral = peripheral;
    const native = this._requireNoble();
    claim.cancelNative = () => {
      if (connectingPeripheral.state === 'connecting' && connectingPeripheral.cancelConnect) {
        connectingPeripheral.cancelConnect();
      } else {
        native.cancelConnect?.(id);
      }
    };
    // The single line that explains any BLE connect after the fact.
    this._log('warn', 'connect.route', {
      id,
      route,
      wasConnected,
      name: peripheral.advertisement?.localName,
    });
    if (!wasConnected) {
      await peripheral.connectAsync();
      await abortIfAbandoned('link');
    }

    try {
      const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
        [this._uuids.service],
        [this._uuids.write, this._uuids.notify]
      );
      const writeUuid = normalizeUuid(this._uuids.write);
      const notifyUuid = normalizeUuid(this._uuids.notify);
      const writeChar = characteristics.find(c => normalizeUuid(c.uuid) === writeUuid);
      const notifyChar = characteristics.find(c => normalizeUuid(c.uuid) === notifyUuid);
      if (!writeChar || !notifyChar) {
        throw new Error(`Trezor BLE characteristics not found on device ${id}`);
      }
      // Last gate before commit: service discovery can also outlast the timeout.
      await abortIfAbandoned('discovery');

      const disconnectHandler = () => {
        this._cleanupDevice(id, /* unexpected */ true);
      };
      peripheral.on('disconnect', disconnectHandler);

      this._connected.set(id, { peripheral, writeChar, notifyChar, disconnectHandler });
      this._log('info', 'connect.done', { id, name: peripheral.advertisement.localName });
      return { id, name: peripheral.advertisement.localName };
    } catch (error) {
      // Discovery failed after we opened the GATT connection — disconnect it
      // (bounded) so we don't leak it. Only if this call connected it.
      if (!wasConnected) await this._safeDisconnect(peripheral);
      throw error;
    }
  }

  async disconnect(id: string): Promise<void> {
    const entry = this._connected.get(id);
    if (!entry) return;
    if (entry.disconnectHandler) {
      // Suppress the unexpected-disconnect event for explicit disconnects.
      entry.peripheral.removeListener('disconnect', entry.disconnectHandler);
    }
    try {
      await entry.peripheral.disconnectAsync();
    } catch (error) {
      this._log('warn', 'disconnect.error', { id, error: String(error) });
    }
    this._cleanupDevice(id, /* unexpected */ false);
  }

  async subscribe(id: string): Promise<void> {
    const entry = this._requireEntry(id);
    if (!entry.notifyChar) throw new Error(`Trezor BLE notify char missing for ${id}`);
    if (entry.notifyHandler) return;
    const handler = (data: Buffer) => {
      this._onNotification?.(id, data.toString('hex'));
    };
    entry.notifyHandler = handler;
    entry.notifyChar.on('data', handler);
    await entry.notifyChar.subscribeAsync();
  }

  async unsubscribe(id: string): Promise<void> {
    const entry = this._connected.get(id);
    if (!entry?.notifyChar) return;
    if (entry.notifyHandler) {
      entry.notifyChar.removeListener('data', entry.notifyHandler);
      entry.notifyHandler = undefined;
    }
    try {
      await entry.notifyChar.unsubscribeAsync();
    } catch (error) {
      this._log('warn', 'unsubscribe.error', { id, error: String(error) });
    }
  }

  async write(id: string, hexData: string): Promise<void> {
    const entry = this._requireEntry(id);
    if (!entry.writeChar) throw new Error(`Trezor BLE write char missing for ${id}`);
    const buffer = Buffer.from(hexData, 'hex');
    for (let offset = 0; offset < buffer.length; offset += this._chunkSize) {
      this._assertActive();
      const slice = buffer.subarray(offset, offset + this._chunkSize);
      // Trezor BLE firmware expects FIXED-size packets: every packet must be
      // padded to the full MTU (244) with zeros. A short final packet is
      // silently dropped by the device → no response → RetriesExceeded.
      // Matches trezor-suite transport-bluetooth (`Buffer.alloc(chunkSize)`).
      const chunk = Buffer.alloc(this._chunkSize);
      slice.copy(chunk);
      // OneKey uses writeWithResponse for stability; mirror that.
      await entry.writeChar.writeAsync(chunk, false);
      if (offset + this._chunkSize < buffer.length) {
        await delay(TREZOR_BLE_WRITE_CHUNK_DELAY_MS);
      }
    }
  }

  /** Retire a renderer's handler without stopping a process-wide native manager. */
  dispose(): Promise<void> {
    if (this._disposePromise) return this._disposePromise;
    this._disposed = true;
    this._clearIdleStop();
    this._scanning = false;
    this._onNotification = undefined;
    this._onDeviceDisconnected = undefined;
    const connections = Array.from(this._connectAttempts);
    for (const attempt of connections) {
      attempt.abandon(new Error('Trezor BLE is shutting down'));
      try {
        attempt.cancelNative();
      } catch (error) {
        this._log('warn', 'dispose.cancelConnect.error', { error: String(error) });
      }
    }
    for (const cancel of this._pendingCancellations) cancel();
    if (this._noble && this._discoverHandler) {
      this._noble.removeListener('discover', this._discoverHandler);
    }
    const entries = Array.from(this._connected.entries());
    for (const [id, entry] of entries) {
      if (entry.disconnectHandler) {
        entry.peripheral.removeListener('disconnect', entry.disconnectHandler);
      }
      this._cleanupDevice(id, false);
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    this._disposePromise = (async () => {
      try {
        await Promise.race([
          Promise.allSettled([
            ...connections.map(attempt => attempt.settled),
            ...Array.from(this._nobleInstances, async instance => instance.stopScanningAsync()),
            ...entries.map(async ([, entry]) => {
              let unsubscribeTimeout: ReturnType<typeof setTimeout> | undefined;
              try {
                await Promise.race([
                  entry.notifyChar?.unsubscribeAsync().catch(() => undefined),
                  new Promise<void>(resolve => {
                    unsubscribeTimeout = setTimeout(resolve, 250);
                  }),
                ]);
              } finally {
                clearTimeout(unsubscribeTimeout);
                await this._safeDisconnect(entry.peripheral);
              }
            }),
          ]),
          new Promise<void>(resolve => {
            timeout = setTimeout(() => {
              this._log('warn', 'dispose.timeout');
              resolve();
            }, 3500);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
        this._discovered.clear();
        this._lastSeen.clear();
        this._initialized = false;
      }
    })();
    return this._disposePromise;
  }

  /**
   * Terminal native release, including instances replaced by adapter recovery.
   * A host sharing Noble must defer stop() until all transports have disposed,
   * and deduplicate instances passed to releaseNoble across those transports.
   */
  disposeForAppQuit(
    releaseNoble: (instance: { stop?(): void }) => void = instance => instance.stop?.()
  ): Promise<void> {
    if (!this._releasePromise) {
      this._releasePromise = this.dispose().finally(() => {
        this._nativeReleased = true;
        let releaseError: Error | undefined;
        for (const instance of this._nobleInstances) {
          try {
            releaseNoble(instance);
          } catch (error) {
            releaseError = error instanceof Error ? error : new Error(String(error));
          }
        }
        this._nobleInstances.clear();
        if (releaseError) throw releaseError;
        this._log('info', 'dispose.native.done');
      });
    }
    return this._releasePromise;
  }

  private _assertActive(): void {
    if (this._disposed) throw new Error('Trezor BLE is shutting down');
  }

  private _cleanupDevice(id: string, unexpected: boolean): void {
    const entry = this._connected.get(id);
    if (!entry) return;
    if (entry.notifyChar && entry.notifyHandler) {
      entry.notifyChar.removeListener('data', entry.notifyHandler);
    }
    this._connected.delete(id);
    if (unexpected) {
      this._log('warn', 'disconnect.unexpected', { id });
      this._onDeviceDisconnected?.(id);
    }
  }

  private _requireEntry(id: string): DeviceEntry {
    this._assertActive();
    const entry = this._connected.get(id);
    if (!entry) throw new Error(`Trezor BLE device is not connected: ${id}`);
    return entry;
  }

  private _requireNoble(): NobleLike {
    this._assertActive();
    if (!this._noble) throw new Error('Trezor BLE: noble was not initialized');
    return this._noble;
  }

  private async _waitForPoweredOn(timeoutMs: number): Promise<void> {
    const noble = this._requireNoble();
    if (noble.state === 'poweredOn') return;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        noble.removeListener('stateChange', handler);
        this._pendingCancellations.delete(cancel);
      };
      const cancel = () => {
        cleanup();
        reject(new Error('Trezor BLE is shutting down'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Trezor BLE: noble did not reach poweredOn within ${timeoutMs}ms (last state: ${noble.state})`
          )
        );
      }, timeoutMs);
      const handler = (state: string) => {
        if (state === 'poweredOn') {
          cleanup();
          resolve();
        } else if (state === 'unsupported' || state === 'unauthorized') {
          cleanup();
          reject(new Error(`Trezor BLE: noble state ${state}`));
        }
      };
      this._pendingCancellations.add(cancel);
      noble.on('stateChange', handler);
    });
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-electron-ble', event, data });
    if (!entry) return;

    this._logger?.(entry);
  }
}
