import type { ElectronBleConnectOptions, ElectronBleScanOptions } from '@onekeyfe/hwk-adapter-core';

/** Device info the main process returns to the renderer over IPC. */
export interface ThirdPartyBleDeviceInfo {
  /** Stable id (noble peripheral.id) used as connectId. */
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];

  // --- Full advertisement capture, best-effort, for cross-transport identity ---
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
  stopScan(vendor?: string): Promise<void>;
  connect(id: string, options: ElectronBleConnectOptions): Promise<{ id: string; name?: string }>;
  disconnect(id: string): Promise<void>;
  /** Subscribe to the BLE notify characteristic for `id`. */
  subscribe(id: string): Promise<void>;
  unsubscribe(id: string): Promise<void>;
  /** Write a framed payload; main chunks and zero-pads `padded`, writes `raw` as-is. */
  write(id: string, hexData: string): Promise<void>;
  checkAvailability(): Promise<ThirdPartyBleAvailability>;
  /** Look up a previously-scanned device by id without re-scanning. */
  getDevice(id: string): Promise<ThirdPartyBleDeviceInfo | null>;
  /** Read current RSSI (dBm) of a *connected* peripheral. */
  readRssi(id: string): Promise<number>;
  /** Cancel only the named vendor/device; omitting the argument cancels everything. */
  cancelPairing(options?: { vendor: string; id?: string }): Promise<void>;

  /** Register a listener for incoming BLE notifications. Returns an unsubscribe fn. */
  onNotification(handler: (id: string, hexData: string) => void): () => void;
  /** Register a listener for unexpected disconnects. Returns an unsubscribe fn. */
  onDeviceDisconnected(handler: (id: string) => void): () => void;
}
