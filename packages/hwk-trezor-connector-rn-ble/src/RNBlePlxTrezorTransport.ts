import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import {
  TREZOR_BLE_UUIDS,
  isTrezorBleServiceUuid,
  resolveTrezorBleConnectId,
} from '@onekeyfe/hwk-trezor-adapter';
import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import { base64ToBytes, bytesToBase64 } from './base64';

import type {
  TrezorBleDescriptor,
  TrezorBleTransport,
  TrezorConnectedDevice,
} from '@onekeyfe/hwk-trezor-adapter';

const disconnectError = (message: string): Error =>
  createHwkError({ code: HardwareErrorCode.DeviceDisconnected, message });

const transportError = (message: string): Error =>
  createHwkError({ code: HardwareErrorCode.TransportError, message });

type BlePlxDevice = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
  manufacturerData?: string | null;
  rssi?: number | null;
  mtu?: number;
  isConnected?(): Promise<boolean>;
  connect(): Promise<BlePlxDevice>;
  connect(options?: Record<string, unknown>): Promise<BlePlxDevice>;
  cancelConnection(): Promise<BlePlxDevice>;
  discoverAllServicesAndCharacteristics(): Promise<BlePlxDevice | void>;
  characteristicsForService?(serviceUUID: string): Promise<BlePlxCharacteristic[]>;
  requestMTU?(mtu: number): Promise<BlePlxDevice>;
};

type BlePlxCharacteristic = {
  uuid?: string;
  deviceID?: string;
  value?: string | null;
  writeWithResponse?(valueBase64: string): Promise<unknown>;
  writeWithoutResponse?(valueBase64: string): Promise<unknown>;
  monitor?(
    listener: (error: unknown, characteristic: BlePlxCharacteristic | null) => void
  ): BlePlxSubscription;
};

type BlePlxSubscription = {
  remove(): void;
};

type BlePlxManager = {
  startDeviceScan(
    serviceUUIDs: string[] | null,
    options: Record<string, unknown> | null,
    listener: (error: unknown, scannedDevice: BlePlxDevice | null) => void
  ): void;
  stopDeviceScan(): void;
  devices?(deviceIdentifiers: string[]): Promise<BlePlxDevice[]>;
  connectedDevices?(serviceUUIDs: string[]): Promise<BlePlxDevice[]>;
  connectToDevice(id: string, options?: Record<string, unknown>): Promise<BlePlxDevice>;
  cancelDeviceConnection(id: string): Promise<BlePlxDevice>;
  writeCharacteristicWithResponseForDevice(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
    transactionId?: string
  ): Promise<unknown>;
  writeCharacteristicWithoutResponseForDevice?(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
    transactionId?: string
  ): Promise<unknown>;
  monitorCharacteristicForDevice(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: unknown, characteristic: BlePlxCharacteristic | null) => void,
    transactionId?: string
  ): BlePlxSubscription;
  onDeviceDisconnected?(
    deviceId: string,
    listener: (error: unknown, device: BlePlxDevice | null) => void
  ): BlePlxSubscription;
  cancelTransaction?(transactionId: string): Promise<void>;
  setLogLevel?(logLevel: string): Promise<string | void>;
  logLevel?(): Promise<string>;
  onStateChange?(listener: (state: string) => void, emitCurrentState?: boolean): BlePlxSubscription;
  destroy(): void;
};

type BleManagerConstructor = new () => BlePlxManager;

type ConnectedDeviceRecord = {
  device: BlePlxDevice;
  writeCharacteristic?: BlePlxCharacteristic;
  notifyCharacteristic?: BlePlxCharacteristic;
};

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;
const DEFAULT_EXCHANGE_TIMEOUT_MS = 10_000;
const RECONNECT_BACKOFF_MS = 300;
const TREZOR_BLE_PACKET_SIZE = 244;
const PAIRING_PROBE = asciiToBytes('Proof of connection');
// Snapshot-scan model (mirrors the Electron noble handler): drop a device from
// the snapshot once it hasn't re-advertised within the TTL, and stop the
// continuous scan after this idle window with no `scan()` poll.
const TREZOR_BLE_DEVICE_TTL_MS = 5_000;
const TREZOR_BLE_SCAN_IDLE_STOP_MS = 10_000;
const BLE_POWERED_ON_TIMEOUT_MS = 1_000;

