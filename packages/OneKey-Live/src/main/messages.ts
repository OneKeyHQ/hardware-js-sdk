import { ipcMain } from 'electron';
import { createDeferred, Deferred } from '@onekeyfe/hd-shared';
import type { BrowserWindow } from 'electron';
import { ISendMessage, IReceiveMessage } from '../types';

let mainWindow: BrowserWindow;
function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

const MagicId = 0;
let messageId = MagicId;

const getMessageId = () => {
  messageId += 1;
  return messageId;
};

const promiseMap: Record<number, Deferred<any>> = {};

async function postMessage(params?: any) {
  console.log('[postMessage - call]: ', JSON.stringify(params));
  const promise = createDeferred<IReceiveMessage, number>();
  const id = getMessageId();
  promise.id = id;

  mainWindow.show();
  setImmediate(() => mainWindow.focus());
  mainWindow.webContents.send('hardware-sdk', {
    id,
    messageType: 'Send',
    payload: { ...params },
  } as ISendMessage);
  promiseMap[id] = promise;

  const response = await promise.promise;
  console.log('[postMessage - receive]: ', JSON.stringify(response));
  return response;
}

function listenRendererMessages() {
  ipcMain.handle('hardware-sdk', (_, message: IReceiveMessage) => {
    if (message.messageType !== 'Receive') return;

    if (message.id) {
      const promise = promiseMap[message.id];
      promise.resolve(message);
    }

    return { success: true, type: 'receive invoke message' };
  });
}

export default {};

export { setMainWindow, postMessage, listenRendererMessages };
