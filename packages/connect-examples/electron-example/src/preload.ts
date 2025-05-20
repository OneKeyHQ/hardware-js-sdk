/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer } from 'electron';
import type {
  ElectronBleAPI,
  BluetoothPairingDetails,
  BluetoothPairingResponse,
} from '@onekeyfe/hd-transport-electron';
import { ipcMessageKeys } from './config';

export type DesktopAPI = {
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
  updateReload: () => {
    ipcRenderer.send(ipcMessageKeys.UPDATE_RESTART);
  },
  reloadBridgeProcess: () => {
    ipcRenderer.send(ipcMessageKeys.APP_RELOAD_BRIDGE_PROCESS);
  },

  // Bluetooth api
  onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => {
    console.log('[Preload] Setting up onBleSelect listener');
    const subscription = (_: unknown, devices: Array<{ id: string; name: string }>) => {
      console.log('[Preload] Received devices in onBleSelect:', devices);
      callback(devices);
    };
    ipcRenderer.on('ble-select', subscription);
    return () => {
      console.log('[Preload] Removing onBleSelect listener');
      ipcRenderer.removeListener('ble-select', subscription);
    };
  },
  selectBleDevice: (deviceId: string) => {
    console.log('[Preload] Sending selectBleDevice:', deviceId);
    ipcRenderer.send('ble-select-result', deviceId);
  },
  cancelBleRequest: () => {
    console.log('[Preload] Sending cancel-bluetooth-request');
    ipcRenderer.send('cancel-bluetooth-request');
  },

  // 配对相关
  onBlePairingRequest: (callback: (details: BluetoothPairingDetails) => void) => {
    console.log('[Preload] Setting up onBlePairingRequest listener');
    const subscription = (_: unknown, details: BluetoothPairingDetails) => {
      console.log('[Preload] Received pairing request:', details);
      callback(details);
    };
    ipcRenderer.on('bluetooth-pairing-request', subscription);
    return () => {
      console.log('[Preload] Removing onBlePairingRequest listener');
      ipcRenderer.removeListener('bluetooth-pairing-request', subscription);
    };
  },
  respondToPairing: (response: BluetoothPairingResponse) => {
    console.log('[Preload] Sending pairing response:', response);
    ipcRenderer.send('bluetooth-pairing-response', response);
  },

  enumerate: () =>
    new Promise(resolve => {
      // 1. 监听结果
      const handleResult = (_: any, devices: Array<{ id: string; name: string }>) => {
        ipcRenderer.removeListener('ble-enumerate-result', handleResult);
        resolve(devices);
      };

      // 2. 注册一次性监听
      ipcRenderer.once('ble-enumerate-result', handleResult);

      // 3. 发送枚举请求
      ipcRenderer.send('ble-enumerate');
    }),
};

window.desktopApi = desktopApi;
// contextBridge.exposeInMainWorld('desktopApi', desktopApi);
