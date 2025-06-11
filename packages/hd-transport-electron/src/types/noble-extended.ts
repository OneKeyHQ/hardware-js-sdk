/*
 * Extended type definitions for Noble BLE
 * Supplements @types/noble with additional interfaces
 */

import type { Peripheral, Characteristic, Advertisement } from '@abandonware/noble';

// Device info interface for our API
export interface DeviceInfo {
  id: string;
  name: string;
  state: string;
}

// Characteristic pair interface
export interface CharacteristicPair {
  write: Characteristic;
  notify: Characteristic;
}

// Noble module interface for dynamic import
export interface NobleModule {
  state: string;
  startScanning(
    serviceUUIDs: string[],
    allowDuplicates: boolean,
    callback?: (error?: Error) => void
  ): void;
  stopScanning(callback?: () => void): void;
  on(event: 'stateChange', listener: (state: string) => void): void;
  on(event: 'discover', listener: (peripheral: Peripheral) => void): void;
  removeListener(event: 'stateChange', listener: (state: string) => void): void;
}

// Logger interface
export interface Logger {
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Error callback type
export type ErrorCallback = (error: string) => void;

// Data callback type
export type DataCallback = (data: string) => void;

// Helper function to safely get device name from advertisement
export function getDeviceName(advertisement: Advertisement): string {
  return advertisement.localName || 'Unknown Device';
}

// Safe logger utility
export function safeLog(
  logger: Logger | null,
  level: 'info' | 'debug' | 'error',
  message: string,
  ...args: any[]
): void {
  if (logger) {
    logger[level](message, ...args);
  } else {
    console[level](`[NobleBLE] ${message}`, ...args);
  }
}