// Wait for the BLE manager to reach `PoweredOn` before scanning/connecting. iOS
// creates a BleManager in `Unknown` state and settles to `PoweredOn`
// asynchronously; scanning during `Unknown` throws errorCode 103 ("BluetoothLE
// is in unknown state"). Mirrors OneKey's hd-transport-react-native
// `subscribeBleOn`. No-op when already PoweredOn or when the manager (e.g. a
// test mock) has no onStateChange.
function waitForPoweredOn(manager: BlePlxManager, ms = BLE_POWERED_ON_TIMEOUT_MS): Promise<void> {
  if (!manager.onStateChange) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const disposers: Array<() => void> = [];
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      disposers.forEach(d => d());
      fn();
    };
    const subscription = manager.onStateChange!(state => {
      if (state === 'PoweredOn') finish(resolve);
    }, true);
    disposers.push(() => subscription.remove());
    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            createHwkError({
              code: HardwareErrorCode.DevicePermissionDenied,
              message: 'BluetoothLE did not reach PoweredOn state',
            })
          )
        ),
      ms
    );
    disposers.push(() => clearTimeout(timer));
    (timer as { unref?: () => void }).unref?.();
  });
}

export interface RNBlePlxTrezorTransportOptions {
  manager?: BlePlxManager;
  connectTimeoutMs?: number;
  logger?: TrezorDebugLogger;
}

export class RNBlePlxTrezorTransport implements TrezorBleTransport {
  private readonly _manager: BlePlxManager;

  private readonly _connectTimeoutMs: number;

  private readonly _logger?: NonNullable<RNBlePlxTrezorTransportOptions['logger']>;

  // Continuous-scan snapshot state (mirrors the Electron noble handler).
  private readonly _discovered = new Map<string, TrezorBleDescriptor>();

  private readonly _lastSeen = new Map<string, number>();

  private _scanning = false;

  private _idleStopTimer?: ReturnType<typeof setTimeout>;

  private readonly _connectedDevices = new Map<string, ConnectedDeviceRecord>();

  private readonly _notifySubscriptions = new Map<string, BlePlxSubscription>();

  private readonly _disconnectSubscriptions = new Map<string, BlePlxSubscription>();

  private readonly _closingDevices = new Set<string>();

  private readonly _disconnectHandlers = new Map<string, Set<() => void>>();

  private readonly _pendingNotifications = new Map<string, Uint8Array[]>();

