/** Serializable BLE transport data shared by Electron main and renderer runtimes. */
export interface ElectronBleDeviceInfo {
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];
}

/**
 * IPC-safe peripheral match: advertises one of `serviceUuids`, or its local name matches every
 * `namePatterns` entry (case-insensitive regex sources).
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
