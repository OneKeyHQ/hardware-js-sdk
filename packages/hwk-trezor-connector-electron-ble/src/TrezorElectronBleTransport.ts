import { Buffer } from 'buffer';
import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import type { TrezorBleApi, TrezorBleDeviceInfo } from './types/desktop-api';

export interface TrezorElectronBleTransportOptions {
  /** The IPC bridge exposed by the main process (typically `window.desktopApi.trezorBle`). */
  bridge?: TrezorBleApi;
  logger?: TrezorDebugLogger;
}

const disconnectError = (message: string): Error =>
  Object.assign(new Error(message), { code: HardwareErrorCode.DeviceDisconnected });

const notConnectedError = (id: string): Error =>
  disconnectError(`Trezor Electron BLE device is not connected: ${id}`);

const resolveBridge = (options?: TrezorElectronBleTransportOptions): TrezorBleApi => {
  if (options?.bridge) return options.bridge;
  const win =
    typeof window !== 'undefined'
      ? (window as unknown as { desktopApi?: { trezorBle?: TrezorBleApi } })
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
  private readonly _bridge: TrezorBleApi;

  private readonly _connected = new Set<string>();

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

  async scan(durationMs?: number): Promise<TrezorBleDeviceInfo[]> {
    // No serviceUuids filter: a native service-UUID scan filter drops a
    // Safe 7's ADV packets on Windows (its UUID travels in the scan response,
    // not the ADV packet), so the handler scans unfiltered and does the Trezor
    // matching itself in JS. Passing a filter here would at best be ignored by
    // a current handler and at worst re-break discovery on an older one.
    try {
      return await this._bridge.scan({
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
    await this._bridge.stopScan();
  }

  async connect(connectId: string): Promise<void> {
    if (this._connected.has(connectId)) return;
    await this._bridge.connect(connectId);
    try {
      await this._bridge.subscribe(connectId);
    } catch (error) {
      // Main process is already connected — tear it down so we don't leak a
      // main-side connection the renderer can no longer address.
      await this._bridge.disconnect(connectId).catch(() => undefined);
      throw error;
    }
    this._connected.add(connectId);
    this._readQueues.set(connectId, []);
    this._pendingReads.set(connectId, []);
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
