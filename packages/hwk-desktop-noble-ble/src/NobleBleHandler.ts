import { HardwareErrorCode, createHwkError, isHardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { type BleDebugLogLevel, type BleDebugLogger, redactBleDebugLogData } from './debugLog';
import {
  THIRD_PARTY_BLE_DEVICE_TTL_MS,
  THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS,
  THIRD_PARTY_BLE_SCAN_DURATION_MS,
  THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS,
  THIRD_PARTY_BLE_STATE_SETTLE_TIMEOUT_MS,
} from './constants';
import { DEFAULT_THIRD_PARTY_BLE_VENDORS, normalizeBleUuid } from './vendorProfiles';

import type { ThirdPartyBleVendorProfile } from './vendorProfiles';
import type { ThirdPartyBleAvailability, ThirdPartyBleDeviceInfo } from './types/desktop-api';
import type { ElectronBleConnectOptions, ElectronBleScanOptions } from '@onekeyfe/hwk-adapter-core';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Subset of @stoprocent/noble we touch. We type as `any` to keep the package
 * installable without the native module — the default factory loads it on first use.
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
  /** Connecting by id to a device the scan never saw. */
  directPending?: boolean;
}

interface DeviceEntry {
  /** Registered vendor key; results and links never mix across it. */
  vendor?: string;
  write?: ElectronBleConnectOptions['write'];
  peripheral: NoblePeripheralLike;
  writeChar?: NobleCharacteristicLike;
  notifyChar?: NobleCharacteristicLike;
  notifyHandler?: (data: Buffer, isNotification: boolean) => void;
  disconnectHandler?: (reason?: unknown) => void;
}

// Longer than any real vendor name, and bounds the work a vendor name rule does per advertisement.
const BLE_NAME_MATCH_MAX_LENGTH = 64;

/**
 * Stands in for the scan filter we cannot use (see `scan`). Only the vendor profile decides; the
 * caller's service UUIDs can narrow the profile's set, and caller name patterns are never run.
 */
const matchesPeripheral = (
  p: NoblePeripheralLike,
  profile: ThirdPartyBleVendorProfile,
  narrowTo?: Set<string>,
  remembered?: ReadonlySet<string>
): boolean => {
  const adv = p.advertisement ?? {};
  const advertised = [...(adv.serviceUuids ?? []), ...(remembered ?? [])];
  if (
    advertised.some(
      uuid =>
        typeof uuid === 'string' &&
        profile.isServiceUuid(uuid) &&
        (!narrowTo || narrowTo.has(normalizeBleUuid(uuid)))
    )
  ) {
    return true;
  }
  const name = adv.localName;
  if (!profile.isName || typeof name !== 'string' || !name) return false;
  return profile.isName(name.slice(0, BLE_NAME_MATCH_MAX_LENGTH));
};

