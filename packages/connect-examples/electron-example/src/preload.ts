/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer, contextBridge } from 'electron';
import { EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import { ipcMessageKeys } from './config';

// Define types locally to avoid importing from hd-transport-electron
interface BluetoothPairingDetails {
  deviceId: string;
  pairingKind: 'confirm' | 'confirmPin' | 'providePin';
  pin?: string;
}

interface BluetoothPairingResponse {
  confirmed: boolean;
  pin?: string;
}

export type DesktopAPI = {
  restart: () => void;
  reloadBridgeProcess: () => void;

  // Generic IPC methods for Noble BLE communication
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  off?: (channel: string, callback?: (...args: any[]) => void) => void;

  // Noble BLE specific methods
  nobleBle?: {
    enumerate: () => Promise<{ id: string; name: string }[]>;
    getDevice: (uuid: string) => Promise<{ id: string; name: string } | null>;
    connect: (uuid: string) => Promise<void>;
    disconnect: (uuid: string) => Promise<void>;
    subscribe: (uuid: string) => Promise<void>;
    unsubscribe: (uuid: string) => Promise<void>;
    write: (uuid: string, data: string) => Promise<void>;
    onNotification: (callback: (deviceId: string, data: string) => void) => () => void;
    onDeviceDisconnected: (callback: (device: { id: string; name: string }) => void) => () => void;
  };
};

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

  // Bluetooth api
  onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => {
    // console.log('[Preload] Setting up onBleSelect listener');
    const subscription = (_: unknown, devices: Array<{ id: string; name: string }>) => {
      // console.log('[Preload] Received devices in onBleSelect:', devices);
      callback(devices);
    };
    ipcRenderer.on(EOneKeyBleMessageKeys.BLE_SELECT, subscription);
    return () => {
      // console.log('[Preload] Removing onBleSelect listener');
      ipcRenderer.removeListener(EOneKeyBleMessageKeys.BLE_SELECT, subscription);
    };
  },
  selectBleDevice: (deviceId: string) => {
    // console.log('[Preload] Sending selectBleDevice:', deviceId);
    ipcRenderer.send(EOneKeyBleMessageKeys.BLE_SELECT_RESULT, deviceId);
  },
  cancelBleRequest: () => {
    // console.log('[Preload] Sending cancel-bluetooth-request');
    ipcRenderer.send('cancel-bluetooth-request');
  },

  // 配对相关
  onBlePairingRequest: (callback: (details: BluetoothPairingDetails) => void) => {
    // console.log('[Preload] Setting up onBlePairingRequest listener');
    const subscription = (_: unknown, details: BluetoothPairingDetails) => {
      // console.log('[Preload] Received pairing request:', details);
      callback(details);
    };
    ipcRenderer.on(EOneKeyBleMessageKeys.BLE_PAIRING_REQUEST, subscription);
    return () => {
      // console.log('[Preload] Removing onBlePairingRequest listener');
      ipcRenderer.removeListener(EOneKeyBleMessageKeys.BLE_PAIRING_REQUEST, subscription);
    };
  },
  respondToPairing: (response: BluetoothPairingResponse) => {
    // console.log('[Preload] Sending pairing response:', response);
    ipcRenderer.send(EOneKeyBleMessageKeys.BLE_PAIRING_RESPONSE, response);
  },

  // Add method to stop BLE scanning
  stopBleScan: () => {
    // console.log('[Preload] Sending stop BLE scan request');
    ipcRenderer.send(EOneKeyBleMessageKeys.BLE_STOP_SCAN);
  },

  // 设备预选相关
  preSelectDevice: (uuid: string) => {
    // console.log('[Preload] Pre-selecting device:', uuid);
    ipcRenderer.send(EOneKeyBleMessageKeys.BLE_PRE_SELECT, uuid);
  },

  clearPreSelect: () => {
    // console.log('[Preload] Clearing pre-selected device');
    ipcRenderer.send(EOneKeyBleMessageKeys.BLE_CLEAR_PRE_SELECT);
  },

  enumerate: () =>
    new Promise(resolve => {
      // 1. 监听结果
      const handleResult = (_: any, devices: Array<{ id: string; name: string }>) => {
        ipcRenderer.removeListener(EOneKeyBleMessageKeys.BLE_ENUMERATE_RESULT, handleResult);
        resolve(devices);
      };

      // 2. 注册一次性监听
      ipcRenderer.once(EOneKeyBleMessageKeys.BLE_ENUMERATE_RESULT, handleResult);

      // 3. 发送枚举请求
      ipcRenderer.send(EOneKeyBleMessageKeys.BLE_ENUMERATE);
    }),

  // 设备断开连接处理
  onBleDeviceDisconnected: (callback: (device: { id: string; name: string | null }) => void) => {
    // console.log('[Preload] Setting up onBleDeviceDisconnected listener');
    const subscription = (_: unknown, device: { id: string; name: string | null }) => {
      // console.log('[Preload] Device disconnected:', device);
      callback(device);
    };
    ipcRenderer.on(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, subscription);
    return () => {
      // console.log('[Preload] Removing onBleDeviceDisconnected listener');
      ipcRenderer.removeListener(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, subscription);
    };
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