  private readonly _pendingReaders = new Map<
    string,
    Array<{
      resolve: (data: Uint8Array) => void;
      reject: (error: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }>
  >();

  constructor(options: RNBlePlxTrezorTransportOptions & { manager: BlePlxManager }) {
    this._manager = options.manager;
    this._connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    this._logger = options.logger;
  }

  static async create(options?: RNBlePlxTrezorTransportOptions): Promise<RNBlePlxTrezorTransport> {
    if (options?.manager) {
      return new RNBlePlxTrezorTransport({ ...options, manager: options.manager });
    }

    const { BleManager } = (await import('react-native-ble-plx')) as {
      BleManager: BleManagerConstructor;
    };
    return new RNBlePlxTrezorTransport({ ...options, manager: new BleManager() });
  }

  // Lazily start one persistent scan and return the current snapshot
  // immediately (mirrors the Electron noble handler); each poll re-arms the
  // idle-stop. The app's poll loop is shared with Electron and assumes this
  // incremental-snapshot model rather than a blocking one-shot.
  async scan(): Promise<TrezorBleDescriptor[]> {
    await this._startContinuousScan();
    this._armIdleStop();
    return this._snapshot();
  }

  private async _startContinuousScan(): Promise<void> {
    if (this._scanning) return;
    this._scanning = true;
    try {
      // Wait for PoweredOn first: a fresh/reset iOS manager is in `Unknown`
      // state and startDeviceScan would immediately error with code 103.
      await waitForPoweredOn(this._manager);
      // No OS-level UUID filter (ble-plx's Android filter misses Trezor's
      // 128-bit service UUID); scan all and match the UUID in JS.
      // allowDuplicates=true keeps advertisements flowing so gone devices age out.
      this._manager.startDeviceScan(null, { allowDuplicates: true }, (error, scannedDevice) => {
        if (error) {
          this._scanning = false;
          this._manager.stopDeviceScan();
          this._log('error', 'ble.scan.error', { error: errorToLog(error) });
          return;
        }
        if (!scannedDevice || !advertisesTrezorService(scannedDevice)) return;
        const descriptor = this._deviceToDescriptor(scannedDevice);
        const connectId = resolveTrezorBleConnectId(descriptor);
        if (connectId) {
          this._discovered.set(connectId, descriptor);
          this._lastSeen.set(connectId, Date.now());
        }
      });
    } catch (error) {
      this._scanning = false;
      this._log('warn', 'ble.scan.start.error', { error: errorToLog(error) });
    }
  }

  /** Current in-range devices, dropping any that aged past the liveness TTL. */
  private _snapshot(): TrezorBleDescriptor[] {
    const now = Date.now();
    const result: TrezorBleDescriptor[] = [];
    for (const [connectId, descriptor] of this._discovered) {
      if (now - (this._lastSeen.get(connectId) ?? 0) > TREZOR_BLE_DEVICE_TTL_MS) {
        this._discovered.delete(connectId);
        this._lastSeen.delete(connectId);
        continue;
      }
      result.push(descriptor);
    }
    return result;
  }

  private _armIdleStop(): void {
    this._clearIdleStop();
    this._idleStopTimer = setTimeout(() => {
      this._stopContinuousScan();
    }, TREZOR_BLE_SCAN_IDLE_STOP_MS);
    // Don't let the idle timer keep a Node test process alive; no-op on RN.
    (this._idleStopTimer as { unref?: () => void }).unref?.();
  }

  private _clearIdleStop(): void {
    if (this._idleStopTimer) {
      clearTimeout(this._idleStopTimer);
      this._idleStopTimer = undefined;
    }
  }

  /** Stop scanning but keep the discovered cache (used before connect). */
  private _pauseScan(): void {
    this._clearIdleStop();
    if (!this._scanning) return;
    this._scanning = false;
    this._manager.stopDeviceScan();
  }

  /** Stop scanning and forget discovered devices (idle timeout / teardown). */
  private _stopContinuousScan(): void {
    this._pauseScan();
    this._discovered.clear();
    this._lastSeen.clear();
  }

  async connect(connectId: string): Promise<TrezorConnectedDevice> {
    this._log('info', 'ble.connect.start', { connectId, timeoutMs: this._connectTimeoutMs });
    let ready: BlePlxDevice;
    try {
      // Pause the scan before connecting (keep the cache); avoids racing it.
      this._pauseScan();
      // A reset/recreated iOS manager may still be `Unknown` here; wait so we
      // don't connect on an unpowered stack.
      await waitForPoweredOn(this._manager);
      await resolveAfter(300);
      const connected = await this._connectWithMtu(connectId);
      this._log('info', 'ble.connect.connected', {
        connectId,
        mtu: connected.mtu,
        name: connected.name ?? connected.localName,
      });
      const discovered = await this._discoverAndTestCharacteristics(connectId, connected);
      ready = discovered.device;
      this._log('info', 'ble.connect.pairingProbe.done', { connectId });
      this._connectedDevices.set(connectId, discovered);
      this._startNotifications(connectId, discovered.notifyCharacteristic);
      this._startDisconnectWatcher(connectId);
    } catch (error) {
      const normalizedError = normalizeConnectError(connectId, error);
      this._log('error', 'ble.connect.error', {
        connectId,
        error: errorToLog(normalizedError),
        originalError: errorToLog(error),
      });
      throw normalizedError;
    }

    return {
      ...this._deviceToDescriptor(ready),
      id: connectId,
    };
  }

  async disconnect(connectId: string): Promise<void> {
    this._log('info', 'ble.disconnect.start', { connectId });
    this._closingDevices.add(connectId);
    this._notifySubscriptions.get(connectId)?.remove();
    this._notifySubscriptions.delete(connectId);
    this._disconnectSubscriptions.get(connectId)?.remove();
    this._disconnectSubscriptions.delete(connectId);
    this._rejectReaders(connectId, disconnectError(`Trezor BLE device disconnected: ${connectId}`));
    this._pendingNotifications.delete(connectId);
    const record = this._connectedDevices.get(connectId);
    try {
      if (record?.device.cancelConnection) {
        await record.device.cancelConnection();
      } else {
        await this._manager.cancelDeviceConnection(connectId);
      }
    } catch (error) {
      this._log('warn', 'ble.disconnect.cancelConnection.error', {
        connectId,
        error: errorToLog(error),
      });
      throw error;
    } finally {
      // Always drop tracking state even if cancelConnection threw, so a failed
      // disconnect can't leave the device stuck "connected"/"closing" forever.
      this._connectedDevices.delete(connectId);
      this._closingDevices.delete(connectId);
    }
    this._log('info', 'ble.disconnect.done', { connectId });
  }

  async write(connectId: string, data: Uint8Array): Promise<void> {
    this._ensureConnected(connectId);
    for (let offset = 0; offset < data.length; offset += TREZOR_BLE_PACKET_SIZE) {
      const chunk = new Uint8Array(TREZOR_BLE_PACKET_SIZE);
      chunk.set(data.slice(offset, offset + TREZOR_BLE_PACKET_SIZE));
      await this._writeChunk(connectId, chunk, 'write', false);
    }
  }

  async read(connectId: string, timeoutMs = DEFAULT_EXCHANGE_TIMEOUT_MS): Promise<Uint8Array> {
    this._ensureConnected(connectId);
    const queued = this._pendingNotifications.get(connectId);
    const first = queued?.shift();
    if (first) {
      return first;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const readers = this._pendingReaders.get(connectId) ?? [];
        // Identify this reader by its unique timer handle. The old check
        // (`reader.resolve !== resolve`) never matched — `reader.resolve` is a
        // wrapper closure, not the raw promise `resolve` — so the timed-out
        // reader stayed in the queue and swallowed the next notification frame,
        // desyncing the session after a slow on-device confirm.
        this._pendingReaders.set(
          connectId,
          readers.filter(reader => reader.timeout !== timeout)
        );
        const error = disconnectError(`Trezor BLE notify timeout after ${timeoutMs}ms`);
        this._log('error', 'ble.read.timeout', { connectId, timeoutMs });
        reject(error);
      }, timeoutMs);

      const readers = this._pendingReaders.get(connectId) ?? [];
      readers.push({
        resolve: data => {
          resolve(data);
        },
        reject: error => {
          this._log('error', 'ble.read.reject', { connectId, error: errorToLog(error) });
          reject(error);
        },
        timeout,
      });
      this._pendingReaders.set(connectId, readers);
    });
  }

  async exchange(
    connectId: string,
    data: Uint8Array,
    timeoutMs = DEFAULT_EXCHANGE_TIMEOUT_MS
  ): Promise<Uint8Array> {
    const responsePromise = this.read(connectId, timeoutMs);
    await this.write(connectId, data);
    return responsePromise;
  }

  onDisconnect(connectId: string, handler: () => void): () => void {
    const handlers = this._disconnectHandlers.get(connectId) ?? new Set<() => void>();
    handlers.add(handler);
    this._disconnectHandlers.set(connectId, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._disconnectHandlers.delete(connectId);
      }
    };
  }

  reset(): void {
    this._log('info', 'ble.reset.start');
    this._notifySubscriptions.forEach(subscription => subscription.remove());
    this._notifySubscriptions.clear();
    this._disconnectSubscriptions.forEach(subscription => subscription.remove());
    this._disconnectSubscriptions.clear();
    this._disconnectHandlers.clear();
    this._pendingNotifications.clear();
    this._pendingReaders.forEach(readers => {
      readers.forEach(reader => {
        clearTimeout(reader.timeout);
        reader.reject(disconnectError('Trezor BLE transport reset'));
      });
    });
    this._pendingReaders.clear();
    this._connectedDevices.clear();
    this._clearIdleStop();
    this._scanning = false;
    this._discovered.clear();
    this._lastSeen.clear();
    this._manager.stopDeviceScan();
    this._manager.destroy();
    this._log('info', 'ble.reset.done');
  }

  private _deviceToDescriptor(device: BlePlxDevice): TrezorBleDescriptor {
    const name = device.localName ?? device.name ?? undefined;
    return {
      id: device.id,
      path: device.id,
      ...(name ? { name } : undefined),
      serviceUUIDs: device.serviceUUIDs,
    };
  }

  private _ensureConnected(connectId: string): void {
    if (!this._connectedDevices.has(connectId)) {
      throw disconnectError(`Trezor BLE device is not connected: ${connectId}`);
    }
  }

  private async _connectWithMtu(connectId: string): Promise<BlePlxDevice> {
    // Request MTU 247 so 244-byte Trezor protocol frames fit (Android default
    // ATT MTU is 23). Matches Trezor Suite; on DeviceMTUChangeFailed we retry
    // without it below.
    const connectionOptions = {
      requestMTU: 247,
      timeout: this._connectTimeoutMs,
    };
    this._log('debug', 'ble.connect.flow.start', {
      connectId,
      connectionOptions,
      managerCapabilities: managerCapabilities(this._manager),
    });
    this._log('debug', 'ble.connect.devicesLookup.start', { connectId });
    const knownDevices = await this._manager.devices?.([connectId]).catch(error => {
      this._log('warn', 'ble.connect.devicesLookup.error', { connectId, error: errorToLog(error) });
      return [];
    });
    this._log('debug', 'ble.connect.devicesLookup.done', {
      connectId,
      count: knownDevices?.length ?? 0,
      devices: knownDevices?.map(device => deviceToLog(device)),
    });
    let device = knownDevices?.[0];

    if (!device) {
      this._log('debug', 'ble.connect.connectedDevicesLookup.start', {
        connectId,
        serviceUUID: TREZOR_BLE_UUIDS.service,
      });
      const connectedDevices = await this._manager
        .connectedDevices?.([TREZOR_BLE_UUIDS.service])
        .catch(error => {
          this._log('warn', 'ble.connect.connectedDevicesLookup.error', {
            connectId,
            error: errorToLog(error),
          });
          return [];
        });
      const matchingConnectedDevices =
        connectedDevices?.filter(candidate => candidate.id === connectId) ?? [];
      this._log('debug', 'ble.connect.connectedDevicesLookup.done', {
        connectId,
        count: matchingConnectedDevices.length,
        devices: matchingConnectedDevices.map(candidate => deviceToLog(candidate)),
      });
      [device] = matchingConnectedDevices;
    }

    if (!device) {
      const startedAt = Date.now();
      this._log('info', 'ble.connect.manager.start', { connectId, connectionOptions });
      try {
        device = await this._manager.connectToDevice(connectId, connectionOptions);
        this._log('info', 'ble.connect.manager.done', {
          connectId,
          elapsedMs: Date.now() - startedAt,
          device: deviceToLog(device),
        });
      } catch (error) {
        this._log('error', 'ble.connect.manager.error', {
          connectId,
          elapsedMs: Date.now() - startedAt,
          error: errorToLog(error),
        });
        if (isMtuChangeFailure(error)) {
          this._log('warn', 'ble.connect.manager.mtuFallback', {
            connectId,
            error: errorToLog(error),
          });
          await this._cleanupBeforeReconnect(connectId, 'manager.mtuFallback');
          const fallbackStartedAt = Date.now();
          device = await this._manager.connectToDevice(connectId);
          this._log('info', 'ble.connect.manager.mtuFallback.done', {
            connectId,
            elapsedMs: Date.now() - fallbackStartedAt,
            device: deviceToLog(device),
          });
        } else {
          throw error;
        }
      }
    }

    const isConnected = await device.isConnected?.().catch(error => {
      this._log('warn', 'ble.connect.isConnected.error', { connectId, error: errorToLog(error) });
      return false;
    });
    this._log('debug', 'ble.connect.deviceResolved', {
      connectId,
      isConnected: Boolean(isConnected),
      device: deviceToLog(device),
    });
    if (isConnected) {
      this._log('info', 'ble.connect.deviceConnect.skipAlreadyConnected', { connectId });
      return device;
    }

    const startedAt = Date.now();
    try {
      this._log('info', 'ble.connect.deviceConnect.start', {
        connectId,
        requestMTU: connectionOptions.requestMTU,
        timeout: connectionOptions.timeout,
      });
      await device.connect(connectionOptions);
      const connectedAfter = await device.isConnected?.().catch(error => {
        this._log('warn', 'ble.connect.deviceConnect.isConnectedAfter.error', {
          connectId,
          error: errorToLog(error),
        });
        return undefined;
      });
      this._log('info', 'ble.connect.deviceConnect.done', {
        connectId,
        elapsedMs: Date.now() - startedAt,
        isConnectedAfter: connectedAfter,
      });
      return device;
    } catch (error) {
      this._log('error', 'ble.connect.deviceConnect.errorBeforeFallback', {
        connectId,
        elapsedMs: Date.now() - startedAt,
        error: errorToLog(error),
        device: deviceToLog(device),
      });
      if (isMtuChangeFailure(error)) {
        this._log('warn', 'ble.connect.deviceConnect.mtuFallback', {
          connectId,
          error: errorToLog(error),
        });
        await this._cleanupBeforeReconnect(connectId, 'deviceConnect.mtuFallback');
        const fallbackStartedAt = Date.now();
        device = await this._manager.connectToDevice(connectId);
        this._log('info', 'ble.connect.deviceConnect.mtuFallback.done', {
          connectId,
          elapsedMs: Date.now() - fallbackStartedAt,
          device: deviceToLog(device),
        });
        return device;
      }
      if (isOperationCancelled(error)) {
        this._log('warn', 'ble.connect.deviceConnect.cancelledNoMtuFallback.start', {
          connectId,
          error: errorToLog(error),
        });
        await this._cleanupBeforeReconnect(connectId, 'deviceConnect.cancelledNoMtuFallback');
        const fallbackStartedAt = Date.now();
        try {
          device = await this._manager.connectToDevice(connectId);
        } catch (fallbackError) {
          this._log('error', 'ble.connect.deviceConnect.cancelledNoMtuFallback.error', {
            connectId,
            elapsedMs: Date.now() - fallbackStartedAt,
            error: errorToLog(fallbackError),
          });
          throw fallbackError;
        }
        const connectedAfter = await device.isConnected?.().catch(isConnectedError => {
          this._log(
            'warn',
            'ble.connect.deviceConnect.cancelledNoMtuFallback.isConnectedAfter.error',
            {
              connectId,
              error: errorToLog(isConnectedError),
            }
          );
          return undefined;
        });
        this._log('info', 'ble.connect.deviceConnect.cancelledNoMtuFallback.done', {
          connectId,
          elapsedMs: Date.now() - fallbackStartedAt,
          isConnectedAfter: connectedAfter,
        });
        return device;
      }
      throw error;
    }
  }

  private async _cleanupBeforeReconnect(connectId: string, reason: string): Promise<void> {
    this._log('info', 'ble.connect.cleanupBeforeReconnect.start', {
      connectId,
      reason,
      backoffMs: RECONNECT_BACKOFF_MS,
    });
    try {
      await this._manager.cancelDeviceConnection(connectId);
      this._log('info', 'ble.connect.cleanupBeforeReconnect.cancel.done', {
        connectId,
        reason,
      });
    } catch (error) {
      this._log('warn', 'ble.connect.cleanupBeforeReconnect.cancel.error', {
        connectId,
        reason,
        error: errorToLog(error),
      });
    }
    await resolveAfter(RECONNECT_BACKOFF_MS);
    this._log('info', 'ble.connect.cleanupBeforeReconnect.done', {
      connectId,
      reason,
    });
  }

  private async _discoverAndTestCharacteristics(
    connectId: string,
    device: BlePlxDevice
  ): Promise<ConnectedDeviceRecord> {
    const discoveredDevice = (await device.discoverAllServicesAndCharacteristics()) ?? device;
    this._log('info', 'ble.connect.servicesDiscovered', { connectId });

    const trezorCharacteristics = await this._getCharacteristics(
      discoveredDevice,
      TREZOR_BLE_UUIDS.service
    );
    this._log('info', 'ble.connect.characteristics.trezor', {
      connectId,
      count: trezorCharacteristics.length,
    });

    const writeCharacteristic = trezorCharacteristics.find(
      characteristic => characteristic.uuid?.toLowerCase() === TREZOR_BLE_UUIDS.write
    );
    const notifyCharacteristic = trezorCharacteristics.find(
      characteristic => characteristic.uuid?.toLowerCase() === TREZOR_BLE_UUIDS.notify
    );
    const pushCharacteristic = trezorCharacteristics.find(
      characteristic => characteristic.uuid?.toLowerCase() === TREZOR_BLE_UUIDS.push
    );

    if (!writeCharacteristic) {
      throw transportError('Trezor BLE write characteristic not found.');
    }
    if (!notifyCharacteristic) {
      throw transportError('Trezor BLE notify characteristic not found.');
    }

    await this._pairingProbe(connectId, writeCharacteristic);
    if (pushCharacteristic) {
      this._startCharacteristicMonitor(connectId, pushCharacteristic, 'push');
    } else {
      this._log('warn', 'ble.connect.characteristics.pushMissing', { connectId });
    }

    return {
      device: discoveredDevice,
      writeCharacteristic,
      notifyCharacteristic,
    };
  }

  private async _getCharacteristics(
    device: BlePlxDevice,
    serviceUUID: string
  ): Promise<BlePlxCharacteristic[]> {
    if (!device.characteristicsForService) {
      return [];
    }
    return device.characteristicsForService(serviceUUID);
  }

  private async _pairingProbe(
    connectId: string,
    writeCharacteristic?: BlePlxCharacteristic
  ): Promise<void> {
    await this._writeChunk(connectId, PAIRING_PROBE, 'pairing', true, writeCharacteristic);
  }

  private async _writeChunk(
    connectId: string,
    data: Uint8Array,
    transactionType: string,
    withResponse: boolean,
    writeCharacteristic = this._connectedDevices.get(connectId)?.writeCharacteristic
  ): Promise<void> {
    const base64 = bytesToBase64(data);
    const transactionId = this._transactionId(connectId, transactionType);
    if (withResponse && writeCharacteristic?.writeWithResponse) {
      await writeCharacteristic.writeWithResponse(base64);
      return;
    }
    if (!withResponse && writeCharacteristic?.writeWithoutResponse) {
      await writeCharacteristic.writeWithoutResponse(base64);
      return;
    }
    if (!withResponse && this._manager.writeCharacteristicWithoutResponseForDevice) {
      await this._manager.writeCharacteristicWithoutResponseForDevice(
        connectId,
        TREZOR_BLE_UUIDS.service,
        TREZOR_BLE_UUIDS.write,
        base64,
        transactionId
      );
      return;
    }
    await this._manager.writeCharacteristicWithResponseForDevice(
      connectId,
      TREZOR_BLE_UUIDS.service,
      TREZOR_BLE_UUIDS.write,
      base64,
      transactionId
    );
  }

  private _startNotifications(
    connectId: string,
    notifyCharacteristic?: BlePlxCharacteristic
  ): void {
    // connect() re-discovers characteristics each call, so replace any existing
    // subscription (early-returning would leave it bound to a stale handle).
    this._notifySubscriptions.get(connectId)?.remove();
    this._notifySubscriptions.delete(connectId);
    const transactionId = this._transactionId(connectId, 'notify');
    if (notifyCharacteristic?.monitor) {
      const subscription = this._startCharacteristicMonitor(
        connectId,
        notifyCharacteristic,
        'notify'
      );
      this._notifySubscriptions.set(connectId, subscription);
      return;
    }
    const subscription = this._manager.monitorCharacteristicForDevice(
      connectId,
      TREZOR_BLE_UUIDS.service,
      TREZOR_BLE_UUIDS.notify,
      (error, characteristic) => {
        if (error) {
          this._log('error', 'ble.notify.error', { connectId, error: errorToLog(error) });
          this._rejectReaders(connectId, error);
          return;
        }
        if (characteristic?.value) {
          const data = base64ToBytes(characteristic.value);
          this._pushNotification(connectId, data);
        }
      },
      transactionId
    );
    this._notifySubscriptions.set(connectId, subscription);
  }

  private _startCharacteristicMonitor(
    connectId: string,
    characteristic: BlePlxCharacteristic,
    name: 'notify' | 'push'
  ): BlePlxSubscription {
    const subscription = characteristic.monitor?.((error, monitoredCharacteristic) => {
      if (error) {
        const level =
          this._closingDevices.has(connectId) ||
          isOperationCancelled(error) ||
          isDeviceDisconnected(error)
            ? 'debug'
            : 'error';
        this._log(level, `ble.${name}.error`, { connectId, error: errorToLog(error) });
        if (name === 'notify') {
          this._rejectReaders(connectId, error);
        }
        return;
      }
      if (monitoredCharacteristic?.value) {
        const data = base64ToBytes(monitoredCharacteristic.value);
        if (name === 'notify') {
          this._pushNotification(connectId, data);
        }
      }
    });

    if (!subscription) {
      throw transportError(`Trezor BLE ${name} characteristic does not support monitor.`);
    }
    return subscription;
  }

  private _startDisconnectWatcher(connectId: string): void {
    if (this._disconnectSubscriptions.has(connectId) || !this._manager.onDeviceDisconnected) {
      return;
    }
    const subscription = this._manager.onDeviceDisconnected(connectId, () => {
      this._log('warn', 'ble.disconnect.event', { connectId });
      this._connectedDevices.delete(connectId);
      this._notifySubscriptions.get(connectId)?.remove();
      this._notifySubscriptions.delete(connectId);
      this._rejectReaders(
        connectId,
        disconnectError(`Trezor BLE device disconnected: ${connectId}`)
      );
      this._pendingNotifications.delete(connectId);
      this._disconnectHandlers.get(connectId)?.forEach(handler => handler());
    });
    this._disconnectSubscriptions.set(connectId, subscription);
  }

  private _pushNotification(connectId: string, data: Uint8Array): void {
    const readers = this._pendingReaders.get(connectId) ?? [];
    const reader = readers.shift();
    if (reader) {
      clearTimeout(reader.timeout);
      reader.resolve(data);
      this._pendingReaders.set(connectId, readers);
      return;
    }

    const queued = this._pendingNotifications.get(connectId) ?? [];
    queued.push(data);
    this._pendingNotifications.set(connectId, queued);
  }

  private _rejectReaders(connectId: string, error: unknown): void {
    const readers = this._pendingReaders.get(connectId) ?? [];
    readers.forEach(reader => {
      clearTimeout(reader.timeout);
      reader.reject(error);
    });
    this._pendingReaders.delete(connectId);
  }

  private _transactionId(connectId: string, type: string): string {
    return `trezor-${type}-${connectId}`;
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-rn-ble', event, data });
    if (!entry) return;

    try {
      this._logger?.(entry);
    } catch {
      // Debug logging must not affect BLE transport behavior.
    }
  }
}