/** Renderer `serviceUuids` may only narrow the vendor's set; anything malformed is ignored. */
const requestedServiceUuids = (options?: ElectronBleScanOptions): Set<string> | undefined => {
  const requested = options?.match ? options.match.serviceUuids : options?.serviceUuids;
  if (!Array.isArray(requested)) return undefined;
  const uuids = requested.filter((uuid): uuid is string => typeof uuid === 'string');
  return uuids.length ? new Set(uuids.map(normalizeBleUuid)) : undefined;
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

type NativeBleError = Error & { nativeErrorDomain?: string; nativeErrorCode?: number };

const nativeErrorFields = (error: unknown) => {
  const { nativeErrorDomain, nativeErrorCode } = (error ?? {}) as NativeBleError;
  return { nativeErrorDomain, nativeErrorCode };
};

type BlePhase = 'connect' | 'subscribe' | 'write';

const shuttingDownError = () =>
  createHwkError({
    code: HardwareErrorCode.UnknownError,
    message: 'Desktop BLE is shutting down',
  });

const invariantError = (message: string) =>
  createHwkError({ code: HardwareErrorCode.UnknownError, message });

/** Not just `poweredOff`: an adapter without permission or support cannot be used either. */
const bluetoothUnavailableError = (state: string) =>
  createHwkError({
    code: HardwareErrorCode.DevicePermissionDenied,
    message: `Bluetooth is unavailable (state: ${state})`,
    params: {
      permissionDeniedReason: state === 'unauthorized' ? 'permissionDenied' : 'bluetoothTurnedOff',
      bluetoothState: state,
    },
  });

const BLE_UNUSABLE_STATES = new Set(['poweredOff', 'unauthorized', 'unsupported']);

/**
 * Native failure → HardwareErrorCode, at the only layer that sees the native fields. Messages
 * avoid "disconnected" / "not found": the Ledger adapter still retries on those words.
 */
const toCanonicalBleError = (
  error: unknown,
  phase: BlePhase,
  { linkLost = false, facts }: { linkLost?: boolean; facts?: Record<string, unknown> } = {}
): Error => {
  if (isHardwareErrorCode((error as { code?: unknown } | null)?.code)) return error as Error;
  const native = nativeErrorFields(error);
  const params = { phase, ...native, ...facts };
  if (native.nativeErrorDomain === 'CBErrorDomain' && native.nativeErrorCode === 14) {
    return createHwkError({
      code: HardwareErrorCode.BleBondInvalid,
      message: 'The device removed its Bluetooth pairing with this computer',
      params,
    });
  }
  // Apple reports a failed, rejected, cancelled and timed-out pairing alike.
  if (native.nativeErrorDomain === 'CBATTErrorDomain' && native.nativeErrorCode === 15) {
    return createHwkError({
      code: HardwareErrorCode.BlePairingTimeout,
      message: 'Bluetooth pairing did not complete',
      params,
    });
  }
  if (linkLost || phase === 'write') {
    return createHwkError({
      code: HardwareErrorCode.DeviceDisconnected,
      message: `BLE link dropped during ${phase}`,
      params,
    });
  }
  return createHwkError({
    code: HardwareErrorCode.BleConnectFailed,
    message: `BLE ${phase} failed`,
    params,
  });
};

/**
 * noble settles only a pending connect when the link drops, so discovery or subscribe would
 * wait out the connect timeout. Fail them with the drop's native error (macOS sends one).
 */
async function failOnNativeLinkLoss<T>(
  peripheral: NoblePeripheralLike,
  operation: Promise<T>,
  phase: BlePhase
): Promise<T> {
  let onDisconnect!: (reason?: unknown) => void;
  const linkLost = new Promise<never>((_, reject) => {
    onDisconnect = reason => {
      if (reason instanceof Error) reject(toCanonicalBleError(reason, phase, { linkLost: true }));
    };
  });
  peripheral.on('disconnect', onDisconnect);
  try {
    return await Promise.race([operation, linkLost]);
  } finally {
    peripheral.removeListener('disconnect', onDisconnect);
  }
}

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
// CoreBluetooth answers a subscribe only once the pairing it triggers settles; an unanswered
// pairing fails on its own (ATT 15) after ~30s, and a slow passkey confirmation has succeeded at
// 35s. This only catches a subscribe the OS never answers.
const BLE_SUBSCRIBE_TIMEOUT_MS = 60_000;

/** Floor between noble rebuilds, so a persistent failure can't thrash. */
const NOBLE_RECOVER_COOLDOWN_MS = 10_000;

export interface NobleBleHandlerOptions {
  /** Override for tests; defaults to `require('@stoprocent/noble')`. */
  nobleFactory?: NobleFactory;
  /** Override the overall connect timeout (tests only; defaults to 31s). */
  connectTimeoutMs?: number;
  /** Override the subscribe timeout (tests only; defaults to 60s). */
  subscribeTimeoutMs?: number;
  logger?: BleDebugLogger;
  /**
   * Vendors served over IPC, keyed by the `vendor` the renderer sends. Replaces the default map
   * (spread `DEFAULT_THIRD_PARTY_BLE_VENDORS` to add one); unknown vendors are rejected.
   */
  vendors?: Record<string, ThirdPartyBleVendorProfile>;
}

/** Noble BLE logic decoupled from Electron IPC, so tests can use a fake noble. */
export class NobleBleHandler {
  private _noble: NobleLike | undefined;

  private readonly _factory: NobleFactory;

  private readonly _connectTimeoutMs: number;

  private readonly _subscribeTimeoutMs: number;

  private readonly _logger?: NobleBleHandlerOptions['logger'];

  private readonly _vendors: ReadonlyMap<string, ThirdPartyBleVendorProfile>;

  private readonly _discovered = new Map<string, NoblePeripheralLike>();

  // id -> last advertisement time (snapshot TTL).
  private readonly _lastSeen = new Map<string, number>();

  // id -> service UUIDs seen since the device was last forgotten. noble-win replaces them with
  // every packet, so a scan response without them would hide the device; CoreBluetooth merges.
  private readonly _advertisedUuids = new Map<string, Set<string>>();

  // Devices a scan kept only by their remembered UUIDs; logged once each.
  private readonly _keptByMemory = new Set<string>();

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
    this._subscribeTimeoutMs = options.subscribeTimeoutMs ?? BLE_SUBSCRIBE_TIMEOUT_MS;
    this._logger = options.logger;
    // A Map, so an IPC vendor like `__proto__` cannot reach an inherited property.
    this._vendors = new Map(Object.entries(options.vendors ?? DEFAULT_THIRD_PARTY_BLE_VENDORS));
  }

  private _resolveVendor(vendor: unknown): {
    vendor: string;
    profile: ThirdPartyBleVendorProfile;
  } {
    const profile = typeof vendor === 'string' ? this._vendors.get(vendor) : undefined;
    if (typeof vendor !== 'string' || !profile) throw invariantError('Unsupported BLE vendor');
    return { vendor, profile };
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
        this._rememberServiceUuids(peripheral);
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
    await this._waitForKnownState(THIRD_PARTY_BLE_STATE_SETTLE_TIMEOUT_MS);
    this._assertActive();
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
    // Before any radio or owner bookkeeping: an unregistered caller gets nothing.
    const { vendor, profile } = this._resolveVendor(options?.vendor);
    // Claim before init: a stopScan/cancelPairing during the power-on wait must
    // find this owner, or the scan revives once the adapter powers on.
    this._scanOwners.add(vendor);
    try {
      await this.init();
    } catch (error) {
      this._scanOwners.delete(vendor);
      throw error;
    }
    if (!this._scanOwners.has(vendor)) return [];
    try {
      await this._setScanning(true);
    } catch (error) {
      this._log('warn', 'scan.start.error', { error: String(error) });
      await this._recoverNobleIfStuck(String(error));
    }
    this._assertActive();
    this._armIdleStop();
    const devices = this._snapshot(vendor, profile, requestedServiceUuids(options));
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

  private _rememberServiceUuids(peripheral: NoblePeripheralLike): void {
    const uuids = peripheral.advertisement?.serviceUuids;
    if (!uuids?.length) return;
    let seen = this._advertisedUuids.get(peripheral.id);
    if (!seen) {
      seen = new Set<string>();
      this._advertisedUuids.set(peripheral.id, seen);
    }
    for (const uuid of uuids) {
      if (typeof uuid === 'string') seen.add(uuid);
    }
  }

  /**
   * In-range devices matching the caller, minus TTL-expired ones. `_discovered`
   * is only a cache; a missing device can still be reached by `_directConnect`.
   */
  private _snapshot(
    vendor: string,
    profile: ThirdPartyBleVendorProfile,
    narrowTo?: Set<string>
  ): ThirdPartyBleDeviceInfo[] {
    const now = Date.now();
    const result: ThirdPartyBleDeviceInfo[] = [];
    for (const [id, peripheral] of this._discovered) {
      if (now - (this._lastSeen.get(id) ?? 0) > THIRD_PARTY_BLE_DEVICE_TTL_MS) {
        this._discovered.delete(id);
        this._lastSeen.delete(id);
        this._advertisedUuids.delete(id);
        this._keptByMemory.delete(id);
        continue;
      }
      if (!matchesPeripheral(peripheral, profile, narrowTo, this._advertisedUuids.get(id))) {
        continue;
      }
      if (!this._keptByMemory.has(id) && !matchesPeripheral(peripheral, profile, narrowTo)) {
        this._keptByMemory.add(id);
        this._log('info', 'scan.keptByMemory', { id });
      }
      result.push(peripheralToInfo(peripheral));
    }
    // A linked device stops advertising and ages out above, so merge held links
    // back in (field-verified on Safe 7: holding the link silences it).
    for (const [id, entry] of this._connected) {
      if (entry.vendor !== vendor) continue;
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
      this._advertisedUuids.clear();
      this._keptByMemory.clear();
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
    this._advertisedUuids.clear();
    this._keptByMemory.clear();
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
    // The scan cache holds every advertiser in range; only a registered vendor's device is exposed.
    const remembered = this._advertisedUuids.get(id);
    if (
      !p ||
      ![...this._vendors.values()].some(profile =>
        matchesPeripheral(p, profile, undefined, remembered)
      )
    ) {
      return null;
    }
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
      attempt.abandon(
        createHwkError({
          code: HardwareErrorCode.BlePairingCancelled,
          message: `connect cancelled: ${attempt.id}`,
          params: { phase: 'connect' },
        })
      );
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

  // One timeout covers connect and service discovery.
  async connect(
    id: string,
    options: ElectronBleConnectOptions
  ): Promise<{ id: string; name?: string }> {
    if (
      !options ||
      !options.vendor ||
      ![options.serviceUuid, options.writeUuid, options.notifyUuid].every(
        uuid => typeof uuid === 'string' && /^[0-9a-f]{32}$/i.test(normalizeBleUuid(uuid))
      )
    ) {
      throw invariantError('Invalid BLE GATT profile');
    }
    // Before any native work: only a registered vendor's own GATT profile and framing.
    if (!this._resolveVendor(options.vendor).profile.acceptsConnect(options)) {
      throw invariantError(`BLE GATT profile not allowed for ${options.vendor}`);
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
    const timer = setTimeout(() => {
      abandon(
        createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: `connect timed out after ${this._connectTimeoutMs}ms`,
          // A device no scan surfaced is not advertising; the Ledger adapter retries that one.
          params: {
            phase: 'connect',
            timedOut: true,
            ...(claim.directPending ? { notAdvertising: true } : {}),
          },
        })
      );
      // A link a committed connection owns stays up, same guard as abortIfAbandoned.
      if (this._connected.has(id)) return;
      // Like cancelPairing: a native connect left pending completes whenever the
      // device returns, and its late teardown can then drop the next attempt's link.
      try {
        claim.cancelNative?.();
      } catch (error) {
        this._log('warn', 'connect.timeout.cancelConnect.error', { id, error: String(error) });
      }
    }, this._connectTimeoutMs);
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
        this._log('warn', 'connect.error', {
          id,
          error: String(error),
          ...nativeErrorFields(error),
        });
        throw toCanonicalBleError(error, 'connect');
      } finally {
        clearTimeout(timer);
      }
    })();
    // A rejected caller can still have a native connect or disconnect in flight.
    attempt.settled = Promise.allSettled([nativeOperation, caller]).finally(() => {
      this._connectAttempts.delete(attempt);
      // The connect cleared the idle stop; re-arm it so an owner left behind (a picker that
      // connected without stopScan) still expires instead of keeping the radio on.
      if (this._scanOwners.size > 0) this._armIdleStop();
      // Resume the radio only for a connect-scan (symbol) owner; a vendor's
      // idle scan owner must not restart it during pairing.
      const connectScanWaiting = [...this._scanOwners].some(owner => typeof owner === 'symbol');
      if (connectScanWaiting) {
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
    const startedAt = Date.now();
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
      claim.directPending = true;
      peripheral = await this._directConnect(id);
      claim.directPending = false;
      // A cancelled direct connect returns undefined; report it as abandoned, not missing.
      await abortIfAbandoned('direct');
    }
    if (!peripheral) {
      // discoveredCount=0 points at the radio/scan; counts only, see scan.empty.
      this._log('warn', 'connect.notFound', {
        id,
        route: 'none',
        discoveredCount: this._discovered.size,
      });
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: `BLE device not found: ${id}`,
        params: { phase: 'connect', notAdvertising: true },
      });
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
      elapsedMs: Date.now() - startedAt,
    });
    if (!wasConnected) {
      await peripheral.connectAsync();
      this._log('info', 'connect.linked', { id, elapsedMs: Date.now() - startedAt });
      await abortIfAbandoned('link');
    }
    const linkedAt = Date.now();

    try {
      const { characteristics } = await failOnNativeLinkLoss(
        peripheral,
        peripheral.discoverSomeServicesAndCharacteristicsAsync(
          [options.serviceUuid],
          [options.writeUuid, options.notifyUuid]
        ),
        'connect'
      );
      const writeUuid = normalizeBleUuid(options.writeUuid);
      const notifyUuid = normalizeBleUuid(options.notifyUuid);
      const writeChar = characteristics.find(c => normalizeBleUuid(c.uuid) === writeUuid);
      const notifyChar = characteristics.find(c => normalizeBleUuid(c.uuid) === notifyUuid);
      if (!writeChar || !notifyChar) {
        throw createHwkError({
          code: HardwareErrorCode.BleConnectFailed,
          message: `BLE device ${id} lacks the expected characteristics`,
          params: { phase: 'connect' },
        });
      }
      // Last gate before commit: service discovery can also outlast the timeout.
      await abortIfAbandoned('discovery');

      const disconnectHandler = (reason?: unknown) => {
        // One peripheral outlives many links; a stale handler must not report
        // the current link as unexpectedly dropped.
        if (this._connected.get(id)?.disconnectHandler !== disconnectHandler) return;
        this._log('warn', 'disconnect.reason', {
          id,
          reason: String(reason),
          ...nativeErrorFields(reason),
        });
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
      this._log('info', 'connect.done', {
        id,
        name: peripheral.advertisement.localName,
        elapsedMs: Date.now() - startedAt,
      });
      return { id, name: peripheral.advertisement.localName };
    } catch (error) {
      // Don't leak a GATT link this call opened. A direct connect opened one even
      // though the peripheral arrives connected, unless a committed link owns it.
      const openedLink = !wasConnected || (route === 'direct' && !this._connected.has(id));
      if (openedLink) await this._safeDisconnect(peripheral);
      // noble-win names an unreachable GATT only in its text. The app weighs how soon the
      // link failed against the bond Windows holds, which the host cannot see.
      const unreachable = error instanceof Error && /\bunreachable\b/i.test(error.message);
      throw toCanonicalBleError(error, 'connect', {
        facts: unreachable
          ? { gattUnreachable: true, msSinceLink: Date.now() - linkedAt }
          : undefined,
      });
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
    if (!entry.notifyChar) throw invariantError(`BLE notify characteristic missing for ${id}`);
    if (entry.notifyHandler) return;
    const handler = (data: Buffer) => {
      this._onNotification?.(id, data.toString('hex'));
    };
    entry.notifyHandler = handler;
    entry.notifyChar.on('data', handler);
    try {
      await failOnNativeLinkLoss(
        entry.peripheral,
        this._withSubscribeTimeout(entry.notifyChar.subscribeAsync()),
        'subscribe'
      );
    } catch (error) {
      this._log('warn', 'subscribe.error', {
        id,
        error: String(error),
        ...nativeErrorFields(error),
      });
      throw this._toSubscribeError(error, entry.peripheral);
    }
  }

  private async _withSubscribeTimeout(subscribing: Promise<void>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          createHwkError({
            code: HardwareErrorCode.BleConnectFailed,
            message: `subscribe timed out after ${this._subscribeTimeoutMs}ms`,
            params: { phase: 'subscribe' },
          })
        );
      }, this._subscribeTimeoutMs);
      cancel = () => reject(shuttingDownError());
      this._pendingCancellations.add(cancel);
    });
    try {
      await Promise.race([subscribing, expired]);
    } finally {
      clearTimeout(timer);
      if (cancel) this._pendingCancellations.delete(cancel);
    }
  }

  /**
   * noble-win reports a failed subscribe only as `status: <AsyncStatus>`. Error (3) on a live
   * link is a device refusing the bond Windows holds; a link already gone fails it the same way.
   */
  private _toSubscribeError(error: unknown, peripheral: NoblePeripheralLike): Error {
    if (!(error instanceof Error) || error.message !== 'status: 3') {
      return toCanonicalBleError(error, 'subscribe');
    }
    if (peripheral.state !== 'connected') {
      return toCanonicalBleError(error, 'subscribe', { linkLost: true });
    }
    return createHwkError({
      code: HardwareErrorCode.BleBondInvalid,
      message: 'The device refused the Bluetooth pairing this computer holds',
      params: { phase: 'subscribe', asyncStatus: 3 },
    });
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
    const { writeChar } = entry;
    if (!writeChar) throw invariantError(`BLE write characteristic missing for ${id}`);
    const buffer = Buffer.from(hexData, 'hex');
    const framing = entry.write;
    if (!framing) throw invariantError(`No BLE write framing recorded for ${id}`);
    const writeChunk = async (chunk: Buffer) => {
      try {
        await writeChar.writeAsync(chunk, false);
      } catch (error) {
        this._log('warn', 'write.error', { id, error: String(error), ...nativeErrorFields(error) });
        throw toCanonicalBleError(error, 'write');
      }
    };

    if (framing.mode === 'raw') {
      // Self-framed, so padding corrupts it. Ledger negotiates the size per link
      // (0x08 handshake) in one byte, so it never exceeds 255.
      const maxLength = framing.maxLength ?? buffer.length;
      if (!/^(?:[0-9a-f]{2})+$/i.test(hexData) || buffer.length > maxLength) {
        throw invariantError(`Invalid BLE frame for ${entry.vendor ?? 'device'}`);
      }
      await writeChunk(buffer);
      return;
    }

    const { chunkSize } = framing;
    if (!chunkSize) throw invariantError(`Padded BLE writes need a chunkSize for ${id}`);
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      this._assertActive();
      const slice = buffer.subarray(offset, offset + chunkSize);
      // Firmware drops a short final packet (then RetriesExceeded), so every chunk
      // is zero-filled to full size, as in trezor-suite transport-bluetooth.
      const chunk = Buffer.alloc(chunkSize);
      slice.copy(chunk);
      // OneKey uses writeWithResponse for stability; mirror that.
      await writeChunk(chunk);
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
      attempt.abandon(shuttingDownError());
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
        this._advertisedUuids.clear();
        this._keptByMemory.clear();
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
    if (this._disposed) throw shuttingDownError();
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
    if (!entry) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceDisconnected,
        message: `BLE device is not connected: ${id}`,
      });
    }
    return entry;
  }

  private _requireNoble(): NobleLike {
    this._assertActive();
    if (!this._noble) throw invariantError('Desktop BLE: noble was not initialized');
    return this._noble;
  }

  /** A fresh noble reads `unknown` until its bindings report; wait for that first report. */
  private async _waitForKnownState(timeoutMs: number): Promise<void> {
    const noble = this._requireNoble();
    if (noble.state !== 'unknown') return;
    await new Promise<void>(resolve => {
      const settle = () => {
        clearTimeout(timer);
        noble.removeListener('stateChange', settle);
        this._pendingCancellations.delete(settle);
        resolve();
      };
      const timer = setTimeout(settle, timeoutMs);
      this._pendingCancellations.add(settle);
      noble.on('stateChange', settle);
    });
  }

  private async _waitForPoweredOn(timeoutMs: number): Promise<void> {
    const noble = this._requireNoble();
    if (noble.state === 'poweredOn') return;
    // A radio that is off fails now; only an unknown or resetting adapter is worth waiting for.
    if (BLE_UNUSABLE_STATES.has(noble.state)) throw bluetoothUnavailableError(noble.state);
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        noble.removeListener('stateChange', handler);
        this._pendingCancellations.delete(cancel);
      };
      const cancel = () => {
        cleanup();
        reject(shuttingDownError());
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(bluetoothUnavailableError(noble.state));
      }, timeoutMs);
      const handler = (state: string) => {
        if (state === 'poweredOn') {
          cleanup();
          resolve();
        } else if (BLE_UNUSABLE_STATES.has(state)) {
          cleanup();
          reject(bluetoothUnavailableError(state));
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
