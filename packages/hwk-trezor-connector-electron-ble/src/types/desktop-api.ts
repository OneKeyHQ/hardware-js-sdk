/**
 * Shape of the API the renderer process talks to. In a real Electron app
 * this is normally exposed via `contextBridge.exposeInMainWorld('desktopApi',
 * { trezorBle: ... })`, but the transport accepts the bridge directly so
 * non-Electron hosts (and unit tests) can plug in their own implementation.
 */
export interface TrezorBleDeviceInfo {
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

export interface TrezorBleAvailability {
  available: boolean;
  /** noble state: `poweredOn` / `poweredOff` / `unauthorized` / `unsupported` / `resetting` / `unknown`. */
  state: string;
  initialized: boolean;
}

export interface TrezorBleScanOptions {
  /**
   * DEPRECATED and ignored by the handler: a native service-UUID filter drops
   * Safe 7 ADV packets on Windows, so the scan is always unfiltered and Trezor
   * matching happens in JS. Kept only so older renderers remain IPC-compatible.
   */
  serviceUuids?: string[];
  durationMs?: number;
}

export interface TrezorBleApi {
  scan(options?: TrezorBleScanOptions): Promise<TrezorBleDeviceInfo[]>;
  stopScan(): Promise<void>;
  connect(id: string): Promise<{ id: string; name?: string }>;
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
  checkAvailability(): Promise<TrezorBleAvailability>;
  /** Look up a previously-scanned device by id without re-scanning. */
  getDevice(id: string): Promise<TrezorBleDeviceInfo | null>;
  /** Read current RSSI (dBm) of a *connected* peripheral. */
  readRssi(id: string): Promise<number>;
  /** Stop scan + disconnect every in-flight connection. */
  cancelPairing(): Promise<void>;

  /** Register a listener for incoming BLE notifications. Returns an unsubscribe fn. */
  onNotification(handler: (id: string, hexData: string) => void): () => void;
  /** Register a listener for unexpected disconnects. Returns an unsubscribe fn. */
  onDeviceDisconnected(handler: (id: string) => void): () => void;
}
