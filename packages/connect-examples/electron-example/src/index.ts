import { screen, app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import isDevelopment from 'electron-is-dev';
import { format as formatUrl } from 'url';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { initElectronBleBridge } from '@onekeyfe/hd-transport-electron';
import initProcess, { restartBridge } from './process';
import { ipcMessageKeys } from './config';

// Set log level
log.transports.file.level = 'info';
log.transports.console.level = 'info';
autoUpdater.logger = log;

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
      // @ts-expect-error
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
    browserWindow.webContents.send(ipcMessageKeys.INJECT_ONEKEY_DESKTOP_GLOBALS, {
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

  // 记录已授权的设备
  let grantedDeviceThroughPermHandler = null;

  browserWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      log.debug('WebUSB: 权限检查被调用:', {
        permission,
        requestingOrigin,
        details: JSON.stringify(details, null, 2),
      });

      // 允许所有 USB 权限请求
      if (permission === 'usb') {
        return true;
      }
      return false;
    }
  );

  browserWindow.webContents.session.setDevicePermissionHandler(details => {
    log.debug('WebUSB: 设备权限请求被调用:', {
      deviceType: details.deviceType,
      origin: details.origin,
      device: JSON.stringify(details, null, 2),
    });

    // 允许所有 USB 设备请求
    if (details.deviceType === 'usb') {
      log.debug('WebUSB: 记录已授权的设备');
      grantedDeviceThroughPermHandler = details.device;
      return true;
    }
    return false;
  });

  browserWindow.webContents.session.setUSBProtectedClassesHandler(details =>
    details.protectedClasses.filter(
      usbClass =>
        // Exclude classes except for audio classes
        usbClass.indexOf('audio') === -1
    )
  );

  // 添加设备选择处理程序
  browserWindow.webContents.session.on('select-usb-device', (event, details, callback) => {
    log.debug('WebUSB: select-usb-device 事件触发');
    log.debug('WebUSB: 可用设备列表:', JSON.stringify(details.deviceList, null, 2));

    // 阻止默认行为，以便我们可以自定义设备选择
    event.preventDefault();

    // 直接选择第一个设备
    if (details.deviceList && details.deviceList.length > 0) {
      console.debug(`WebUSB: 选择了第一个设备:`, JSON.stringify(details.deviceList[0], null, 2));
      callback(details.deviceList[0].deviceId);
    } else {
      console.debug('WebUSB: 没有设备可选择，返回空');
      callback();
    }
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

    // eslint-disable-next-line @typescript-eslint/naming-convention
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

  initElectronBleBridge(browserWindow.webContents);

  ipcMain.on(ipcMessageKeys.APP_RESTART, () => {
    browserWindow?.reload();
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
  app.on('ready', () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
    initChildProcess();
    showMainWindow();
    console.log('日志文件位置:', log.transports.file.getFile().path);
  });
}

ipcMain.on(ipcMessageKeys.UPDATE_RESTART, () => {
  log.info('App Quit And Install');
  autoUpdater.quitAndInstall();
});

ipcMain.on(ipcMessageKeys.APP_RELOAD_BRIDGE_PROCESS, () => {
  restartBridge();
});

// 配置 GitHub 发布提供者
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'OneKeyHQ',
  repo: 'hardware-js-sdk',
  private: false,
  releaseType: 'release',
});

// 检查更新
app.on('ready', () => {
  autoUpdater.on('update-available', () => {
    log.info('Update available.');
    mainWindow?.webContents?.send(ipcMessageKeys.UPDATE_AVAILABLE);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded.');
    mainWindow?.webContents?.send(ipcMessageKeys.UPDATE_DOWNLOADED);
  });

  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
});

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
