/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer, contextBridge } from 'electron';

export type DesktopAPI = {
  reloadBridgeProcess: () => void;
};
declare global {
  interface Window {
    desktopApi: DesktopAPI;
    INJECT_PATH: string;
  }
}

ipcRenderer.on('SET_ONEKEY_DESKTOP_GLOBALS', (_, globals) => {
  // @ts-expect-error
  window.ONEKEY_DESKTOP_GLOBALS = globals;
  contextBridge.exposeInMainWorld('ONEKEY_DESKTOP_GLOBALS', globals);
});

const desktopApi = {
  reloadBridgeProcess: () => {
    ipcRenderer.send('app/reloadBridgeProcess');
  },
};

window.desktopApi = desktopApi;
// contextBridge.exposeInMainWorld('desktopApi', desktopApi);
