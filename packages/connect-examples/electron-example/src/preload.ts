/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer, contextBridge } from 'electron';
import { EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import type { DesktopAPI as BaseDesktopAPI, NobleBleAPI } from '@onekeyfe/hd-transport-electron';
import { ipcMessageKeys } from './config';

// Extend the base DesktopAPI with this specific application's needs
export interface DesktopAPI extends BaseDesktopAPI {
  restart: () => void;
  reloadBridgeProcess: () => void;

  // Generic IPC methods
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  off?: (channel: string, callback?: (...args: any[]) => void) => void;

  // Make nobleBle required for this app
  nobleBle: NobleBleAPI;
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

ipcRenderer.on(ipcMessageKeys.INJECT_ONEKEY_DESKTOP_GLOBALS, (_, globals) => {
  try {
    contextBridge.exposeInMainWorld('ONEKEY_DESKTOP_GLOBALS', globals);
  } catch (error) {
    // Fallback for development or when contextBridge is not available
    console.warn('Failed to expose ONEKEY_DESKTOP_GLOBALS via contextBridge:', error);
  }
});

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
  reloadBridgeProcess: () => {
    ipcRenderer.send(ipcMessageKeys.APP_RELOAD_BRIDGE_PROCESS);
  },

  // Noble BLE specific methods
  nobleBle: {
    enumerate: () => ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE),
    getDevice: (uuid: string) =>
      ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_GET_DEVICE, uuid),
    connect: (uuid: string) => ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT, uuid),
    disconnect: (uuid: string) =>
      ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT, uuid),
    subscribe: (uuid: string) =>
      ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE, uuid),
    unsubscribe: (uuid: string) =>
      ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE, uuid),
    write: (uuid: string, data: string) =>
      ipcRenderer.invoke(EOneKeyBleMessageKeys.NOBLE_BLE_WRITE, uuid, data),
    onNotification: (callback: (deviceId: string, data: string) => void) => {
      const subscription = (_: unknown, deviceId: string, data: string) => {
        callback(deviceId, data);
      };
      ipcRenderer.on(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, subscription);
      return () => {
        ipcRenderer.removeListener(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, subscription);
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
