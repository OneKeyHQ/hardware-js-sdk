import { Buffer } from 'buffer';
import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import { TREZOR_BLE_CONNECT_PROFILE, TREZOR_BLE_MATCH, TREZOR_BLE_VENDOR } from './bleProfile';

import type { ThirdPartyBleApi, ThirdPartyBleDeviceInfo } from '@onekeyfe/hwk-desktop-noble-ble';

export interface TrezorElectronBleTransportOptions {
  /** The IPC bridge exposed by the main process (typically `window.desktopApi.trezorBle`). */
  bridge?: ThirdPartyBleApi;
  logger?: TrezorDebugLogger;
}

const disconnectError = (message: string): Error =>
  Object.assign(new Error(message), { code: HardwareErrorCode.DeviceDisconnected });

const notConnectedError = (id: string): Error =>
  disconnectError(`Trezor Electron BLE device is not connected: ${id}`);

const resolveBridge = (options?: TrezorElectronBleTransportOptions): ThirdPartyBleApi => {
  if (options?.bridge) return options.bridge;
  const win =
    typeof window !== 'undefined'
      ? (window as unknown as { desktopApi?: { trezorBle?: ThirdPartyBleApi } })
      : undefined;
  const bridge = win?.desktopApi?.trezorBle;
  if (!bridge) {
    throw createHwkError({
      code: HardwareErrorCode.BridgeNotFound,
      message:
        'TrezorElectronBleTransport: no bridge found — pass `bridge` or expose `window.desktopApi.trezorBle` from your Electron preload script',
    });
  }
  return bridge;
};

interface PendingRead {
  resolve(data: Uint8Array): void;
  reject(error: Error): void;
}

/**
 * Renderer-side wrapper around the main process's BLE handler. Buffers
 * notifications into a per-device read queue so callers can `read()`
 * sequentially without missing chunks that arrive between reads.
 */
export class TrezorElectronBleTransport {
  private readonly _bridge: ThirdPartyBleApi;

  private readonly _connected = new Set<string>();

  private readonly _connecting = new Map<string, { cancelled: boolean }>();

  private readonly _readQueues = new Map<string, Uint8Array[]>();

  private readonly _pendingReads = new Map<string, PendingRead[]>();

  private readonly _disconnectHandlers = new Map<string, Set<() => void>>();

  private _disposeNotificationListener?: () => void;

  private _disposeDisconnectListener?: () => void;

  private readonly _logger?: TrezorElectronBleTransportOptions['logger'];

  constructor(options: TrezorElectronBleTransportOptions = {}) {
    this._bridge = resolveBridge(options);
    this._logger = options.logger;
    this._wireGlobalListeners();
  }

