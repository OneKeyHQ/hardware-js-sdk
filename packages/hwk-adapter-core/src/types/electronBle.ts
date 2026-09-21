/** Serializable BLE transport data shared by Electron main and renderer runtimes. */
export interface ElectronBleDeviceInfo {
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];
}

/**
 * How the main process recognizes one vendor's peripherals. Everything here
 * crosses IPC, so it is data rather than predicates: the handler owns no
 * vendor knowledge of its own. A peripheral matches when it advertises one of
 * `serviceUuids`, or when its local name matches every entry in
 * `namePatterns` (each is a case-insensitive regular expression source, so a
 * single entry can carry alternations).
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
   * `padded` splits into fixed `chunkSize` packets, zero-filling the last one
   * — Trezor firmware silently drops a short packet. `raw` writes the buffer
   * as given, for framing that carries its own length (Ledger).
   */
  write?: {
    mode: 'padded' | 'raw';
    chunkSize?: number;
    chunkDelayMs?: number;
    maxLength?: number;
  };
}

/** Native code handles GATT only; framing, identity checks and wallet operations stay in the SDK. */
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
}
