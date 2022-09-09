import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type HardwareChannel = 'hardware-sdk';

contextBridge.exposeInMainWorld('hardwareSDK', {
  ipcRenderer: {
    sendMessage(channel: HardwareChannel, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: HardwareChannel, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: HardwareChannel, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    async invoke(channel: HardwareChannel, args: unknown[]) {
      const result = await ipcRenderer.invoke(channel, args);
      console.log('preload get invoke result: ', result);
      return result;
    },
  },
});
