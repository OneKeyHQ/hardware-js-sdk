import { screen, app, BrowserWindow, session } from 'electron';
import path from 'path';
import isDevelopment from 'electron-is-dev';
import { format as formatUrl } from 'url';
import initProcess from './process';

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

const APP_NAME = 'OneKey Example';
app.name = APP_NAME;
let mainWindow: BrowserWindow | null;

let isAppReady = false;

(global as any).resourcesPath = isDevelopment
  ? path.join(__dirname, '../public')
  : path.join(process.resourcesPath, 'app');
const staticPath = isDevelopment
  ? path.join(__dirname, '../public')
  : path.join((global as any).resourcesPath, 'public');

const sdkConnectSrc = isDevelopment
  ? `file://${path.join(staticPath, 'js-sdk/')}`
  : path.join('public', 'js-sdk/');

function initChildProcess() {
  return initProcess({ isDevelopment });
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function quitOrMinimizeApp(event?: Event) {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (isMac) {
    // **** renderer app will reload after minimize, and keytar not working.
    event?.preventDefault();
    if (!mainWindow?.isDestroyed()) {
      mainWindow?.hide();
    }
    // ****
    // app.quit();
  } else {
    app.quit();
  }
}

function createMainWindow() {
  const display = screen.getPrimaryDisplay();
  const dimensions = display.workAreaSize;
  const ratio = 16 / 9;

  const browserWindow = new BrowserWindow({
    title: APP_NAME,
    titleBarStyle: isWin ? 'default' : 'hidden',
    trafficLightPosition: { x: 20, y: 12 },
    autoHideMenuBar: true,
    frame: true,
    resizable: true,
    width: Math.min(1920, dimensions.width),
    height: Math.min(1920 / ratio, dimensions.height),
    webPreferences: {
      spellcheck: false,
      webviewTag: true,
      webSecurity: !isDevelopment,
      nativeWindowOpen: true,
      allowRunningInsecureContent: isDevelopment,
      // webview injected js needs isolation=false, because property can not be exposeInMainWorld() when isolation enabled.
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  if (isDevelopment) {
    browserWindow.webContents.openDevTools();
  }

  browserWindow.webContents.on('did-finish-load', () => {
    console.log('browserWindow >>>> did-finish-load');
    browserWindow.webContents.send('SET_ONEKEY_DESKTOP_GLOBALS', {
      resourcesPath: (global as any).resourcesPath,
      staticPath: `file://${staticPath}`,
      sdkConnectSrc,
    });
  });

  const src = isDevelopment
    ? 'http://localhost:19006/'
    : formatUrl({
        pathname: 'index.html',
        protocol: 'file',
        slashes: true,
      });

  browserWindow.loadURL(src);

  browserWindow.on('closed', () => {
    mainWindow = null;
    isAppReady = false;
    console.log('set isAppReady on browserWindow closed', isAppReady);
  });

  browserWindow.webContents.on('devtools-opened', () => {
    browserWindow.focus();
    setImmediate(() => {
      browserWindow.focus();
    });
  });

  // dom-ready is fired after ipcMain:app/ready
  browserWindow.webContents.on('dom-ready', () => {
    isAppReady = true;
    console.log('set isAppReady on browserWindow dom-ready', isAppReady);
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

  if (!isDevelopment) {
    const PROTOCOL = 'file';
    session.defaultSession.protocol.interceptFileProtocol(PROTOCOL, (request, callback) => {
      const isJsSdkFile = request.url.indexOf('/public/js-sdk') > -1;
      const isIFrameHtml = request.url.indexOf('/public/js-sdk/iframe.html') > -1;

      // resolve iframe path
      if (isJsSdkFile && isIFrameHtml) {
        callback({
          path: path.join(__dirname, '..', 'public', 'js-sdk', 'iframe.html'),
        });
        return;
      }

      // resolve jssdk path
      if (isJsSdkFile) {
        const url = request.url.substr(PROTOCOL.length + 1);
        callback(path.join(__dirname, '..', url));
        return;
      }

      // resolve main app path
      let url = request.url.substr(PROTOCOL.length + 1);
      url = path.join(__dirname, '..', 'web-build', url);
      callback(url);
    });

    browserWindow.webContents.on('did-fail-load', (_, __, ___, validatedURL) => {
      const redirectPath = validatedURL.replace(`${PROTOCOL}://`, '');
      if (validatedURL.startsWith(PROTOCOL) && !redirectPath.includes('.')) {
        browserWindow.loadURL(src);
      }
    });
  }

  // @ts-expect-error
  browserWindow.on('close', (event: Event) => {
    // hide() instead of close() on MAC
    if (isMac) {
      event.preventDefault();
      if (!browserWindow.isDestroyed()) {
        browserWindow.blur();
        browserWindow.hide(); // hide window only
        // browserWindow.minimize(); // hide window and minimize to Docker
      }
    }
  });

  return browserWindow;
}

const singleInstance = app.requestSingleInstanceLock();

if (!singleInstance && !process.mas) {
  quitOrMinimizeApp();
} else {
  app.on('second-instance', (e, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      showMainWindow();
    }
  });

  app.name = APP_NAME;
  app.on('ready', async () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
    initChildProcess();
    showMainWindow();
  });
}

// wuit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q
app.on('window-all-closed', (event: Event) => {
  quitOrMinimizeApp(event);
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
  showMainWindow();
});

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow?.removeAllListeners();
    mainWindow?.removeAllListeners('close');
    mainWindow?.close();
  }
});
