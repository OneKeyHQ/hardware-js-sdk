/*
 * Extended type definitions for Noble BLE
 * Supplements @types/noble with additional interfaces
 */

import type { Characteristic, Peripheral } from '@stoprocent/noble';
import type { OneKeyDeviceInfoBase } from '@onekeyfe/hd-transport';

// Device info interface for our API
export interface DeviceInfo extends OneKeyDeviceInfoBase {
  id: string;
  name: string;
  state: string;
  mtu?: number;
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
  stop(): void;
  cancelConnect?(id: string): void;
  on(event: 'stateChange', listener: (state: string) => void): void;
  on(event: 'discover', listener: (peripheral: Peripheral) => void): void;
  removeListener(event: 'stateChange', listener: (state: string) => void): void;
  removeListener(event: 'discover', listener: (peripheral: Peripheral) => void): void;
}

// Logger interface
export interface Logger {
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
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