function advertisesTrezorService(device: BlePlxDevice): boolean {
  return (device.serviceUUIDs ?? []).some(isTrezorBleServiceUuid);
}

function asciiToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function errorToLog(error: unknown) {
  if (error instanceof Error) {
    const extra = Object.keys(error).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (error as unknown as Record<string, unknown>)[key];
      return acc;
    }, {});
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...extra,
    };
  }
  if (error && typeof error === 'object') {
    return { ...(error as Record<string, unknown>) };
  }
  return String(error);
}

function deviceToLog(device: BlePlxDevice | undefined): Record<string, unknown> | undefined {
  if (!device) return undefined;
  return {
    id: device.id,
    name: device.name,
    localName: device.localName,
    rssi: device.rssi,
    mtu: device.mtu,
    serviceUUIDs: device.serviceUUIDs,
    manufacturerDataBytes: device.manufacturerData
      ? base64ToBytes(device.manufacturerData).length
      : 0,
    hasConnect: typeof device.connect === 'function',
    hasIsConnected: typeof device.isConnected === 'function',
    hasCancelConnection: typeof device.cancelConnection === 'function',
    hasDiscoverAllServicesAndCharacteristics:
      typeof device.discoverAllServicesAndCharacteristics === 'function',
    hasCharacteristicsForService: typeof device.characteristicsForService === 'function',
  };
}

