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
 * Returns a disposer the caller should invoke on app quit.
 */
// Debug trace channel: same string as `hd-transport-electron`'s
// BLE_TRACE_CHANNEL and the app preload's listener. Entries forwarded here have
// already passed `filterTrezorDebugLogEntry` (sensitive fields redacted), so
// they are safe to surface in the renderer DevTools console.
const BLE_TRACE_CHANNEL = '$onekey-ble-trace';

export function initTrezorBleSupport(
  webContents: WebContentsLike,
  options: InitTrezorBleSupportOptions = {}
): TrezorBleSupportHandle {
  const ipcMain = options.ipcMain ?? DEFAULT_IPC_MAIN();
  const baseLogger = options.logger;
  const handler = new NobleBleHandler({
    ...options,
    logger: entry => {
      baseLogger?.(entry);
      try {
        // Broadcast to every webContents, not the one captured at init: the
        // preload's console printer runs in the main window, the tray and
        // embedded webviews, and the console a developer watches is not
        // necessarily the init-time `webContents`.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { webContents: electronWebContents } = require('electron') as {
          webContents: {
            getAllWebContents(): Array<{
              isDestroyed(): boolean;
              send(channel: string, ...args: unknown[]): void;
            }>;
          };
        };
        const payload = {
          src: 'trezor-ble',
          ts: Date.now(),
          event: entry.event,
          data: entry.data,
        };
        for (const wc of electronWebContents.getAllWebContents()) {
          if (!wc.isDestroyed()) wc.send(BLE_TRACE_CHANNEL, payload);
        }
      } catch {
        // Tracing must never break the BLE flow.
      }
    },
  });

  handler.setNotificationListener((id, hexData) => {
    webContents.send(TREZOR_BLE_CHANNELS.notification, id, hexData);
  });
  handler.setDisconnectedListener(id => {
    webContents.send(TREZOR_BLE_CHANNELS.disconnected, id);
  });

  const handle = <T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void => {
    ipcMain.handle(channel, async (_event, ...args) => fn(...args));
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

  return {
    handler,
    dispose: async () => {
      for (const channel of Object.values(TREZOR_BLE_CHANNELS)) {
        // Only request/response channels were registered with `handle()`; the
        // two push channels are unregistered noops here, which is fine.
        ipcMain.removeHandler(channel);
      }
      await handler.dispose();
    },
  };
}
