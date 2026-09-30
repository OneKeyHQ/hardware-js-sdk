import { type BleDebugLogLevel, type BleDebugLogger, redactBleDebugLogData } from './debugLog';
import {
  THIRD_PARTY_BLE_DEVICE_TTL_MS,
  THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS,
  THIRD_PARTY_BLE_SCAN_DURATION_MS,
  THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS,
} from './constants';

import type { ThirdPartyBleAvailability, ThirdPartyBleDeviceInfo } from './types/desktop-api';
import type {
  ElectronBleConnectOptions,
  ElectronBleMatch,
  ElectronBleScanOptions,
} from '@onekeyfe/hwk-adapter-core';

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
   * Connect by id with no scan; both backends emit `discover` as a side effect
   * (win `BLEManager::Connect`, mac `retrievePeripheralsWithIdentifiers`).
   */
  connectAsync?(idOrAddress: string): Promise<NoblePeripheralLike | undefined>;
  cancelConnect?(idOrAddress: string): void;
  reset?(): Promise<void>;
}

export interface NoblePeripheralLike {
  id: string;
  // Every advertisement field, so the host can look for a cross-transport
  // identity (e.g. a serial in manufacturerData) without another scan.
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

interface ConnectClaim {
  abandoned: boolean;
  cancelScan?: () => void;
  cancelNative?: () => void;
}

interface DeviceEntry {
  /** Opaque partition key from the caller; this handler never interprets it. */
  vendor?: string;
  write?: ElectronBleConnectOptions['write'];
  peripheral: NoblePeripheralLike;
  writeChar?: NobleCharacteristicLike;
  notifyChar?: NobleCharacteristicLike;
  notifyHandler?: (data: Buffer, isNotification: boolean) => void;
  disconnectHandler?: () => void;
}

const normalizeUuid = (uuid: string): string => uuid.replace(/-/g, '').toLowerCase();

/**
 * Matches a peripheral against caller-supplied criteria (service UUID or every
 * name pattern), standing in for the scan filter we cannot use (see `scan`).
 */
const matchesPeripheral = (p: NoblePeripheralLike, match?: ElectronBleMatch): boolean => {
  if (!match) return false;
  const adv = p.advertisement ?? {};
  const advertised = adv.serviceUuids ?? [];
  if (
    match.serviceUuids?.length &&
    advertised.some(uuid =>
      match.serviceUuids?.some(wanted => normalizeUuid(wanted) === normalizeUuid(uuid))
    )
  ) {
    return true;
  }
  const name = adv.localName;
  if (!match.namePatterns?.length || !name) return false;
  return match.namePatterns.every(pattern => new RegExp(pattern, 'i').test(name));
};

/** Hex-encodes buffers so the info survives the IPC structured clone. */
const peripheralToInfo = (p: NoblePeripheralLike): ThirdPartyBleDeviceInfo => {
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

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Waits for `work` or `ms`, whichever comes first; never rejects on timeout. */
const raceTimeout = async (
  work: Promise<unknown> | undefined,
  ms: number,
  onTimeout?: () => void
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>(resolve => {
        timer = setTimeout(() => {
          onTimeout?.();
          resolve();
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

// Radio-settle wait between stopping the scan and opening a GATT connection.
const BLE_CONNECT_SETTLE_MS = 300;
// noble has no connect timeout. SMP pairing timeout (30s, the OS dialog's
// limit) + 1s, so a first-time pairing is never cut off before the OS gives up.
const BLE_CONNECT_TIMEOUT_MS = 31_000;
// Cap on a cleanup disconnectAsync, which hangs on a just-failed connect.
const BLE_DISCONNECT_TIMEOUT_MS = 2_000;

/** Floor between noble rebuilds, so a persistent failure can't thrash. */
const NOBLE_RECOVER_COOLDOWN_MS = 10_000;

export interface NobleBleHandlerOptions {
  /** Override for tests; defaults to `require('@stoprocent/noble')`. */
  nobleFactory?: NobleFactory;
  /** Override the overall connect timeout (tests only; defaults to 31s). */
  connectTimeoutMs?: number;
  logger?: BleDebugLogger;
}

/** Noble BLE logic decoupled from Electron IPC, so tests can use a fake noble. */
export class NobleBleHandler {
  private _noble: NobleLike | undefined;

  private readonly _factory: NobleFactory;

  private readonly _connectTimeoutMs: number;

  private readonly _logger?: NobleBleHandlerOptions['logger'];

  private readonly _discovered = new Map<string, NoblePeripheralLike>();

  // id -> last advertisement time (snapshot TTL).
  private readonly _lastSeen = new Map<string, number>();

  private readonly _connected = new Map<string, DeviceEntry>();

  private _discoverHandler?: (peripheral: NoblePeripheralLike) => void;

  private _scanning = false;

  private readonly _scanOwners = new Set<string | symbol | undefined>();

  private _scanTransition: Promise<void> = Promise.resolve();

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
    vendor: string;
    abandon: (error: Error) => void;
    cancelNative: () => void;
    settled: Promise<unknown>;
  }>();

  private _nativeReleased = false;

  private _lastNobleRecoverAt?: number;

  constructor(options: NobleBleHandlerOptions = {}) {
    this._factory = options.nobleFactory ?? DEFAULT_NOBLE_FACTORY;
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
      await this._waitForPoweredOn(THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS);
      this._assertActive();
      this._initialized = true;
    })();
    try {
      await this._initPromise;
    } finally {
      this._initPromise = undefined;
    }
  }

  async checkAvailability(): Promise<ThirdPartyBleAvailability> {
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
   * Lazy-start an unfiltered scan and return the current snapshot. noble-win filters per
   * packet, and a Safe 7 ADV carries only its name (UUID is in the scan response).
   */
  async scan(options?: ElectronBleScanOptions): Promise<ThirdPartyBleDeviceInfo[]> {
    // Claim before init: a stopScan/cancelPairing during the power-on wait must
    // find this owner, or the scan revives once the adapter powers on.
    this._scanOwners.add(options?.vendor);
    try {
      await this.init();
    } catch (error) {
      this._scanOwners.delete(options?.vendor);
      throw error;
    }
    if (!this._scanOwners.has(options?.vendor)) return [];
    try {
      await this._setScanning(true);
    } catch (error) {
      this._log('warn', 'scan.start.error', { error: String(error) });
      await this._recoverNobleIfStuck(String(error));
    }
    this._assertActive();
    this._armIdleStop();
    const devices = this._snapshot(options);
    // raw=0: nothing on air; raw>0: the match criteria dropped it. Counts only,
    // so bystanders' devices from the unfiltered scan stay out of support logs.
    if (devices.length === 0) {
      this._log('warn', 'scan.empty', {
        raw: this._discovered.size,
        kept: 0,
        named: [...this._discovered.values()].filter(p => p.advertisement?.localName).length,
      });
    }
    return devices;
  }

  /**
   * In-range devices matching the caller, minus TTL-expired ones. `_discovered`
   * is only a cache; a missing device can still be reached by `_directConnect`.
   */
  private _snapshot(options?: ElectronBleScanOptions): ThirdPartyBleDeviceInfo[] {
    const now = Date.now();
    const match = options?.match ?? { serviceUuids: options?.serviceUuids };
    const result: ThirdPartyBleDeviceInfo[] = [];
    for (const [id, peripheral] of this._discovered) {
      if (now - (this._lastSeen.get(id) ?? 0) > THIRD_PARTY_BLE_DEVICE_TTL_MS) {
        this._discovered.delete(id);
        this._lastSeen.delete(id);
        continue;
      }
      if (!matchesPeripheral(peripheral, match)) continue;
      result.push(peripheralToInfo(peripheral));
    }
    // A linked device stops advertising and ages out above, so merge held links
    // back in (field-verified on Safe 7: holding the link silences it).
    for (const [id, entry] of this._connected) {
      if (entry.vendor !== options?.vendor) continue;
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
   * Rebuild noble when Windows BLE re-enumeration latched its RadioWatcher at
   * `unsupported`; fresh bindings restart the watcher without an app restart.
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
      // The default factory returns the stuck module singleton; `withBindings()`
      // mints a new instance. Injected factories are assumed to return fresh ones.
      const fresh = this._createFreshNoble();
      this._noble = fresh;
      this._nobleInstances.add(fresh);
      if (this._discoverHandler) {
        fresh.on('discover', this._discoverHandler);
      }
      this._scanning = false;
      this._discovered.clear();
      this._lastSeen.clear();
      await this._waitForPoweredOn(THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS);
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
    }, THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS);
  }

  private _clearIdleStop(): void {
    if (this._idleStopTimer) {
      clearTimeout(this._idleStopTimer);
      this._idleStopTimer = undefined;
    }
  }

  // Keep native start/stop callbacks ordered: a late stop must finish before
  // a newer scan starts, even when callers belong to different vendors.
  private _setScanning(scanning: boolean): Promise<void> {
    const transition = this._scanTransition.then(async () => {
      if (scanning) {
        this._assertActive();
        if (this._scanOwners.size === 0) return;
      }
      if (this._scanning === scanning) return;
      this._scanning = scanning;
      try {
        if (scanning) {
          await this._requireNoble().startScanningAsync([], true);
          this._log('warn', 'scan.start', { allowDuplicates: true });
        } else {
          await this._noble?.stopScanningAsync();
        }
      } catch (error) {
        this._scanning = false;
        if (scanning) throw error;
      }
    });
    this._scanTransition = transition.catch(() => undefined);
    return transition;
  }

  /** Stop scanning but keep the discovered cache (used before connect). */
  private async _pauseScan(): Promise<void> {
    this._clearIdleStop();
    await this._setScanning(false);
  }

  /** Stop scanning and forget discovered devices (idle timeout / teardown). */
  private async _stopContinuousScan(): Promise<void> {
    this._scanOwners.clear();
    this._discovered.clear();
    this._lastSeen.clear();
    await this._pauseScan();
  }

  /** A vendor releasing discovery must not stop another vendor's scan. */
  async stopScan(vendor?: string): Promise<void> {
    if (vendor !== undefined) {
      this._scanOwners.delete(vendor);
      if (this._scanOwners.size > 0) return;
    }
    await this._stopContinuousScan();
  }

  /**
   * Look up a previously-scanned device by id (no extra BLE traffic).
   * Returns null if the device hasn't been seen by a recent scan.
   */
  getDevice(id: string): ThirdPartyBleDeviceInfo | null {
    const p = this._discovered.get(id);
    if (!p) return null;
    return peripheralToInfo(p);
  }

  /** Live RSSI (dBm) of a connected peripheral, else the cached scan-time value. */
  async readRssi(id: string): Promise<number> {
    const entry = this._requireEntry(id);
    if (entry.peripheral.updateRssiAsync) {
      return entry.peripheral.updateRssiAsync();
    }
    return entry.peripheral.rssi;
  }

  /** Abandon matching pairing attempts without touching another owner's links. */
  async cancelPairing(options?: { vendor: string; id?: string }): Promise<void> {
    const matches = (id: string, vendor?: string) =>
      options === undefined ||
      (vendor === options.vendor && (options.id === undefined || id === options.id));
    for (const attempt of this._connectAttempts) {
      if (!matches(attempt.id, attempt.vendor)) continue;
      attempt.abandon(new Error(`connect cancelled: ${attempt.id}`));
      try {
        attempt.cancelNative();
      } catch (error) {
        this._log('warn', 'cancelPairing.cancelConnect.error', {
          id: attempt.id,
          error: String(error),
        });
      }
    }
    if (options?.id === undefined) await this.stopScan(options?.vendor);
    for (const [id, entry] of this._connected) {
      if (matches(id, entry.vendor)) await this.disconnect(id).catch(() => undefined);
    }
  }

  /**
   * Scan until `id` is discovered, releasing only its own scan ownership. A
   * bonded Safe 7 goes silent, so callers fall back to `_directConnect`.
   */
  private async _scanUntilFound(
    id: string,
    timeoutMs: number,
    claim: ConnectClaim
  ): Promise<NoblePeripheralLike | undefined> {
    await this.init();
    if (claim.abandoned) return undefined;
    const existing = this._discovered.get(id);
    if (existing) return existing;
    const noble = this._requireNoble();
    const owner = Symbol('connect-scan');
    this._scanOwners.add(owner);
    return new Promise<NoblePeripheralLike | undefined>(resolve => {
      let done = false;
      const finish = (p?: NoblePeripheralLike) => {
        if (done) return;
        done = true;
        this._pendingCancellations.delete(cancel);
        clearTimeout(timer);
        noble.removeListener('discover', onDiscover);
        if (claim.cancelScan === cancel) claim.cancelScan = undefined;
        this._scanOwners.delete(owner);
        if (this._scanOwners.size === 0) {
          void this._pauseScan().then(() => resolve(p));
        } else {
          resolve(p);
        }
      };
      const onDiscover = (peripheral: NoblePeripheralLike) => {
        this._discovered.set(peripheral.id, peripheral);
        if (peripheral.id === id) finish(peripheral);
      };
      const timer = setTimeout(() => finish(this._discovered.get(id)), timeoutMs);
      const cancel = () => finish();
      this._pendingCancellations.add(cancel);
      claim.cancelScan = cancel;
      noble.on('discover', onDiscover);
      void this._setScanning(true).catch(() => finish());
    });
  }

  /**
   * Connect by id without advertisement: the only route to a linked, silent device.
   * Returns undefined instead of throwing so the caller reports "device not found".
   */
  private async _directConnect(id: string): Promise<NoblePeripheralLike | undefined> {
    const noble = this._requireNoble();
    if (typeof noble.connectAsync !== 'function') {
      // Distinguishes a stub noble from "the device wasn't there" in the log.
      this._log('warn', 'connect.direct.unavailable', { id });
      return undefined;
    }
    // warn, not info: reaching a silent bonded device this way is unproven on
    // real hardware, so it must always be logged.
    this._log('warn', 'connect.direct.start', { id });
    const startedAt = Date.now();
    try {
      // Bounded by the connect() timeout; noble-mac never resolves when it
      // cannot retrieve the peripheral.
      const peripheral = await noble.connectAsync(id);
      const resolved = peripheral ?? this._discovered.get(id);
      this._log('warn', 'connect.direct.done', {
        id,
        elapsedMs: Date.now() - startedAt,
        found: Boolean(resolved),
        // Anything but 'connected' later surfaces as a service-discovery error.
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

  // noble's disconnectAsync hangs after a failed connect (CoreBluetooth never
  // sends the disconnect event), so bound it.
  private async _safeDisconnect(peripheral: NoblePeripheralLike): Promise<void> {
    if (this._nativeReleased) return;
    await raceTimeout(
      peripheral.disconnectAsync().catch(() => undefined),
      BLE_DISCONNECT_TIMEOUT_MS
    );
  }

  // One timeout covers connect and service discovery; the connector maps
  // `timed out` (unreachable) and `connection failed` (stale bond) differently.
  async connect(
    id: string,
    options: ElectronBleConnectOptions
  ): Promise<{ id: string; name?: string }> {
    if (
      !options ||
      !options.vendor ||
      ![options.serviceUuid, options.writeUuid, options.notifyUuid].every(
        uuid => typeof uuid === 'string' && /^[0-9a-f]{32}$/i.test(normalizeUuid(uuid))
      )
    ) {
      throw new Error('Invalid BLE GATT profile');
    }
    this._assertActive();
    // Promise.race cannot stop _connectInner; the claim makes a late success tear
    // its link down instead of committing an unowned one that silences the device.
    const claim: ConnectClaim = { abandoned: false };
    // Shared by the timeout and cancelPairing.
    let abandon!: (error: Error) => void;
    const abandoned = new Promise<never>((_, reject) => {
      abandon = (error: Error) => {
        claim.abandoned = true;
        reject(error);
        claim.cancelScan?.();
      };
    });
    const timer = setTimeout(
      () => abandon(new Error(`connect timed out after ${this._connectTimeoutMs}ms`)),
      this._connectTimeoutMs
    );
    const attempt = {
      id,
      vendor: options.vendor,
      abandon,
      cancelNative: () => claim.cancelNative?.(),
      settled: Promise.resolve<unknown>(undefined),
    };
    this._connectAttempts.add(attempt);
    const nativeOperation = this._connectInner(id, claim, options);
    const caller = (async () => {
      try {
        return await Promise.race([nativeOperation, abandoned]);
      } catch (error) {
        const peripheral = this._discovered.get(id);
        // Tear down only a link nobody owns, same guard as _connectInner.abortIfAbandoned.
        if (peripheral && !this._connected.has(id)) await this._safeDisconnect(peripheral);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();
    // A rejected caller can still have a native connect or disconnect in flight.
    attempt.settled = Promise.allSettled([nativeOperation, caller]).finally(() => {
      this._connectAttempts.delete(attempt);
      // Resume the radio only for a connect-scan (symbol) owner; a vendor's
      // idle scan owner must not restart it during pairing.
      const connectScanWaiting = [...this._scanOwners].some(owner => typeof owner === 'symbol');
      if (connectScanWaiting) {
        this._armIdleStop();
        void this._setScanning(true).catch(() => undefined);
      }
    });
    return caller;
  }

  private async _connectInner(
    id: string,
    claim: ConnectClaim,
    options: ElectronBleConnectOptions
  ): Promise<{ id: string; name?: string }> {
    let route: 'cache' | 'scan' | 'direct' | 'none' = 'cache';
    let peripheral: NoblePeripheralLike | undefined;
    // Stops the flow before it commits an unowned link; the rejection itself is
    // unobservable because Promise.race already settled.
    const abortIfAbandoned = async (stage: string) => {
      if (!claim.abandoned && !this._disposed) return;
      // A link still held in _connected belongs to a previous connect.
      if (peripheral && peripheral.state === 'connected' && !this._connected.has(id)) {
        await this._safeDisconnect(peripheral);
      }
      this._log('warn', 'connect.abandoned', { id, route, stage });
      throw new Error(`connect abandoned after timeout: ${id}`);
    };
    await this.init();
    await abortIfAbandoned('init');
    // Stop scanning (keep the cache) and let the radio settle before connecting.
    await this._pauseScan();
    await delay(BLE_CONNECT_SETTLE_MS);
    await abortIfAbandoned('settle');
    this._assertActive();
    peripheral = this._discovered.get(id);
    if (!peripheral) {
      route = 'scan';
      peripheral = await this._scanUntilFound(id, THIRD_PARTY_BLE_SCAN_DURATION_MS, claim);
      await abortIfAbandoned('scan');
    }
    if (!peripheral) {
      route = 'direct';
      // Deliberately after the scan: noble-mac never resolves connect-by-id for a
      // peripheral CoreBluetooth cannot retrieve (`NobleMac::Connect`).
      const native = this._requireNoble();
      claim.cancelNative = () => native.cancelConnect?.(id);
      peripheral = await this._directConnect(id);
    }
    if (!peripheral) {
      // discoveredCount=0 points at the radio/scan; counts only, see scan.empty.
      this._log('warn', 'connect.notFound', {
        id,
        route: 'none',
        discoveredCount: this._discovered.size,
      });
      throw new Error(`BLE device not found: ${id}`);
    }

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
        [options.serviceUuid],
        [options.writeUuid, options.notifyUuid]
      );
      const writeUuid = normalizeUuid(options.writeUuid);
      const notifyUuid = normalizeUuid(options.notifyUuid);
      const writeChar = characteristics.find(c => normalizeUuid(c.uuid) === writeUuid);
      const notifyChar = characteristics.find(c => normalizeUuid(c.uuid) === notifyUuid);
      if (!writeChar || !notifyChar) {
        throw new Error(`BLE characteristics not found on device ${id}`);
      }
      // Last gate before commit: service discovery can also outlast the timeout.
      await abortIfAbandoned('discovery');

      const disconnectHandler = () => {
        // One peripheral outlives many links; a stale handler must not report
        // the current link as unexpectedly dropped.
        if (this._connected.get(id)?.disconnectHandler !== disconnectHandler) return;
        this._cleanupDevice(id, /* unexpected */ true);
      };
      peripheral.on('disconnect', disconnectHandler);

      this._connected.set(id, {
        peripheral,
        writeChar,
        notifyChar,
        disconnectHandler,
        vendor: options.vendor,
        write: options.write,
      });
      this._log('info', 'connect.done', { id, name: peripheral.advertisement.localName });
      return { id, name: peripheral.advertisement.localName };
    } catch (error) {
      // Don't leak a GATT link this call opened.
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
    this._cleanupDevice(id, /* unexpected */ false, entry);
  }

  async subscribe(id: string): Promise<void> {
    const entry = this._requireEntry(id);
    if (!entry.notifyChar) throw new Error(`BLE notify characteristic missing for ${id}`);
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
    if (!entry.writeChar) throw new Error(`BLE write characteristic missing for ${id}`);
    const buffer = Buffer.from(hexData, 'hex');
    const framing = entry.write;
    if (!framing) throw new Error(`No BLE write framing recorded for ${id}`);

    if (framing.mode === 'raw') {
      // Self-framed, so padding corrupts it. Ledger negotiates the size per link
      // (0x08 handshake) in one byte, so it never exceeds 255.
      const maxLength = framing.maxLength ?? buffer.length;
      if (!/^(?:[0-9a-f]{2})+$/i.test(hexData) || buffer.length > maxLength) {
        throw new Error(`Invalid BLE frame for ${entry.vendor ?? 'device'}`);
      }
      await entry.writeChar.writeAsync(buffer, false);
      return;
    }

    const { chunkSize } = framing;
    if (!chunkSize) throw new Error(`Padded BLE writes need a chunkSize for ${id}`);
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      this._assertActive();
      const slice = buffer.subarray(offset, offset + chunkSize);
      // Firmware drops a short final packet (then RetriesExceeded), so every chunk
      // is zero-filled to full size, as in trezor-suite transport-bluetooth.
      const chunk = Buffer.alloc(chunkSize);
      slice.copy(chunk);
      // OneKey uses writeWithResponse for stability; mirror that.
      await entry.writeChar.writeAsync(chunk, false);
      if (offset + chunkSize < buffer.length && framing.chunkDelayMs) {
        await delay(framing.chunkDelayMs);
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
      attempt.abandon(new Error('Desktop BLE is shutting down'));
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
    for (const [id] of entries) this._cleanupDevice(id, false);
    this._disposePromise = (async () => {
      try {
        await raceTimeout(
          Promise.allSettled([
            ...connections.map(attempt => attempt.settled),
            ...Array.from(this._nobleInstances, async instance => instance.stopScanningAsync()),
            ...entries.map(async ([, entry]) => {
              try {
                await raceTimeout(
                  entry.notifyChar?.unsubscribeAsync().catch(() => undefined),
                  250
                );
              } finally {
                await this._safeDisconnect(entry.peripheral);
              }
            }),
          ]),
          3500,
          () => this._log('warn', 'dispose.timeout')
        );
      } finally {
        this._discovered.clear();
        this._lastSeen.clear();
        this._initialized = false;
      }
    })();
    return this._disposePromise;
  }

  /**
   * Terminal native release, including recovered instances. A host sharing noble
   * must defer stop() until every transport disposed, and dedupe the instances.
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
    if (this._disposed) throw new Error('Desktop BLE is shutting down');
  }

  private _cleanupDevice(id: string, unexpected: boolean, expected?: DeviceEntry): void {
    const entry = this._connected.get(id);
    if (!entry) return;
    // A reconnect may have replaced the entry while the caller awaited.
    // A stale caller must not tear down the link it no longer owns.
    if (expected && entry !== expected) return;
    if (entry.notifyChar && entry.notifyHandler) {
      entry.notifyChar.removeListener('data', entry.notifyHandler);
    }
    // Otherwise a later explicit disconnect is reported as unexpected.
    if (entry.disconnectHandler) {
      entry.peripheral.removeListener('disconnect', entry.disconnectHandler);
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
    if (!entry) throw new Error(`BLE device is not connected: ${id}`);
    return entry;
  }

  private _requireNoble(): NobleLike {
    this._assertActive();
    if (!this._noble) throw new Error('Desktop BLE: noble was not initialized');
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
        reject(new Error('Desktop BLE is shutting down'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Desktop BLE: noble did not reach poweredOn within ${timeoutMs}ms (last state: ${noble.state})`
          )
        );
      }, timeoutMs);
      const handler = (state: string) => {
        if (state === 'poweredOn') {
          cleanup();
          resolve();
        } else if (state === 'unsupported' || state === 'unauthorized') {
          cleanup();
          reject(new Error(`Desktop BLE: noble state ${state}`));
        }
      };
      this._pendingCancellations.add(cancel);
      noble.on('stateChange', handler);
    });
  }

  private _log(level: BleDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    this._logger?.({
      level,
      scope: 'desktop-noble-ble',
      event,
      data: redactBleDebugLogData(data),
    });
  }
}
