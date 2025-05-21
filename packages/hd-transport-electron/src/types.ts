export interface BluetoothPairingDetails {
  deviceId: string;
  pairingKind: 'confirm' | 'confirmPin' | 'providePin';
  pin?: string;
}

export interface BluetoothPairingResponse {
  confirmed: boolean;
  pin?: string;
}

export interface BluetoothDevice {
  deviceId: string;
  deviceName: string | null;
}

export interface BleDevice {
  id: string;
  name: string;
  paired?: boolean;
}

export interface BleEnumerateOptions {
  /**
   * Scan timeout in milliseconds (default: 30s)
   */
  timeout?: number;
  /**
   * Whether to force a new scan even if paired devices exist
   */
  forceScan?: boolean;
}

export interface ElectronBleAPI {
  // Device enumeration
  enumerate(options?: BleEnumerateOptions): Promise<BleDevice[]>;

  // Device selection
  onBleSelect(callback: (devices: BleDevice[]) => void): () => void;
  selectBleDevice(deviceId: string): void;
  cancelBleRequest(): void;

  // Device pairing
  onBlePairingRequest(callback: (details: BluetoothPairingDetails) => void): () => void;
  respondToPairing(response: BluetoothPairingResponse): void;

  // Device disconnection
  onBleDeviceDisconnected(
    callback: (device: { id: string; name: string | null }) => void
  ): () => void;
}

// IPC Channel Names
export const IPC_CHANNELS = {
  BLE_ENUMERATE: 'ble-enumerate',
  BLE_ENUMERATE_RESULT: 'ble-enumerate-result',
  BLE_SCAN_TIMEOUT: 'ble-scan-timeout',
  BLE_SELECT: 'ble-select',
  BLE_SELECT_RESULT: 'ble-select-result',
  BLE_PAIRING_REQUEST: 'ble-pairing-request',
  BLE_PAIRING_RESPONSE: 'ble-pairing-response',
} as const;

declare global {
  interface Window {
    electronBleAPI: ElectronBleAPI;
  }
}