  async scan(durationMs?: number): Promise<ThirdPartyBleDeviceInfo[]> {
    // `match` is applied in JS, after an unfiltered radio scan — it is not a
    // native scan filter. That distinction matters: a native service-UUID
    // filter drops a Safe 7's ADV packets on Windows, because its UUID travels
    // in the scan response rather than the ADV packet. Hence the name patterns,
    // which match what the ADV packet does carry.
    try {
      return await this._bridge.scan({
        vendor: TREZOR_BLE_VENDOR,
        match: TREZOR_BLE_MATCH,
        durationMs,
      });
    } catch (error) {
      this._log('warn', 'ble.renderer.scan.error', {
        error: String(error),
      });
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    await this._bridge.stopScan(TREZOR_BLE_VENDOR);
  }

  /** Abandon the in-flight connect/pairing in the main process. */
  async cancelPairing(connectId?: string): Promise<void> {
    const ids = new Set(
      [...this._connecting.keys(), ...this._connected].filter(
        id => connectId === undefined || id === connectId
      )
    );
    for (const id of ids) {
      const claim = this._connecting.get(id);
      if (claim) claim.cancelled = true;
    }
    await Promise.all(
      Array.from(ids, async id => {
        await this._bridge.cancelPairing({ vendor: TREZOR_BLE_VENDOR, id });
        if (this._connected.has(id)) this._handleDeviceDisconnected(id);
      })
    );
    if (connectId === undefined) await this.stopScan();
  }

  async connect(connectId: string): Promise<void> {
    if (this._connected.has(connectId)) return;
    // The shared handler holds no vendor defaults: every GATT uuid and the
    // padded-write framing travel with the call.
    const claim = { cancelled: false };
    this._connecting.set(connectId, claim);
    const assertActive = () => {
      if (claim.cancelled) {
        throw createHwkError({
          code: HardwareErrorCode.BlePairingCancelled,
          message: 'Trezor BLE pairing cancelled',
        });
      }
    };
    try {
      await this._bridge.connect(connectId, TREZOR_BLE_CONNECT_PROFILE);
      try {
        assertActive();
        await this._bridge.subscribe(connectId);
        assertActive();
      } catch (error) {
        // Main already owns the link; reject late completion without leaving it open.
        await this._bridge.disconnect(connectId).catch(() => undefined);
        throw error;
      }
      this._connected.add(connectId);
      this._readQueues.set(connectId, []);
      this._pendingReads.set(connectId, []);
    } finally {
      if (this._connecting.get(connectId) === claim) this._connecting.delete(connectId);
    }
  }

  async disconnect(connectId: string): Promise<void> {
    this._connected.delete(connectId);
    this._failPendingReads(connectId, notConnectedError(connectId));
    this._readQueues.delete(connectId);
    try {
      await this._bridge.unsubscribe(connectId);
    } catch (error) {
      this._log('warn', 'unsubscribe.error', { connectId, error: String(error) });
    }
    await this._bridge.disconnect(connectId);
  }

  async write(connectId: string, data: Uint8Array): Promise<void> {
    if (!this._connected.has(connectId)) throw notConnectedError(connectId);
    const hex = Buffer.from(data).toString('hex');
    await this._bridge.write(connectId, hex);
  }

  async read(connectId: string): Promise<Uint8Array> {
    if (!this._connected.has(connectId)) throw notConnectedError(connectId);
    const queue = this._readQueues.get(connectId);
    if (queue && queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return queue.shift()!;
    }
    return new Promise<Uint8Array>((resolve, reject) => {
      const pending = this._pendingReads.get(connectId);
      if (!pending) {
        reject(notConnectedError(connectId));
        return;
      }
      pending.push({ resolve, reject });
    });
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

  /** Tear down global listeners — called by the connector's `reset()`. */
  reset(): void {
    this._disposeNotificationListener?.();
    this._disposeDisconnectListener?.();
    this._disposeNotificationListener = undefined;
    this._disposeDisconnectListener = undefined;
    for (const handlers of this._disconnectHandlers.values()) handlers.clear();
    this._disconnectHandlers.clear();
    for (const id of this._connected) this._failPendingReads(id, notConnectedError(id));
    this._connected.clear();
    this._readQueues.clear();
    this._pendingReads.clear();
  }

  private _wireGlobalListeners(): void {
    this._disposeNotificationListener = this._bridge.onNotification((id, hex) => {
      const data = new Uint8Array(Buffer.from(hex, 'hex'));
      const pending = this._pendingReads.get(id);
      if (pending && pending.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pending.shift()!.resolve(data);
        return;
      }
      const queue = this._readQueues.get(id);
      if (queue) queue.push(data);
    });
    this._disposeDisconnectListener = this._bridge.onDeviceDisconnected(id => {
      this._handleDeviceDisconnected(id);
    });
  }

  private _handleDeviceDisconnected(id: string): void {
    this._connected.delete(id);
    this._failPendingReads(id, disconnectError(`Trezor BLE device disconnected: ${id}`));
    this._readQueues.delete(id);
    this._disconnectHandlers.get(id)?.forEach(handler => {
      try {
        handler();
      } catch (error) {
        this._log('error', 'disconnect.handler.threw', { id, error: String(error) });
      }
    });
  }

  private _failPendingReads(connectId: string, error: Error): void {
    const pending = this._pendingReads.get(connectId);
    if (!pending) return;
    for (const item of pending) item.reject(error);
    this._pendingReads.set(connectId, []);
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-electron-ble', event, data });
    if (!entry) return;

    this._logger?.(entry);
  }
}

export function createTrezorElectronBleTransport(
  options?: TrezorElectronBleTransportOptions
): TrezorElectronBleTransport {
  return new TrezorElectronBleTransport(options);
}
