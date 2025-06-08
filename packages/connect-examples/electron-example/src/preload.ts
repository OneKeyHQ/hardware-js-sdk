/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer } from 'electron';
import { EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import type {
  ElectronBleAPI,
  BluetoothPairingDetails,
  BluetoothPairingResponse,
} from '@onekeyfe/hd-transport-electron';
import { ipcMessageKeys } from './config';

export type DesktopAPI = {
  restart: () => void;
  reloadBridgeProcess: () => void;
};

declare global {
  interface Window {
    desktopApi: DesktopAPI;
    INJECT_PATH: string;
    electronBleAPI: ElectronBleAPI;
  }
}

const validChannels = [
  // Update events
  ipcMessageKeys.UPDATE_AVAILABLE,
  ipcMessageKeys.UPDATE_DOWNLOADED,
];

ipcRenderer.on(ipcMessageKeys.INJECT_ONEKEY_DESKTOP_GLOBALS, (_, globals) => {
  // @ts-expect-error
  window.ONEKEY_DESKTOP_GLOBALS = globals;
  // contextBridge.exposeInMainWorld('ONEKEY_DESKTOP_GLOBALS', globals);
});

const desktopApi = {
  on: (channel: string, func: (...args: any[]) => any) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => func(...args));
    }
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
};

window.desktopApi = desktopApi;
// contextBridge.exposeInMainWorld('desktopApi', desktopApi);
