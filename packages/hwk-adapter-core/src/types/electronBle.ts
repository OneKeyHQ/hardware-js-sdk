/** Serializable BLE transport data shared by Electron main and renderer runtimes. */
export interface ElectronBleDeviceInfo {
  id: string;
  name?: string;
  rssi?: number;
  advertisedServiceUuids?: string[];
}

export interface ElectronBleScanOptions {
  vendor?: 'trezor' | 'ledger';
  serviceUuids?: string[];
  durationMs?: number;
}

export interface ElectronBleConnectOptions {
  vendor: 'ledger';
  serviceUuid: string;
  writeUuid: string;
  notifyUuid: string;
}

/** Native code handles GATT only; framing, identity checks and wallet operations stay in the SDK. */
export interface ElectronBleApi {
  scan(options?: ElectronBleScanOptions): Promise<ElectronBleDeviceInfo[]>;
  stopScan(): Promise<void>;
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