function managerCapabilities(manager: BlePlxManager): Record<string, boolean> {
  return {
    devices: typeof manager.devices === 'function',
    connectedDevices: typeof manager.connectedDevices === 'function',
    connectToDevice: typeof manager.connectToDevice === 'function',
    cancelDeviceConnection: typeof manager.cancelDeviceConnection === 'function',
    cancelTransaction: typeof manager.cancelTransaction === 'function',
    setLogLevel: typeof manager.setLogLevel === 'function',
    logLevel: typeof manager.logLevel === 'function',
    onDeviceDisconnected: typeof manager.onDeviceDisconnected === 'function',
    writeCharacteristicWithResponseForDevice:
      typeof manager.writeCharacteristicWithResponseForDevice === 'function',
    writeCharacteristicWithoutResponseForDevice:
      typeof manager.writeCharacteristicWithoutResponseForDevice === 'function',
    monitorCharacteristicForDevice: typeof manager.monitorCharacteristicForDevice === 'function',
  };
}

function isMtuChangeFailure(error: unknown): boolean {
  const maybeError = error as { errorCode?: unknown; message?: unknown };
  if (maybeError?.errorCode === 'DeviceMTUChangeFailed') return true;
  if (maybeError?.errorCode !== 201 || isDeviceDisconnected(error)) return false;
  return String(maybeError?.message ?? '')
    .toLowerCase()
    .includes('mtu');
}

