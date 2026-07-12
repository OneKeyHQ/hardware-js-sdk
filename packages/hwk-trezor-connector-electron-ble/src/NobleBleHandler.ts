import { TREZOR_BLE_PACKET_SIZE, TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';
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

// --- Windows BLE bonding (pairing) ---
// noble's WinRT backend never proactively initiates the pairing ceremony on
// connect — unlike macOS CoreBluetooth / Linux BlueZ, which bond transparently
// when an encrypted characteristic is first touched. On Windows the bond is
// only kicked off on-demand by a write to the encrypted write characteristic,
// which is what pops the OS pairing dialog + the code on the Trezor screen.
// That write blocks until the user answers and can transiently fail while the
// bond negotiates, so on Windows we retry it until the link is confirmed.
// Mirrors OneKey's own hd-transport-electron `attemptWindowsWriteUntilPaired`.
const WINDOWS_PAIRING_MAX_ATTEMPTS = 15;
const WINDOWS_PAIRING_ATTEMPT_TIMEOUT_MS = 2_000;
// `status: 3` = the user cancelled the Windows pairing dialog (or the GATT
// write was rejected). Abort immediately instead of burning the retry budget.
const ABORTABLE_WRITE_ERROR_PATTERNS = [/status:\s*3/i];

export interface NobleBleHandlerOptions {
  /** Override for tests; defaults to `require('@stoprocent/noble')`. */
  nobleFactory?: NobleFactory;
  /** Override BLE service+char UUIDs (defaults to Trezor Safe 7). */
  uuids?: typeof TREZOR_BLE_UUIDS;
  /** Override the 244-byte chunk size. */
  chunkSize?: number;
  /** Force the Windows bonding path on/off (defaults to the host platform). */
  isWindows?: boolean;
  /** Delay between Windows bonding write retries (ms). Overridable for tests. */
  windowsPairingAttemptTimeoutMs?: number;
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

  private readonly _isWindows: boolean;

  private readonly _windowsPairingAttemptTimeoutMs: number;

  private readonly _logger?: NobleBleHandlerOptions['logger'];

  private readonly _discovered = new Map<string, NoblePeripheralLike>();

  // id -> last advertisement time (snapshot TTL).
  private readonly _lastSeen = new Map<string, number>();

  private readonly _connected = new Map<string, DeviceEntry>();

  // Windows-only: devices whose BLE bond is confirmed live. Gates the pairing
  // retry loop in `write()`; stays empty on macOS/Linux.
  private readonly _paired = new Set<string>();

  private _stateChangeHandler?: (state: string) => void;

  private _discoverHandler?: (peripheral: NoblePeripheralLike) => void;

  private _scanning = false;

  private _idleStopTimer?: ReturnType<typeof setTimeout>;

  private _onNotification?: (id: string, hexData: string) => void;

  private _onDeviceDisconnected?: (id: string) => void;

  private _initialized = false;

  constructor(options: NobleBleHandlerOptions = {}) {
    this._factory = options.nobleFactory ?? DEFAULT_NOBLE_FACTORY;
    this._uuids = options.uuids ?? TREZOR_BLE_UUIDS;
    this._chunkSize = options.chunkSize ?? TREZOR_BLE_PACKET_SIZE;
    this._isWindows = options.isWindows ?? process.platform === 'win32';
    this._windowsPairingAttemptTimeoutMs =
      options.windowsPairingAttemptTimeoutMs ?? WINDOWS_PAIRING_ATTEMPT_TIMEOUT_MS;
    this._logger = options.logger;
  }

  setNotificationListener(handler: (id: string, hexData: string) => void): void {
    this._onNotification = handler;
  }

  setDisconnectedListener(handler: (id: string) => void): void {
    this._onDeviceDisconnected = handler;
  }

  async init(): Promise<void> {
    if (this._initialized) return;
    this._noble = this._factory();
    this._discoverHandler = peripheral => {
      this._discovered.set(peripheral.id, peripheral);
      this._lastSeen.set(peripheral.id, Date.now());
    };
    this._noble.on('discover', this._discoverHandler);
    await this._waitForPoweredOn(TREZOR_BLE_POWER_ON_TIMEOUT_MS);
    this._initialized = true;
  }

  async checkAvailability(): Promise<TrezorBleAvailability> {
    if (!this._initialized) {
      try {
        this._noble = this._factory();
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

  /** Lazy-start a continuous scan and return the current snapshot immediately. */
  async scan(options?: {
    serviceUuids?: string[];
    durationMs?: number;
  }): Promise<TrezorBleDeviceInfo[]> {
    await this.init();
    const serviceUuids = options?.serviceUuids ?? [this._uuids.service];
    if (!this._scanning) {
      this._scanning = true;
      // allowDuplicates=true keeps advertisements flowing so we can age out gone devices.
      try {
        await this._requireNoble().startScanningAsync(serviceUuids, true);
      } catch (error) {
        this._scanning = false;
        this._log('warn', 'scan.start.error', { error: String(error) });
      }
    }
    this._armIdleStop();
    return this._snapshot();
  }

  /** Current in-range devices, dropping any that aged past the liveness TTL. */
  private _snapshot(): TrezorBleDeviceInfo[] {
    const now = Date.now();
    const result: TrezorBleDeviceInfo[] = [];
    for (const [id, peripheral] of this._discovered) {
      if (now - (this._lastSeen.get(id) ?? 0) > TREZOR_BLE_DEVICE_TTL_MS) {
        this._discovered.delete(id);
        this._lastSeen.delete(id);
        continue;
      }
      result.push(peripheralToInfo(peripheral));
    }
    return result;
  }

  private _armIdleStop(): void {
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
   * Abort the in-flight pairing flow: stop scanning, disconnect every
   * peripheral the host currently has open. Caller is responsible for
   * surfacing the cancellation to the upper UI layer.
   */
  async cancelPairing(): Promise<void> {
    await this.stopScan();
    for (const id of Array.from(this._connected.keys())) {
      await this.disconnect(id).catch(() => undefined);
    }
  }

  /**
   * Scan for a specific peripheral id and resolve THE MOMENT it's discovered,
   * stopping the scan immediately (don't wait out the full window). This is the
   * fast reconnect path for a stored connectId. noble can't connect by id
   * without a scan (its JS peripheral objects only exist after a `discover`
   * event), but the device advertises continuously so an early-exit scan is
   * usually sub-second. Returns undefined on timeout.
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
      noble.on('discover', onDiscover);
      void noble.startScanningAsync([this._uuids.service], false);
    });
  }

  // noble's disconnectAsync hangs on a peripheral whose connect just failed (it
  // waits for a CoreBluetooth disconnect event that never comes); bound it so a
  // cleanup disconnect can't hang the connect flow.
  private async _safeDisconnect(peripheral: NoblePeripheralLike): Promise<void> {
    await Promise.race([
      peripheral.disconnectAsync().catch(() => undefined),
      delay(BLE_DISCONNECT_TIMEOUT_MS),
    ]);
  }

  // noble has no connect timeout, so a stale bond hangs anywhere — connectAsync
  // OR the post-connect (encrypted) service discovery. One overall timeout
  // covers the whole flow. Two distinct failures reach the connector: a `timed
  // out` reject (device unreachable) vs a connectAsync `connection failed`
  // reject (link refused / stale bond) — mapped to different error codes there.
  async connect(id: string): Promise<{ id: string; name?: string }> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`connect timed out after ${BLE_CONNECT_TIMEOUT_MS}ms`)),
        BLE_CONNECT_TIMEOUT_MS
      );
    });
    try {
      return await Promise.race([this._connectInner(id), timeout]);
    } catch (error) {
      const peripheral = this._discovered.get(id);
      if (peripheral) await this._safeDisconnect(peripheral);
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async _connectInner(id: string): Promise<{ id: string; name?: string }> {
    await this.init();
    // Stop scanning (keep the cache) and let the radio settle before connecting.
    await this._pauseScan();
    await delay(BLE_CONNECT_SETTLE_MS);
    let peripheral = this._discovered.get(id);
    if (!peripheral) {
      peripheral = await this._scanUntilFound(id, TREZOR_BLE_SCAN_DURATION_MS);
    }
    if (!peripheral) throw new Error(`Trezor BLE device not found: ${id}`);

    const wasConnected = peripheral.state === 'connected';
    if (!wasConnected) {
      try {
        await peripheral.connectAsync();
      } catch (error) {
        // DIAGNOSTIC: isolates a GATT connect failure from a later discovery/
        // write failure when tracing the Windows pairing flow.
        this._log('warn', 'win.pairing.connectError', {
          id,
          isWindows: this._isWindows,
          phase: 'connectAsync',
          error: String(error),
        });
        throw error;
      }
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

      const disconnectHandler = () => {
        this._cleanupDevice(id, /* unexpected */ true);
      };
      peripheral.on('disconnect', disconnectHandler);

      this._connected.set(id, { peripheral, writeChar, notifyChar, disconnectHandler });
      this._log('info', 'connect.done', { id, name: peripheral.advertisement.localName });
      return { id, name: peripheral.advertisement.localName };
    } catch (error) {
      // DIAGNOSTIC: discovery ran over the (encrypted) link — a failure here on
      // Windows points at a missing bond rather than a plain connect problem.
      this._log('warn', 'win.pairing.connectError', {
        id,
        isWindows: this._isWindows,
        phase: 'discover',
        error: String(error),
      });
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
      // First inbound notification proves the BLE bond is live (Windows).
      this._markPaired(id, 'notification');
      this._onNotification?.(id, data.toString('hex'));
    };
    entry.notifyHandler = handler;
    entry.notifyChar.on('data', handler);
    try {
      await entry.notifyChar.subscribeAsync();
    } catch (error) {
      // DIAGNOSTIC: on Windows an unpaired device can reject the notify CCCD
      // write until the bond exists — if this fires, the connect flow tears
      // down before any write triggers pairing (a distinct failure mode).
      this._log('warn', 'win.pairing.subscribeError', {
        id,
        isWindows: this._isWindows,
        error: String(error),
      });
      throw error;
    }
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
      const slice = buffer.subarray(offset, offset + this._chunkSize);
      // Trezor BLE firmware expects FIXED-size packets: every packet must be
      // padded to the full MTU (244) with zeros. A short final packet is
      // silently dropped by the device → no response → RetriesExceeded.
      // Matches trezor-suite transport-bluetooth (`Buffer.alloc(chunkSize)`).
      const chunk = Buffer.alloc(this._chunkSize);
      slice.copy(chunk);
      await this._writeChunk(id, chunk);
      if (offset + this._chunkSize < buffer.length) {
        await delay(TREZOR_BLE_WRITE_CHUNK_DELAY_MS);
      }
    }
  }

  private _markPaired(id: string, via: 'writeAck' | 'notification'): void {
    if (!this._isWindows || this._paired.has(id)) return;
    this._paired.add(id);
    // DIAGNOSTIC (win.pairing.*): warn level so it always surfaces on the
    // Windows test regardless of debug config. Remove once pairing is verified.
    this._log('warn', 'win.pairing.confirmed', { id, via });
  }

  /**
   * Write one padded packet. macOS/Linux (and Windows once bonded) write
   * directly; a first-time Windows write drives the bonding retry loop below.
   */
  private async _writeChunk(id: string, chunk: Buffer): Promise<void> {
    const entry = this._requireEntry(id);
    if (!entry.writeChar) throw new Error(`Trezor BLE write char missing for ${id}`);
    if (!this._isWindows || this._paired.has(id)) {
      // OneKey uses writeWithResponse for stability; mirror that.
      await entry.writeChar.writeAsync(chunk, false);
      return;
    }
    await this._writeChunkUntilPaired(id, chunk);
  }

  /**
   * Windows first-write path: retry the write until the OS bond is established.
   * A write-with-response that completes proves the bond is up (the link-layer
   * ACK can't arrive over an unbonded link), so the first successful write ends
   * the loop. A `status: 3` reject means the user cancelled pairing — abort.
   */
  private async _writeChunkUntilPaired(id: string, chunk: Buffer): Promise<void> {
    // DIAGNOSTIC: marks the moment the Windows bonding attempt begins — this is
    // the write that should pop the OS pairing dialog + the code on the device.
    this._log('warn', 'win.pairing.begin', { id, byteLength: chunk.length });
    for (let attempt = 1; attempt <= WINDOWS_PAIRING_MAX_ATTEMPTS; attempt += 1) {
      if (!this._connected.has(id)) {
        throw new Error(`Trezor BLE device disconnected during pairing: ${id}`);
      }
      const writeChar = this._connected.get(id)?.writeChar;
      if (!writeChar) throw new Error(`Trezor BLE write char missing for ${id}`);
      try {
        await writeChar.writeAsync(chunk, false);
        this._markPaired(id, 'writeAck');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // DIAGNOSTIC: the reject message carries the WinRT GATT status (e.g.
        // `status: 3` = user cancelled) — the key signal if no dialog appears.
        this._log('warn', 'win.pairing.retry', { id, attempt, error: message });
        if (ABORTABLE_WRITE_ERROR_PATTERNS.some(p => p.test(message))) {
          throw error;
        }
      }
      // A notification may have confirmed the bond while the write was failing.
      if (this._paired.has(id)) return;
      await delay(this._windowsPairingAttemptTimeoutMs);
      if (this._paired.has(id)) return;
      // Re-arm the notify subscription so packets flow once the bond lands.
      await this._softRefreshSubscription(id);
    }
    this._log('warn', 'win.pairing.exhausted', { id, attempts: WINDOWS_PAIRING_MAX_ATTEMPTS });
    throw new Error(
      `Trezor BLE pairing not completed after ${WINDOWS_PAIRING_MAX_ATTEMPTS} writes: ${id}`
    );
  }

  /**
   * Unsubscribe + resubscribe the notify characteristic without dropping the
   * JS `data` listener — nudges noble to redeliver notifications once the
   * Windows bond completes. No-op until `subscribe()` has run.
   */
  private async _softRefreshSubscription(id: string): Promise<void> {
    const entry = this._connected.get(id);
    if (!entry?.notifyChar || !entry.notifyHandler) return;
    try {
      await entry.notifyChar.unsubscribeAsync();
      await entry.notifyChar.subscribeAsync();
    } catch (error) {
      this._log('warn', 'subscribe.refresh.error', { id, error: String(error) });
    }
  }

  /** Tear down all active connections — called on app quit. */
  async dispose(): Promise<void> {
    this._clearIdleStop();
    this._scanning = false;
    for (const id of Array.from(this._connected.keys())) {
      await this.disconnect(id);
    }
    if (this._noble && this._discoverHandler) {
      this._noble.removeListener('discover', this._discoverHandler);
    }
    if (this._noble && this._stateChangeHandler) {
      this._noble.removeListener('stateChange', this._stateChangeHandler);
    }
    this._discovered.clear();
    this._lastSeen.clear();
    this._paired.clear();
    this._initialized = false;
  }

  private _cleanupDevice(id: string, unexpected: boolean): void {
    const entry = this._connected.get(id);
    if (!entry) return;
    if (entry.notifyChar && entry.notifyHandler) {
      entry.notifyChar.removeListener('data', entry.notifyHandler);
    }
    this._connected.delete(id);
    this._paired.delete(id);
    if (unexpected) {
      this._log('warn', 'disconnect.unexpected', { id });
      this._onDeviceDisconnected?.(id);
    }
  }

  private _requireEntry(id: string): DeviceEntry {
    const entry = this._connected.get(id);
    if (!entry) throw new Error(`Trezor BLE device is not connected: ${id}`);
    return entry;
  }

  private _requireNoble(): NobleLike {
    if (!this._noble) throw new Error('Trezor BLE: noble was not initialized');
    return this._noble;
  }

  private async _waitForPoweredOn(timeoutMs: number): Promise<void> {
    const noble = this._requireNoble();
    if (noble.state === 'poweredOn') return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this._stateChangeHandler) noble.removeListener('stateChange', this._stateChangeHandler);
        reject(
          new Error(
            `Trezor BLE: noble did not reach poweredOn within ${timeoutMs}ms (last state: ${noble.state})`
          )
        );
      }, timeoutMs);

      const handler = (state: string) => {
        if (state === 'poweredOn') {
          clearTimeout(timer);
          resolve();
        } else if (state === 'unsupported' || state === 'unauthorized') {
          clearTimeout(timer);
          if (this._stateChangeHandler)
            noble.removeListener('stateChange', this._stateChangeHandler);
          reject(new Error(`Trezor BLE: noble state ${state}`));
        }
      };
      this._stateChangeHandler = handler;
      noble.on('stateChange', handler);
    });
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-electron-ble', event, data });
    if (!entry) return;

    this._logger?.(entry);
  }
}
