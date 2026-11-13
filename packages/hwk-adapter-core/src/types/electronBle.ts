import { createHwkError, isHardwareErrorCode } from './errors';

import type { ConnectorSerializedError } from './connector';

/** Serializable BLE transport data shared by Electron main and renderer runtimes. */
export interface ElectronBleDeviceInfo {
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];
}

/**
 * IPC-safe peripheral match: advertises one of `serviceUuids`, or its local name matches every
 * `namePatterns` entry (case-insensitive regex sources). The desktop noble-ble host treats this
 * as a hint only: its vendor allowlist decides, `serviceUuids` can only narrow it, and
 * `namePatterns` are never compiled.
 */
export interface ElectronBleMatch {
  serviceUuids?: string[];
  namePatterns?: string[];
}

export interface ElectronBleScanOptions {
  /** Opaque partition key: results and connected devices never mix across it. */
  vendor?: string;
  match?: ElectronBleMatch;
  /** @deprecated Superseded by `match.serviceUuids`. */
  serviceUuids?: string[];
  durationMs?: number;
}

/** GATT profile plus the write framing this vendor's firmware expects. */
export interface ElectronBleConnectOptions {
  vendor: string;
  serviceUuid: string;
  writeUuid: string;
  notifyUuid: string;
  /**
   * `padded`: fixed `chunkSize` packets, last zero-filled (Trezor firmware drops short packets).
   * `raw`: the buffer as given, for self-length-framed protocols (Ledger).
   */
  write?: {
    mode: 'padded' | 'raw';
    chunkSize?: number;
    chunkDelayMs?: number;
    maxLength?: number;
  };
}

/** Native code handles GATT only; framing, identity checks and wallet calls stay in the SDK. */
export interface ElectronBleApi {
  scan(options?: ElectronBleScanOptions): Promise<ElectronBleDeviceInfo[]>;
  stopScan(vendor?: string): Promise<void>;
  connect(id: string, options?: ElectronBleConnectOptions): Promise<{ id: string; name?: string }>;
  disconnect(id: string): Promise<void>;
  subscribe(id: string): Promise<void>;
  unsubscribe(id: string): Promise<void>;
  write(id: string, hexData: string): Promise<void>;
  checkAvailability(): Promise<{ available: boolean; state: string; initialized: boolean }>;
  getDevice(id: string): Promise<ElectronBleDeviceInfo | null>;
  onNotification(handler: (id: string, hexData: string) => void): () => void;
  onDeviceDisconnected(handler: (id: string) => void): () => void;
  /** Abandon an in-flight connect in the main process. Optional for hosts that cannot cancel. */
  cancelPairing?(options?: { vendor: string; id?: string }): Promise<void>;
}

const isSerializedError = (value: unknown): value is ConnectorSerializedError =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Error) &&
  typeof (value as { message?: unknown }).message === 'string';

/** The same shape the host threw, so `params` readers work on either side of IPC. */
const restoreHostError = ({ message, code, params }: ConnectorSerializedError): Error =>
  isHardwareErrorCode(code)
    ? createHwkError({ code, message, ...(params ? { params } : {}) })
    : new Error(message);

/**
 * Electron IPC keeps only an Error's message, so a host can reject bridge calls with
 * `ConnectorSerializedError` data instead. Restores those as `createHwkError` errors; any other
 * rejection passes through unchanged.
 */
export function rehydrateElectronBleErrors<T extends object>(bridge: T): T {
  // A contextBridge object may be frozen, which rules out patching or proxying it.
  const wrapped = Object.create(bridge) as T;
  for (const key of Object.keys(bridge) as Array<keyof T>) {
    if (typeof bridge[key] === 'function') {
      Object.defineProperty(wrapped, key, {
        value: (...args: unknown[]) => {
          const method = bridge[key] as (...params: unknown[]) => unknown;
          const result = method.apply(bridge, args);
          if (typeof (result as PromiseLike<unknown> | null)?.then !== 'function') return result;
          return Promise.resolve(result).catch((error: unknown) => {
            throw isSerializedError(error) ? restoreHostError(error) : error;
          });
        },
      });
    }
  }
  return wrapped;
}
