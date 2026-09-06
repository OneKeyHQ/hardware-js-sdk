import { TREZOR_BLE_CHANNELS } from './constants';
import { NobleBleHandler } from './NobleBleHandler';

import type { NobleBleHandlerOptions } from './NobleBleHandler';

/* eslint-disable @typescript-eslint/no-explicit-any */

export { NobleBleHandler } from './NobleBleHandler';
export type {
  NobleBleHandlerOptions,
  NobleLike,
  NoblePeripheralLike,
  NobleCharacteristicLike,
} from './NobleBleHandler';
export { TREZOR_BLE_CHANNELS } from './constants';
export type { TrezorBleApi, TrezorBleAvailability, TrezorBleDeviceInfo } from './types/desktop-api';

/** Minimal slice of Electron's `WebContents` we use (kept duck-typed so we
 * don't take a hard dep on `electron`). */
export interface WebContentsLike {
  send(channel: string, ...args: unknown[]): void;
  on?(event: string, listener: (...args: any[]) => void): void;
}

/** Minimal slice of Electron's `ipcMain` we use. */
export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, ...args: any[]) => Promise<unknown> | unknown
  ): void;
  removeHandler(channel: string): void;
}

export interface InitTrezorBleSupportOptions extends NobleBleHandlerOptions {
  /** Inject your own `ipcMain` (defaults to `require('electron').ipcMain`). */
  ipcMain?: IpcMainLike;
}

export interface TrezorBleSupportHandle {
  handler: NobleBleHandler;
  dispose(): Promise<void>;
  disposeForAppQuit(releaseNoble?: (instance: { stop?(): void }) => void): Promise<void>;
}

const DEFAULT_IPC_MAIN: () => IpcMainLike = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ipcMain } = require('electron') as { ipcMain: IpcMainLike };
  return ipcMain;
};

/**
 * Wire a `NobleBleHandler` to Electron's IPC so the renderer can drive BLE
 * via `window.desktopApi.trezorBle`. Call once from the main process after
 * `BrowserWindow` is ready.
 *
 * Call dispose() when retiring a renderer and disposeForAppQuit() before Node teardown.
 */
export function initTrezorBleSupport(
  webContents: WebContentsLike,
  options: InitTrezorBleSupportOptions = {}
): TrezorBleSupportHandle {
  const ipcMain = options.ipcMain ?? DEFAULT_IPC_MAIN();
  const handler = new NobleBleHandler(options);
  let disposed = false;

  handler.setNotificationListener((id, hexData) => {
    webContents.send(TREZOR_BLE_CHANNELS.notification, id, hexData);
  });
  handler.setDisconnectedListener(id => {
    webContents.send(TREZOR_BLE_CHANNELS.disconnected, id);
  });

  const handle = <T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void => {
    ipcMain.handle(channel, async (_event, ...args) => {
      if (disposed) throw new Error('Trezor BLE is shutting down');
      return fn(...args);
    });
  };

  handle(TREZOR_BLE_CHANNELS.scan, (options?: { serviceUuids?: string[]; durationMs?: number }) =>
    handler.scan(options)
  );
  handle(TREZOR_BLE_CHANNELS.stopScan, () => handler.stopScan());
  handle(TREZOR_BLE_CHANNELS.connect, (id: string) => handler.connect(id));
  handle(TREZOR_BLE_CHANNELS.disconnect, (id: string) => handler.disconnect(id));
  handle(TREZOR_BLE_CHANNELS.write, (id: string, hexData: string) => handler.write(id, hexData));
  handle(TREZOR_BLE_CHANNELS.subscribe, (id: string) => handler.subscribe(id));
  handle(TREZOR_BLE_CHANNELS.unsubscribe, (id: string) => handler.unsubscribe(id));
  handle(TREZOR_BLE_CHANNELS.availability, () => handler.checkAvailability());
  handle(TREZOR_BLE_CHANNELS.getDevice, (id: string) => handler.getDevice(id));
  handle(TREZOR_BLE_CHANNELS.readRssi, (id: string) => handler.readRssi(id));
  handle(TREZOR_BLE_CHANNELS.cancelPairing, () => handler.cancelPairing());

  const removeHandlers = () => {
    if (disposed) return;
    disposed = true;
    for (const channel of Object.values(TREZOR_BLE_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };

  return {
    handler,
    dispose: () => {
      removeHandlers();
      return handler.dispose();
    },
    disposeForAppQuit: releaseNoble => {
      removeHandlers();
      return handler.disposeForAppQuit(releaseNoble);
    },
  };
}
