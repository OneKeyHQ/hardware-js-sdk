/**
 * Desktop API types for Electron preload script
 * These types define the core interface for Noble BLE communication
 */

// Noble BLE API interface - core BLE functionality
export interface NobleBleWriteOptions {
  pacingDelayMs?: number;
}

export interface NobleBleAPI {
  enumerate: () => Promise<{ id: string; name: string }[]>;
  getDevice: (uuid: string) => Promise<{ id: string; name: string; mtu?: number } | null>;
  connect: (uuid: string) => Promise<void>;
  /**
   * Logical end-of-operation (keep-alive). The link stays up; the main process
   * starts its idle countdown. Without this bridge method the device is held
   * for the full busy backstop instead of the short idle window.
   */
  release: (uuid: string) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;
  subscribe: (uuid: string) => Promise<void>;
  unsubscribe: (uuid: string) => Promise<void>;
  write: (uuid: string, data: string, options?: NobleBleWriteOptions) => Promise<void>;
  onNotification: (callback: (deviceId: string, data: string) => void) => () => void;
  onMtuChanged?: (callback: (device: { id: string; mtu: number }) => void) => () => void;
  onDeviceDisconnected: (callback: (device: { id: string; name: string }) => void) => () => void;
  checkAvailability: () => Promise<{
    available: boolean;
    state: string;
    unsupported: boolean;
    initialized: boolean;
  }>;
}

// Base Desktop API interface - contains only Noble BLE functionality
export interface DesktopAPI {
  nobleBle?: NobleBleAPI;
}
