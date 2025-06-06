/*
 * Electron BLE bridge helper
 * Running in Main process only. At runtime it dynamically requires 'electron',
 * so projects that don't use Electron will tree-shake this file out and won't bundle electron.
 */

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment, import/no-extraneous-dependencies, global-require, import/no-unresolved */

import { isOnekeyDevice, EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';
import type { WebContents, IpcMainEvent, Event } from 'electron';

// Export all type definitions
export * from './types';

// Internal interface definitions
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

  // @ts-ignore – electron-log is only available at runtime within an Electron app
  const logger = require('electron-log');

  const { session } = webContents;

  let selectBluetoothCallback: ((deviceId: string) => void) | null = null;
  let bluetoothPairingCallback: ((response: BluetoothPairingResponse) => void) | null = null;
  let preSelectedDeviceId: string | null = null;

  // Track last logged device list to avoid duplicate logs
  let lastLoggedDeviceList = '';

  // Helper function to log device list only if changed
  const logDeviceListIfChanged = (deviceList: BluetoothDevice[]): boolean => {
    // Sort devices by deviceId to ensure consistent comparison regardless of order
    const sortedDevices = [...deviceList].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
    const deviceListString = JSON.stringify(
      sortedDevices.map(d => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
      }))
    );

    // Only log if the device list has changed
    if (deviceListString !== lastLoggedDeviceList) {
      logger.info('[Main] Raw device list:', deviceList);
      lastLoggedDeviceList = deviceListString;
      return true; // Logged
    }

    return false; // Not logged (duplicate)
  };

  // 1️⃣ Device selection events
  webContents.on(
    'select-bluetooth-device',
    (event: Event, deviceList: BluetoothDevice[], callback: (deviceId: string) => void) => {
      event.preventDefault();

      logger.info('[Main] select-bluetooth-device event triggered');

      // Use helper function to log device list only if changed
      const deviceListChanged = logDeviceListIfChanged(deviceList);

      if (!deviceListChanged) {
        // If device list hasn't changed, just log a simple message
        logger.info('[Main] Device list unchanged, continuing...');
      }

      logger.info('[Main] Pre-selected device:', preSelectedDeviceId);

      // Save callback for later use
      selectBluetoothCallback = callback;

      // If device list is empty, wait for next event
      if (!deviceList.length) {
        logger.info('[Main] Empty device list, waiting for more devices...');
        return;
      }

      // Filter OneKey devices and send to renderer process
      const filteredDevices = deviceList
        .filter(d => isOnekeyDevice(d.deviceName))
        .map(d => ({ id: d.deviceId, name: d.deviceName }));

      if (filteredDevices.length > 0) {
        // Only log found devices if the device list actually changed
        if (deviceListChanged) {
          logger.info('[Main] Found OneKey devices:', filteredDevices);
        }

        // If there's a pre-selected device, select it directly
        if (preSelectedDeviceId) {
          logger.info('[Main] Set Pre-selected device:', preSelectedDeviceId);
          const targetDevice = filteredDevices.find(d => d.id === preSelectedDeviceId);
          if (targetDevice) {
            logger.info('[Main] Found pre-selected device:', targetDevice);
            callback(targetDevice.id);
            selectBluetoothCallback = null;
            return;
          }
        }

        // Continuously send newly discovered devices
        webContents.send(EOneKeyBleMessageKeys.BLE_SELECT, filteredDevices);
      } else if (deviceListChanged) {
        logger.info('[Main] No OneKey devices in this batch, continue scanning...');
      }
    }
  );

  // Device pre-selection related
  ipcMain.on(EOneKeyBleMessageKeys.BLE_PRE_SELECT, (_event: IpcMainEvent, deviceId: string) => {
    logger.info('[Main] Pre-selecting device:', deviceId);
    preSelectedDeviceId = deviceId;
    // Reset device list tracking when pre-selecting
    lastLoggedDeviceList = '';
  });

  ipcMain.on(EOneKeyBleMessageKeys.BLE_CLEAR_PRE_SELECT, () => {
    logger.info('[Main] Clearing pre-selected device');
    preSelectedDeviceId = null;
    // Reset device list tracking when clearing pre-selection
    lastLoggedDeviceList = '';
  });

  // Renderer process returns selection result
  ipcMain.on(EOneKeyBleMessageKeys.BLE_SELECT_RESULT, (_event: IpcMainEvent, deviceId?: string) => {
    logger.info('[Main] Received ble-select-result:', deviceId);
    if (selectBluetoothCallback) {
      selectBluetoothCallback(deviceId || '');
      selectBluetoothCallback = null;
    }
  });

  // Allow user to cancel
  ipcMain.on(EOneKeyBleMessageKeys.BLE_CANCEL_REQUEST, () => {
    logger.info('[Main] Received cancel-bluetooth-request');
    if (selectBluetoothCallback) {
      selectBluetoothCallback('');
      selectBluetoothCallback = null;
    }
  });

  // Handle stop scan requests
  ipcMain.on(EOneKeyBleMessageKeys.BLE_STOP_SCAN, () => {
    logger.info('[Main] Received stop BLE scan request');
    if (selectBluetoothCallback) {
      selectBluetoothCallback('');
      selectBluetoothCallback = null;
    }
  });

  // 2️⃣ PIN / Confirm handling
  session.setBluetoothPairingHandler(
    (details: BluetoothPairingDetails, callback: (response: BluetoothPairingResponse) => void) => {
      logger.info('[Main] Bluetooth pairing request received:', details);
      logger.info('[Main] Pairing device ID:', details.deviceId);
      logger.info('[Main] Pairing type:', details.pairingKind);
      bluetoothPairingCallback = callback;
      webContents.send(EOneKeyBleMessageKeys.BLE_PAIRING_REQUEST, details);
    }
  );
  logger.info('[Main] Bluetooth pairing handler registered');

  // 3️⃣ Device disconnect handling
  // Note: Electron doesn't provide a direct bluetooth-device-disconnected event
  // Device disconnection should be handled at the Web Bluetooth API level in the renderer process

  ipcMain.on(
    EOneKeyBleMessageKeys.BLE_PAIRING_RESPONSE,
    (_event: IpcMainEvent, response: BluetoothPairingResponse) => {
      logger.info('[Main] Received pairing response:', response);
      if (bluetoothPairingCallback) {
        bluetoothPairingCallback(response);
      }
    }
  );
}
