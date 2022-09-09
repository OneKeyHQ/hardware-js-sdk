/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import isDev from 'electron-is-dev';
import MenuBuilder from './menu';
import { resolveHtmlPath, delay } from './util';
import Proxy from './proxy';
import { setMainWindow } from './messages';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

export const getMainWindow = () => mainWindow;

// set deep link protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('onekeylive', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('onekeylive');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Deep linking for when the app is already running (Windows, Linux)
      if (process.platform === 'win32' || process.platform === 'linux') {
        const uri = commandLine.filter((arg) => arg.startsWith('onekey://'));

        if (uri.length) {
          if ('send' in mainWindow?.webContents) {
            mainWindow?.webContents.send('deep-linking', uri[0]);
          }
        }
      }
    }
  });
}

export const getMainWindowAsync: (maxTries?: number) => Promise<BrowserWindow> = async (
  maxTries = 5
) => {
  if (maxTries <= 0) {
    throw new Error('could not get the mainWindow');
  }

  if (!mainWindow) {
    await delay(2000);
    return getMainWindowAsync(maxTries - 1);
  }

  return mainWindow;
};

app.on('will-finish-launching', () => {
  // macOS deepLink
  app.on('open-url', (event, url) => {
    console.log('Apple DeepLink: ', url);
    event.preventDefault();
    getMainWindowAsync()
      .then((w) => {
        if (w) {
          show(w);
          if ('send' in w.webContents) {
            w.webContents.send('deep-linking', url);
          }
        }
      })
      .catch((err) => console.log(err));
  });
});

function init() {
  Proxy.createProxy();
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => path.join(RESOURCES_PATH, ...paths);

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      // webSecurity: false,
      sandbox: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (mainWindow) {
    setMainWindow(mainWindow);
  }

  // Configuring Request Headers for OneKey Bridge
  if (!isDev) {
    const filter = {
      urls: ['http://127.0.0.1:21320/*', 'http://localhost:21320/*'],
    };

    const origin = 'https://jssdk.onekey.so';
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Origin: origin,
        },
      });
    });
  }

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    init();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

function show(win: BrowserWindow) {
  win.show();
  setImmediate(() => win.focus());
}
