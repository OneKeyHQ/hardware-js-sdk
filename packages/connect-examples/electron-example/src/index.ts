import { BrowserWindow, app, ipcMain, screen, session, shell } from 'electron';
import path from 'path';
import isDevelopment from 'electron-is-dev';
import { format as formatUrl } from 'url';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { exec } from 'child_process';
import { initNobleBleSupport } from '@onekeyfe/hd-transport-electron';

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
      webSecurity: !isDevelopment,
      // @ts-expect-error
      nativeWindowOpen: true,
      allowRunningInsecureContent: isDevelopment,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  if (isDevelopment) {
    browserWindow.webContents.openDevTools();
  }

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

  // 记录已授权的设备
  browserWindow.webContents.session.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) => {
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

    // 阻止默认行为，以便我们可以自动选择设备
    // 这是 Electron 的优势：不像浏览器必须显示弹窗，桌面应用可以自动化处理
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

  ipcMain.on(ipcMessageKeys.APP_RESTART, () => {
    browserWindow?.reload();
  });

  return browserWindow;
}

const singleInstance = app.requestSingleInstanceLock();

if (!singleInstance && !process.mas) {
  quitOrMinimizeApp();
} else {
  app.on('second-instance', (_event, _argv) => {
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

    try {
      log.info('Initializing Noble BLE support...');
      initNobleBleSupport(mainWindow.webContents);
      log.info('Noble BLE support initialized successfully.');
    } catch (e) {
      log.error('Failed to initialize Noble BLE support:', e);
    }

    showMainWindow();
    console.log('日志文件位置:', log.transports.file.getFile().path);
  });
}

ipcMain.on(ipcMessageKeys.UPDATE_RESTART, () => {
  log.info('App Quit And Install');
  autoUpdater.quitAndInstall();
});

// Simplified Bluetooth System API Implementation
class BluetoothSystemManager {
  openBluetoothSettings(): void {
    try {
      if (process.platform === 'darwin') {
        exec('open "/System/Library/PreferencePanes/Bluetooth.prefPane"');
      } else if (process.platform === 'win32') {
        shell.openExternal('ms-settings:bluetooth');
      } else {
        log.warn('Opening Bluetooth settings not supported on this platform');
      }
    } catch (error) {
      log.error('Failed to open Bluetooth settings:', error);
    }
  }

  openPrivacySettings(): void {
    try {
      if (process.platform === 'darwin') {
        exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth"');
      } else if (process.platform === 'win32') {
        shell.openExternal('ms-settings:privacy-bluetooth');
      } else {
        log.warn('Opening privacy settings not supported on this platform');
      }
    } catch (error) {
      log.error('Failed to open privacy settings:', error);
    }
  }
}

// Create global instance
const bluetoothManager = new BluetoothSystemManager();

// Register simplified IPC handlers for Bluetooth system API
ipcMain.handle('bluetooth-open-bluetooth-settings', () => {
  bluetoothManager.openBluetoothSettings();
});

ipcMain.handle('bluetooth-open-privacy-settings', () => {
  bluetoothManager.openPrivacySettings();
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

// quit when all windows are closed, except on macOS. There, it's common
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
