/*
 * Electron BLE bridge helper
 * Running in Main process only. At runtime it dynamically requires 'electron',
 * so projects that don't use Electron will tree-shake this file out and won't bundle electron.
 */

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment, import/no-extraneous-dependencies, global-require, import/no-unresolved */

import { isOnekeyDevice, EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import type { WebContents, IpcMainEvent, Event } from 'electron';

// 导出所有类型定义
export * from './types';

// 内部使用的接口定义
interface BluetoothDevice {
  deviceId: string;
  deviceName: string;
}

interface BluetoothPairingDetails {
  deviceId: string;
  pairingKind: 'confirm' | 'confirmPin' | 'providePin';
  pin?: string;
}

type BluetoothPairingResponse = {
  confirmed: boolean;
  pin?: string;
};

export function initElectronBleBridge(webContents: WebContents) {
  // @ts-ignore – electron is only available at runtime within an Electron app
  const electron = require('electron');
  const { ipcMain } = electron;

  const { session } = webContents;

  let selectBluetoothCallback: ((deviceId: string) => void) | null = null;
  let bluetoothPinCallback: ((response: BluetoothPairingResponse) => void) | null = null;

  // 1️⃣ 设备选择事件
  webContents.on(
    'select-bluetooth-device',
    (event: Event, deviceList: BluetoothDevice[], callback: (deviceId: string) => void) => {
      event.preventDefault();

      console.log('[Main] select-bluetooth-device event triggered');
      console.log('[Main] Raw device list:', deviceList);

      // 保存回调以供后续使用
      selectBluetoothCallback = callback;

      // 如果设备列表为空，等待下一次事件
      if (!deviceList.length) {
        console.log('[Main] Empty device list, waiting for more devices...');
        return;
      }

      // 过滤 OneKey 设备并发送给渲染进程
      const filteredDevices = deviceList
        .filter(d => isOnekeyDevice(d.deviceName))
        .map(d => ({ id: d.deviceId, name: d.deviceName }));

      if (filteredDevices.length > 0) {
        console.log('[Main] Found OneKey devices:', filteredDevices);
        // 持续发送新发现的设备
        webContents.send(EOneKeyBleMessageKeys.BLE_SELECT, filteredDevices);
      } else {
        console.log('[Main] No OneKey devices in this batch, continue scanning...');
      }
    }
  );

  // 渲染进程返回选择结果
  ipcMain.on(EOneKeyBleMessageKeys.BLE_SELECT_RESULT, (_event: IpcMainEvent, deviceId?: string) => {
    console.log('[Main] Received ble-select-result:', deviceId);
    if (selectBluetoothCallback) {
      selectBluetoothCallback(deviceId || '');
      selectBluetoothCallback = null;
    }
  });

  // 允许用户取消
  ipcMain.on(EOneKeyBleMessageKeys.BLE_CANCEL_REQUEST, () => {
    console.log('[Main] Received cancel-bluetooth-request');
    if (selectBluetoothCallback) {
      selectBluetoothCallback('');
      selectBluetoothCallback = null;
    }
  });

  // 处理停止扫描请求
  ipcMain.on(EOneKeyBleMessageKeys.BLE_STOP_SCAN, () => {
    console.log('[Main] Received stop BLE scan request');
    if (selectBluetoothCallback) {
      selectBluetoothCallback('');
      selectBluetoothCallback = null;
    }
  });

  // 2️⃣ PIN / Confirm 处理
  session.setBluetoothPairingHandler(
    (details: BluetoothPairingDetails, callback: (response: BluetoothPairingResponse) => void) => {
      console.log('[Main] Bluetooth pairing request:', details);
      bluetoothPinCallback = callback;
      webContents.send(EOneKeyBleMessageKeys.BLE_PAIRING_REQUEST, details);
    }
  );

  ipcMain.on(
    EOneKeyBleMessageKeys.BLE_PAIRING_RESPONSE,
    (_event: IpcMainEvent, response: BluetoothPairingResponse) => {
      console.log('[Main] Received pairing response:', response);
      if (bluetoothPinCallback) {
        bluetoothPinCallback(response);
      }
    }
  );
}
