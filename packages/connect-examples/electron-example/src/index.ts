import electron, { screen, app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import initProcess from './process';

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const isDevelopment = process.env.NODE_ENV === 'development';

// see https://cs.chromium.org/chromium/src/net/base/net_error_list.h
const FILE_NOT_FOUND = -6;
const fsStat = promisify(fs.stat);
const scheme = 'example-desktop';
const root = 'app';

const APP_NAME = 'OneKey Example';
app.name = APP_NAME;
let mainWindow: BrowserWindow | null;

(global as any).resourcesPath = isDevelopment
  ? path.join(__dirname, '../public')
  : path.join(process.resourcesPath, 'app');
const staticPath = isDevelopment
  ? path.join(__dirname, '../public')
  : path.join((global as any).resourcesPath, 'public');

const sdkConnectSrc = isDevelopment
  ? `file://${path.join(staticPath, 'js-sdk/')}`
  : path.join('public', 'js-sdk/');

const serve = (rootDirectoryPath: string) => {
  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme,
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);

  const absoluteDirectoryPath = path.resolve(electron.app.getAppPath(), rootDirectoryPath);
  const absoluteAppDirectoryPath = path.resolve(electron.app.getAppPath());

  electron.app.on('ready', () => {
    electron.session.defaultSession.protocol.registerFileProtocol(
      scheme,
      async (request, callback) => {
        let indexPath: string;
        let filePath: string;

        // handler js sdk
        if (request.url.indexOf('public/js-sdk') > -1) {
          indexPath = path.join(absoluteAppDirectoryPath, 'public', 'js-sdk', 'iframe.html');
          filePath = path.join(
            absoluteAppDirectoryPath,
            decodeURIComponent(new URL(request.url).pathname)
          );
        } else {
          indexPath = path.join(absoluteDirectoryPath, 'index.html');
          filePath = path.join(
            absoluteDirectoryPath,
            decodeURIComponent(new URL(request.url).pathname)
          );
        }

        const fileStat = await fsStat(filePath);

        const fileExtension = path.extname(filePath);

        if (fileStat.isFile()) {
          callback({
            path: filePath,
          });
        } else if (!fileExtension) {
          callback({
            path: indexPath,
          });
        } else {
          callback({ error: FILE_NOT_FOUND });
        }
      }
    );
  });
};

if (!isDevelopment) {
  serve(path.join('web-build'));
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function quitOrMinimizeApp(event?: Event) {
  app.quit();
}

const createWindow = () => {
  const display = screen.getPrimaryDisplay();
  const dimensions = display.workAreaSize;
  const ratio = 16 / 9;

  // create the browser window
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      title: APP_NAME,
      titleBarStyle: isWin ? 'default' : 'hidden',
      autoHideMenuBar: true,
      frame: true,
      resizable: true,
      width: Math.min(1920, dimensions.width),
      height: Math.min(1920 / ratio, dimensions.height),
      webPreferences: {
        spellcheck: false,
        webviewTag: true,
        webSecurity: false,
        nativeWindowOpen: true,
        nodeIntegration: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('browserWindow >>>> did-finish-load');
      mainWindow?.webContents.send('SET_ONEKEY_DESKTOP_GLOBALS', {
        resourcesPath: (global as any).resourcesPath,
        staticPath: `file://${staticPath}`,
        sdkConnectSrc,
      });
    });

    const filter = {
      urls: ['http://127.0.0.1:21320/*', 'http://localhost:21320/*'],
    };

    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      const { url } = details;
      if (url.startsWith('http://127.0.0.1:21320/') || url.startsWith('http://localhost:21320/')) {
        // resolve onekey bridge CORS error
        details.requestHeaders.Origin = 'https://jssdk.onekey.so';
      }

      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  }

  mainWindow.show();

  if (isDevelopment) {
    mainWindow.loadURL(`http://localhost:19006`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`${scheme}://${root}`);
  }
};

// this method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs
app.on('ready', () => {
  createWindow();
  initProcess({ isDevelopment });
});

// wuit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q
app.on('window-all-closed', (event: Event) => {
  quitOrMinimizeApp(event);
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
  showMainWindow();
});
