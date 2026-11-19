import { isHardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { THIRD_PARTY_BLE_CHANNELS, THIRD_PARTY_BLE_IPC_ERROR_TYPE } from './constants';
import { NobleBleHandler } from './NobleBleHandler';

import type { ThirdPartyBleIpcErrorResponse } from './constants';
import type { NobleBleHandlerOptions } from './NobleBleHandler';
import type {
  ConnectorSerializedError,
  ElectronBleConnectOptions,
  ElectronBleScanOptions,
} from '@onekeyfe/hwk-adapter-core';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

export interface InitThirdPartyBleSupportOptions extends NobleBleHandlerOptions {
  /** Inject your own `ipcMain` (defaults to `require('electron').ipcMain`). */
  ipcMain?: IpcMainLike;
}

export interface ThirdPartyBleSupportHandle {
  handler: NobleBleHandler;
  dispose(): Promise<void>;
  disposeForAppQuit(releaseNoble?: (instance: { stop?(): void }) => void): Promise<void>;
}

/**
 * Electron IPC keeps only an Error's message; as data, a `createHwkError`'s code and params
 * survive. Only those cross, so the renderer rebuilds exactly what the host threw.
 */
export function createThirdPartyBleIpcErrorResponse(error: unknown): ThirdPartyBleIpcErrorResponse {
  const { message, code, params } = (error ?? {}) as Record<string, unknown>;
  const serialized: ConnectorSerializedError = {
    message: typeof message === 'string' ? message : 'Unknown error',
    // A host error's own code (the app's -99999) must not read as a HardwareErrorCode.
    ...(isHardwareErrorCode(code) ? { code } : {}),
  };
  if (params && typeof params === 'object') {
    try {
      // IPC structured-clones, which throws on values JSON just drops (a nested function).
      serialized.params = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
    } catch {
      // A circular params bag costs only the params.
    }
  }
  return { type: THIRD_PARTY_BLE_IPC_ERROR_TYPE, success: false, error: serialized };
}

/**
 * Handlers registered through this resolve failures as `ThirdPartyBleIpcErrorResponse`.
 * Wrap the `ipcMain` that registers with Electron so inner wrappers still see throws, and
 * pair it with a preload that rethrows `response.error`.
 */
export function withThirdPartyBleIpcErrors(ipcMain: IpcMainLike): IpcMainLike {
  return {
    handle: (channel, listener) => {
      ipcMain.handle(channel, async (event, ...args) => {
        try {
          return await Promise.resolve(listener(event, ...args));
        } catch (error) {
          return createThirdPartyBleIpcErrorResponse(error);
        }
      });
    },
    removeHandler: channel => ipcMain.removeHandler(channel),
  };
}

const DEFAULT_IPC_MAIN: () => IpcMainLike = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ipcMain } = require('electron') as { ipcMain: IpcMainLike };
  return ipcMain;
};

/**
 * Wire a `NobleBleHandler` to Electron IPC once `BrowserWindow` is ready. Call dispose()
 * when retiring a renderer and disposeForAppQuit() before Node teardown.
 */
export function initThirdPartyBleSupport(
  webContents: WebContentsLike,
  options: InitThirdPartyBleSupportOptions = {}
): ThirdPartyBleSupportHandle {
  const ipcMain = options.ipcMain ?? DEFAULT_IPC_MAIN();
  const handler = new NobleBleHandler(options);
  let disposed = false;

  handler.setNotificationListener((id, hexData) => {
    webContents.send(THIRD_PARTY_BLE_CHANNELS.notification, id, hexData);
  });
  handler.setDisconnectedListener(id => {
    webContents.send(THIRD_PARTY_BLE_CHANNELS.disconnected, id);
  });

  const handle = <T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void => {
    ipcMain.handle(channel, async (_event, ...args) => {
      if (disposed) throw new Error('Third-party BLE is shutting down');
      return fn(...args);
    });
  };

  handle(THIRD_PARTY_BLE_CHANNELS.scan, (options?: ElectronBleScanOptions) =>
    handler.scan(options)
  );
  handle(THIRD_PARTY_BLE_CHANNELS.stopScan, (vendor?: string) => handler.stopScan(vendor));
  handle(THIRD_PARTY_BLE_CHANNELS.connect, (id: string, options: ElectronBleConnectOptions) =>
    handler.connect(id, options)
  );
  handle(THIRD_PARTY_BLE_CHANNELS.disconnect, (id: string) => handler.disconnect(id));
  handle(THIRD_PARTY_BLE_CHANNELS.write, (id: string, hexData: string) =>
    handler.write(id, hexData)
  );
  handle(THIRD_PARTY_BLE_CHANNELS.subscribe, (id: string) => handler.subscribe(id));
  handle(THIRD_PARTY_BLE_CHANNELS.unsubscribe, (id: string) => handler.unsubscribe(id));
  handle(THIRD_PARTY_BLE_CHANNELS.availability, () => handler.checkAvailability());
  handle(THIRD_PARTY_BLE_CHANNELS.getDevice, (id: string) => handler.getDevice(id));
  handle(THIRD_PARTY_BLE_CHANNELS.readRssi, (id: string) => handler.readRssi(id));
  handle(THIRD_PARTY_BLE_CHANNELS.cancelPairing, (options?: { vendor: string; id?: string }) =>
    handler.cancelPairing(options)
  );

  const removeHandlers = () => {
    if (disposed) return;
    disposed = true;
    for (const channel of Object.values(THIRD_PARTY_BLE_CHANNELS)) {
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
