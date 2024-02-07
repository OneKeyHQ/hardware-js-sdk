/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/require-await */
import { ipcRenderer, contextBridge } from 'electron';

console.log('=======>>>>> run preload');

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
  console.log('======>>>>> set Onekey Desktop Globals', globals);

  // for DesktopWebView:
  //    const { preloadJsUrl } = window.ONEKEY_DESKTOP_GLOBALS;
  window.ONEKEY_DESKTOP_GLOBALS = globals;
  contextBridge.exposeInMainWorld('ONEKEY_DESKTOP_GLOBALS', globals);

  console.log('=====>>>>> window.ONEKEY_DESKTOP_GLOBALS:', window.ONEKEY_DESKTOP_GLOBALS);
});

const desktopApi = {
  reloadBridgeProcess: () => {
    ipcRenderer.send('app/reloadBridgeProcess');
  },
};

window.desktopApi = desktopApi;
// contextBridge.exposeInMainWorld('desktopApi', desktopApi);