function isOperationCancelled(error: unknown): boolean {
  const maybeError = error as { errorCode?: unknown };
  return maybeError?.errorCode === 'OperationCancelled' || maybeError?.errorCode === 2;
}

function isDeviceDisconnected(error: unknown): boolean {
  const maybeError = error as { errorCode?: unknown; message?: unknown };
  return (
    maybeError?.errorCode === 'DeviceDisconnected' ||
    maybeError?.errorCode === 201 ||
    String(maybeError?.message ?? '')
      .toLowerCase()
      .includes('disconnected')
  );
}

function isStandardHwkError(error: unknown): error is Error & { code: number } {
  return typeof (error as { code?: unknown })?.code === 'number';
}

// Stale/invalid OS bond: Android GATT_INSUF_AUTHENTICATION (ATT error 5), iOS
// "Peer removed pairing information" (CBError 14). The device rejected link
// encryption — the user must forget it in system Bluetooth settings and re-pair.
function isBleBondInvalid(error: unknown): boolean {
  const e = error as {
    attErrorCode?: unknown;
    iosErrorCode?: unknown;
    reason?: unknown;
  };
  if (e?.attErrorCode === 5 || e?.iosErrorCode === 14) return true;
  const reason = typeof e?.reason === 'string' ? e.reason : '';
  return (
    reason.includes('GATT_INSUF_AUTHENTICATION') ||
    reason.includes('Peer removed pairing information')
  );
}

function normalizeConnectError(connectId: string, error: unknown): Error {
  if (isStandardHwkError(error)) return error;
  if (isBleBondInvalid(error)) {
    return createHwkError({
      code: HardwareErrorCode.BleBondInvalid,
      message: `Trezor BLE bond is invalid; re-pair required: ${connectId}`,
      params: {
        connectId,
        originalError: errorToLog(error),
      },
    });
  }
  if (isDeviceDisconnected(error)) {
    return createHwkError({
      code: HardwareErrorCode.DeviceDisconnected,
      message: `Trezor BLE device disconnected during connect: ${connectId}`,
      params: {
        connectId,
        originalError: errorToLog(error),
      },
    });
  }
  return createHwkError({
    code: HardwareErrorCode.TransportError,
    message: `Trezor BLE connect failed: ${connectId}`,
    params: {
      connectId,
      originalError: errorToLog(error),
    },
  });
}

function resolveAfter(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export async function createRNBlePlxTrezorTransport(
  options?: RNBlePlxTrezorTransportOptions
): Promise<TrezorBleTransport> {
  return RNBlePlxTrezorTransport.create(options);
}
