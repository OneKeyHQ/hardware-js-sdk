import type { ElectronBleConnectOptions, ElectronBleScanOptions } from '@onekeyfe/hwk-adapter-core';

/**
 * Shape of the API the renderer process talks to. In a real Electron app
 * this is normally exposed via `contextBridge.exposeInMainWorld('desktopApi',
 * { trezorBle: ... })`, but the transport accepts the bridge directly so
 * non-Electron hosts (and unit tests) can plug in their own implementation.
 */
export interface ThirdPartyBleDeviceInfo {
  /** Stable id (noble peripheral.id) used as connectId. */
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];

  // --- Full advertisement capture (added so the host can hunt for a
  // cross-transport identity without re-scanning). All optional; populated
  // best-effort from whatever the OS BLE stack exposed. ---
  /** Same as `name`, kept explicit to mirror noble's `advertisement.localName`. */
  localName?: string;
  /** Whether the peripheral advertised itself as connectable. */
  isConnectable?: boolean | null;
  serviceSolicitationUuids?: string[];
  txPowerLevel?: number;
  /** Manufacturer-specific advertisement data, hex-encoded (may embed a serial). */
  manufacturerDataHex?: string;
  /** Per-service advertisement data, each hex-encoded. */
  serviceData?: Array<{ uuid: string; dataHex: string }>;
  /** BLE MAC/address when the OS exposes it separately from `id`. */
  address?: string;
  addressType?: string;
  /** noble peripheral connection state at scan time. */
  state?: string;
}

export interface ThirdPartyBleAvailability {
  available: boolean;
  /** noble state: `poweredOn` / `poweredOff` / `unauthorized` / `unsupported` / `resetting` / `unknown`. */
  state: string;
  initialized: boolean;
}

/** One definition of the scan contract; the IPC shape lives in adapter-core. */
export type ThirdPartyBleScanOptions = ElectronBleScanOptions;

export interface ThirdPartyBleApi {
  scan(options?: ThirdPartyBleScanOptions): Promise<ThirdPartyBleDeviceInfo[]>;
  stopScan(): Promise<void>;
  connect(id: string, options: ElectronBleConnectOptions): Promise<{ id: string; name?: string }>;
  disconnect(id: string): Promise<void>;
  /** Subscribe to the BLE notify characteristic for `id`. */
  subscribe(id: string): Promise<void>;
  unsubscribe(id: string): Promise<void>;
  /**
   * Write a payload (already-framed if Trezor v1, or a single 244-byte chunk
   * for THP). The main process is responsible for splitting it into BLE-MTU
   * chunks before handing it to noble.
   */
  write(id: string, hexData: string): Promise<void>;
  checkAvailability(): Promise<ThirdPartyBleAvailability>;
  /** Look up a previously-scanned device by id without re-scanning. */
  getDevice(id: string): Promise<ThirdPartyBleDeviceInfo | null>;
  /** Read current RSSI (dBm) of a *connected* peripheral. */
  readRssi(id: string): Promise<number>;
  /** Stop scan + disconnect every in-flight connection. */
  cancelPairing(): Promise<void>;

  /** Register a listener for incoming BLE notifications. Returns an unsubscribe fn. */
  onNotification(handler: (id: string, hexData: string) => void): () => void;
  /** Register a listener for unexpected disconnects. Returns an unsubscribe fn. */
  onDeviceDisconnected(handler: (id: string) => void): () => void;
}
