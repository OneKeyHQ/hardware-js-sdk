/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { contextBridge, ipcRenderer } from 'electron';
import { EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import { invokeNobleBleIpc } from '@onekeyfe/hd-transport-electron';

import { ipcMessageKeys } from './config';

import type {
  DesktopAPI as BaseDesktopAPI,
  NobleBleAPI,
  NobleBleWriteOptions,
} from '@onekeyfe/hd-transport-electron';

// Simplified Bluetooth system API - only for opening settings
export interface BluetoothSystemAPI {
  // System integration
  openBluetoothSettings: () => void;
  openPrivacySettings: () => void;
}

// Extend the base DesktopAPI with this specific application's needs
export interface DesktopAPI extends BaseDesktopAPI {
  restart: () => void;

  // Generic IPC methods
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  off?: (channel: string, callback?: (...args: any[]) => void) => void;

  // Make nobleBle required for this app
  nobleBle: NobleBleAPI;

  // Simplified Bluetooth system management
  bluetoothSystem: BluetoothSystemAPI;
}

declare global {
  interface Window {
    desktopApi: DesktopAPI;
    INJECT_PATH: string;
  }
}

const validChannels = [
  // Update events
  ipcMessageKeys.UPDATE_AVAILABLE,
  ipcMessageKeys.UPDATE_DOWNLOADED,
];

const invokeNobleBle = <T>(channel: string, ...args: unknown[]) =>
  invokeNobleBleIpc<T>(ipcRenderer.invoke(channel, ...args));

const desktopApi = {
  // Generic IPC methods
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, func: (...args: any[]) => any) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => func(...args));
    }
    // For other channels, set up listener and return cleanup function
    const listener = (_: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  restart: () => {
    ipcRenderer.send(ipcMessageKeys.APP_RESTART);
  },
  updateReload: () => {
    ipcRenderer.send(ipcMessageKeys.UPDATE_RESTART);
  },
  // Noble BLE specific methods
  nobleBle: {
    enumerate: () =>
      invokeNobleBle<{ id: string; name: string }[]>(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE),
    getDevice: (uuid: string) =>
      invokeNobleBle<{ id: string; name: string; mtu?: number } | null>(
        EOneKeyBleMessageKeys.NOBLE_BLE_GET_DEVICE,
        uuid
      ),
    connect: (uuid: string) => invokeNobleBle<void>(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT, uuid),
    disconnect: (uuid: string) =>
      invokeNobleBle<void>(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT, uuid),
    subscribe: (uuid: string) =>
      invokeNobleBle<void>(EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE, uuid),
    unsubscribe: (uuid: string) =>
      invokeNobleBle<void>(EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE, uuid),
    write: (uuid: string, data: string, options?: NobleBleWriteOptions) =>
      invokeNobleBle<void>(EOneKeyBleMessageKeys.NOBLE_BLE_WRITE, uuid, data, options),
    onNotification: (callback: (deviceId: string, data: string) => void) => {
      const subscription = (_: unknown, deviceId: string, data: string) => {
        callback(deviceId, data);
      };
      ipcRenderer.on(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, subscription);
      return () => {
        ipcRenderer.removeListener(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, subscription);
      };
    },
    onMtuChanged: (callback: (device: { id: string; mtu: number }) => void) => {
      const subscription = (_: unknown, device: { id: string; mtu: number }) => {
        callback(device);
      };
      ipcRenderer.on(EOneKeyBleMessageKeys.NOBLE_BLE_MTU_CHANGED, subscription);
      return () => {
        ipcRenderer.removeListener(EOneKeyBleMessageKeys.NOBLE_BLE_MTU_CHANGED, subscription);
      };
    },
    onDeviceDisconnected: (callback: (device: { id: string; name: string }) => void) => {
      const subscription = (_: unknown, device: { id: string; name: string }) => {
        callback(device);
      };
      ipcRenderer.on(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, subscription);
      return () => {
        ipcRenderer.removeListener(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, subscription);
      };
    },
    checkAvailability: () =>
      invokeNobleBle<{
        available: boolean;
        state: string;
        unsupported: boolean;
        initialized: boolean;
      }>(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK),
  },

  // Simplified Bluetooth system management
  bluetoothSystem: {
    // Open Bluetooth settings when Bluetooth is off
    openBluetoothSettings: () => ipcRenderer.invoke('bluetooth-open-bluetooth-settings'),
    // Open Privacy & Security settings for Bluetooth permission
    openPrivacySettings: () => ipcRenderer.invoke('bluetooth-open-privacy-settings'),
  },
};

// Use contextBridge to safely expose the API
try {
  contextBridge.exposeInMainWorld('desktopApi', desktopApi);
} catch (error) {
  // Fallback for development or when contextBridge is not available
  console.warn('Failed to expose desktopApi via contextBridge:', error);
  (window as any).desktopApi = desktopApi;
}
