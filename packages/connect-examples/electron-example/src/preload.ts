/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer, contextBridge } from 'electron';
import { off } from 'process';
import { ipcMessageKeys } from './config';

export type DesktopAPI = {
  reloadBridgeProcess: () => void;
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
};

window.desktopApi = desktopApi;
// contextBridge.exposeInMainWorld('desktopApi', desktopApi);
