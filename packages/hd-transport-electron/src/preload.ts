import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronBleAPI', {
  // 设备选择相关
  onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => {
    const subscription = (_: any, devices: Array<{ id: string; name: string }>) =>
      callback(devices);
    ipcRenderer.on('ble-select', subscription);
    return () => {
      ipcRenderer.removeListener('ble-select', subscription);
    };
  },
  selectBleDevice: (deviceId: string) => {
    ipcRenderer.send('ble-select-result', deviceId);
  },
  cancelBleRequest: () => {
    ipcRenderer.send('cancel-bluetooth-request');
  },

  // 配对相关
  onBlePairingRequest: (
    callback: (details: {
      deviceId: string;
      pairingKind: 'confirm' | 'confirmPin' | 'providePin';
      pin?: string;
    }) => void
  ) => {
    const subscription = (_: any, details: any) => callback(details);
    ipcRenderer.on('bluetooth-pairing-request', subscription);
    return () => {
      ipcRenderer.removeListener('bluetooth-pairing-request', subscription);
    };
  },
  respondToPairing: (response: { confirmed: boolean; pin?: string }) => {
    ipcRenderer.send('bluetooth-pairing-response', response);
  },
});
