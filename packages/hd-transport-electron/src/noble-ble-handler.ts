/*
 * Noble BLE Handler for Electron Main Process
 * Handles BLE communication using Noble library
 */

/* eslint-disable @typescript-eslint/no-var-requires, import/no-extraneous-dependencies */

import {
  isOnekeyDevice,
  EOneKeyBleMessageKeys,
  ONEKEY_SERVICE_UUID,
  ONEKEY_WRITE_CHARACTERISTIC_UUID,
  ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
} from '@onekeyfe/hd-shared';
import type { WebContents, IpcMainInvokeEvent } from 'electron';
import type { Peripheral, Service, Characteristic } from '@abandonware/noble';
import type { NobleModule, Logger, DeviceInfo, CharacteristicPair } from './types/noble-extended';
import { safeLog } from './types/noble-extended';

// Noble will be dynamically imported to avoid bundling issues
let noble: NobleModule | null = null;
let logger: Logger | null = null;

// Device cache and connection state
const discoveredDevices = new Map<string, Peripheral>();
const connectedDevices = new Map<string, Peripheral>();
const deviceCharacteristics = new Map<string, CharacteristicPair>();
const notificationCallbacks = new Map<string, (data: string) => void>();

// Service UUIDs to scan for - using constants from hd-shared
const ONEKEY_SERVICE_UUIDS = [ONEKEY_SERVICE_UUID];

// Initialize Noble
async function initializeNoble(): Promise<void> {
  if (noble) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    noble = require('@abandonware/noble') as NobleModule;
    logger?.info('[NobleBLE] Noble library loaded');

    // Wait for Bluetooth to be ready
    await new Promise<void>((resolve, reject) => {
      if (!noble) {
        reject(new Error('Noble not initialized'));
        return;
      }

      if (noble.state === 'poweredOn') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Bluetooth initialization timeout'));
      }, 10000);

      const onStateChange = (state: string) => {
        logger?.info('[NobleBLE] Bluetooth state:', state);
        if (state === 'poweredOn') {
          clearTimeout(timeout);
          if (noble) {
            noble.removeListener('stateChange', onStateChange);
          }
          resolve();
        } else if (state === 'poweredOff' || state === 'unsupported') {
          clearTimeout(timeout);
          if (noble) {
            noble.removeListener('stateChange', onStateChange);
          }
          reject(new Error(`Bluetooth is ${state}`));
        }
      };

      noble.on('stateChange', onStateChange);
    });

    // Set up device discovery
    noble.on('discover', (peripheral: Peripheral) => {
      handleDeviceDiscovered(peripheral);
    });

    logger?.info('[NobleBLE] Noble initialized successfully');
  } catch (error) {
    logger?.error('[NobleBLE] Failed to initialize Noble:', error);
    throw error;
  }
}

// Handle discovered device
function handleDeviceDiscovered(peripheral: Peripheral): void {
  const deviceName = peripheral.advertisement?.localName || 'Unknown Device';

  // Only process OneKey devices
  if (!isOnekeyDevice(deviceName)) {
    return;
  }

  logger?.info(
    '[NobleBLE] Discovered OneKey device:',
    {
      id: peripheral.id,
      name: deviceName,
      rssi: peripheral.rssi,
      serviceUuids: peripheral.advertisement?.serviceUuids,
    },
    peripheral
  );

  // Cache the device
  discoveredDevices.set(peripheral.id, peripheral);
}

// Enumerate devices
async function enumerateDevices(): Promise<DeviceInfo[]> {
  if (!noble) {
    await initializeNoble();
  }

  if (!noble) {
    throw new Error('Noble not available');
  }

  logger?.info('[NobleBLE] Starting device enumeration');

  // Clear previous discoveries
  discoveredDevices.clear();

  return new Promise((resolve, reject) => {
    const devices: DeviceInfo[] = [];

    if (!noble) {
      reject(new Error('Noble not available'));
      return;
    }

    // Set timeout for scanning
    const timeout = setTimeout(() => {
      if (noble) {
        noble.stopScanning();
      }
      logger?.info('[NobleBLE] Scan completed, found devices:', devices.length);
      resolve(devices);
    }, 5000); // Increased timeout for better discovery

    // Start scanning for OneKey service UUIDs
    noble.startScanning(ONEKEY_SERVICE_UUIDS, false, (error?: Error) => {
      if (error) {
        clearTimeout(timeout);
        logger?.error('[NobleBLE] Failed to start scanning:', error);
        reject(error);
        return;
      }

      logger?.info('[NobleBLE] Scanning started for OneKey devices');

      // Collect discovered devices
      const checkDevices = () => {
        discoveredDevices.forEach((peripheral, id) => {
          const existingDevice = devices.find(d => d.id === id);
          if (!existingDevice) {
            const deviceName = peripheral.advertisement?.localName || 'Unknown Device';
            devices.push({
              id,
              name: deviceName,
              state: peripheral.state || 'disconnected',
            });
          }
        });
      };

      // Check for devices periodically
      const interval = setInterval(checkDevices, 500);

      // Clean up interval when timeout occurs
      setTimeout(() => {
        clearInterval(interval);
      }, 5000);
    });
  });
}

// Stop scanning
async function stopScanning(): Promise<void> {
  if (!noble) return;

  return new Promise<void>(resolve => {
    if (!noble) {
      resolve();
      return;
    }

    noble.stopScanning(() => {
      logger?.info('[NobleBLE] Scanning stopped');
      resolve();
    });
  });
}

// Get device info
function getDevice(deviceId: string): DeviceInfo | null {
  const peripheral = discoveredDevices.get(deviceId);
  if (!peripheral) {
    return null;
  }

  const deviceName = peripheral.advertisement?.localName || 'Unknown Device';

  return {
    id: peripheral.id,
    name: deviceName,
    state: peripheral.state || 'disconnected',
  };
}

// Discover services and characteristics for a connected device
async function discoverServicesAndCharacteristics(
  peripheral: Peripheral
): Promise<CharacteristicPair> {
  return new Promise((resolve, reject) => {
    peripheral.discoverServices(ONEKEY_SERVICE_UUIDS, (error: string, services: Service[]) => {
      if (error) {
        logger?.error('[NobleBLE] Service discovery failed:', error);
        reject(new Error(error));
        return;
      }

      if (!services || services.length === 0) {
        reject(new Error('No OneKey services found'));
        return;
      }

      const service = services[0]; // Use first found service
      logger?.info('[NobleBLE] Found service:', service.uuid);

      // Discover characteristics
      service.discoverCharacteristics(
        [ONEKEY_WRITE_CHARACTERISTIC_UUID, ONEKEY_NOTIFY_CHARACTERISTIC_UUID],
        (error: string, characteristics: Characteristic[]) => {
          if (error) {
            logger?.error('[NobleBLE] Characteristic discovery failed:', error);
            reject(new Error(error));
            return;
          }

          // Log all discovered characteristics for debugging
          logger?.info('[NobleBLE] Discovered characteristics:', characteristics?.length || 0);
          characteristics?.forEach((char, index) => {
            logger?.info(`[NobleBLE] Characteristic ${index}:`, {
              uuid: char.uuid,
              properties: char.properties,
            });
          });

          logger?.info(
            '[NobleBLE] Looking for write UUID:',
            ONEKEY_WRITE_CHARACTERISTIC_UUID.toLowerCase()
          );
          logger?.info(
            '[NobleBLE] Looking for notify UUID:',
            ONEKEY_NOTIFY_CHARACTERISTIC_UUID.toLowerCase()
          );

          let writeCharacteristic: Characteristic | null = null;
          let notifyCharacteristic: Characteristic | null = null;

          // Helper function to normalize UUID for comparison
          const normalizeUuid = (uuid: string): string => {
            // If it's already a short UUID (4 characters), return as is
            if (uuid.length === 4) {
              return uuid.toLowerCase();
            }
            // If it's a full UUID, extract the short part (first 8 characters without hyphens)
            const cleaned = uuid.replace(/-/g, '');
            if (cleaned.length >= 8) {
              return cleaned.substring(4, 8).toLowerCase(); // Extract the service-specific part
            }
            return uuid.toLowerCase();
          };

          const expectedWriteUuid = normalizeUuid(ONEKEY_WRITE_CHARACTERISTIC_UUID);
          const expectedNotifyUuid = normalizeUuid(ONEKEY_NOTIFY_CHARACTERISTIC_UUID);

          logger?.info('[NobleBLE] Normalized expected write UUID:', expectedWriteUuid);
          logger?.info('[NobleBLE] Normalized expected notify UUID:', expectedNotifyUuid);

          for (const characteristic of characteristics) {
            const normalizedCharUuid = normalizeUuid(characteristic.uuid);
            logger?.info(
              '[NobleBLE] Checking characteristic UUID:',
              characteristic.uuid,
              '-> normalized:',
              normalizedCharUuid
            );

            if (normalizedCharUuid === expectedWriteUuid) {
              writeCharacteristic = characteristic;
              logger?.info('[NobleBLE] Found write characteristic');
            } else if (normalizedCharUuid === expectedNotifyUuid) {
              notifyCharacteristic = characteristic;
              logger?.info('[NobleBLE] Found notify characteristic');
            }
          }

          if (!writeCharacteristic || !notifyCharacteristic) {
            logger?.error(
              '[NobleBLE] Missing characteristics - write:',
              !!writeCharacteristic,
              'notify:',
              !!notifyCharacteristic
            );
            reject(new Error('Required characteristics not found'));
            return;
          }

          resolve({ write: writeCharacteristic, notify: notifyCharacteristic });
        }
      );
    });
  });
}

// Connect to device
async function connectDevice(deviceId: string, webContents: WebContents): Promise<void> {
  const peripheral = discoveredDevices.get(deviceId);
  if (!peripheral) {
    throw new Error(`Device ${deviceId} not found`);
  }

  logger?.info('[NobleBLE] Connecting to device:', deviceId);

  // Check if device is already connected
  if (peripheral.state === 'connected') {
    logger?.info('[NobleBLE] Device already connected, skipping connection step');

    // If already connected but not in our connected devices map, add it
    if (!connectedDevices.has(deviceId)) {
      connectedDevices.set(deviceId, peripheral);

      // Set up disconnect listener if not already set
      peripheral.removeAllListeners('disconnect');
      peripheral.on('disconnect', () => {
        logger?.info('[NobleBLE] Device disconnected:', deviceId);
        connectedDevices.delete(deviceId);
        deviceCharacteristics.delete(deviceId);
        notificationCallbacks.delete(deviceId);

        // Send disconnect event to renderer process
        webContents.send(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, {
          id: deviceId,
          name: peripheral.advertisement?.localName || 'Unknown Device',
        });
      });
    }

    // Check if we already have characteristics for this device
    if (deviceCharacteristics.has(deviceId)) {
      logger?.info('[NobleBLE] Device characteristics already available');
      return;
    }

    // Discover services and characteristics
    try {
      const characteristics = await discoverServicesAndCharacteristics(peripheral);
      deviceCharacteristics.set(deviceId, characteristics);
      logger?.info('[NobleBLE] Device ready for communication:', deviceId);
      return;
    } catch (error) {
      logger?.error('[NobleBLE] Service/characteristic discovery failed:', error);
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 15000); // Increased timeout for connection

    peripheral.connect((error: string) => {
      clearTimeout(timeout);

      if (error) {
        logger?.error('[NobleBLE] Connection failed:', error);
        reject(new Error(error));
        return;
      }

      logger?.info('[NobleBLE] Connected to device:', deviceId);
      connectedDevices.set(deviceId, peripheral);

      // Set up disconnect listener
      peripheral.on('disconnect', () => {
        logger?.info('[NobleBLE] Device disconnected:', deviceId);
        connectedDevices.delete(deviceId);
        deviceCharacteristics.delete(deviceId);
        notificationCallbacks.delete(deviceId);

        // Send disconnect event to renderer process
        webContents.send(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, {
          id: deviceId,
          name: peripheral.advertisement?.localName || 'Unknown Device',
        });
      });

      // Discover services and characteristics
      discoverServicesAndCharacteristics(peripheral)
        .then(characteristics => {
          deviceCharacteristics.set(deviceId, characteristics);
          logger?.info('[NobleBLE] Device ready for communication:', deviceId);
          resolve();
        })
        .catch(error => {
          logger?.error('[NobleBLE] Service/characteristic discovery failed:', error);
          // Disconnect on failure
          peripheral.disconnect();
          reject(error);
        });
    });
  });
}

// Disconnect device
async function disconnectDevice(deviceId: string): Promise<void> {
  const peripheral = connectedDevices.get(deviceId);
  if (!peripheral) {
    return;
  }

  return new Promise<void>(resolve => {
    peripheral.disconnect(() => {
      connectedDevices.delete(deviceId);
      deviceCharacteristics.delete(deviceId);
      notificationCallbacks.delete(deviceId);
      logger?.info('[NobleBLE] Device disconnected:', deviceId);
      resolve();
    });
  });
}

// BLE packet size constants (similar to React Native)
const BLE_PACKET_SIZE = 192; // Use Android packet size as default for desktop

// Write data to device with chunking support
async function writeData(deviceId: string, hexData: string): Promise<void> {
  logger?.info('[NobleBLE] writeData called for device:', deviceId, 'data length:', hexData.length);

  const peripheral = connectedDevices.get(deviceId);
  const characteristics = deviceCharacteristics.get(deviceId);

  if (!peripheral || !characteristics) {
    const error = `Device ${deviceId} not connected or characteristics not available`;
    logger?.error('[NobleBLE] writeData failed:', error);
    throw new Error(error);
  }

  const { write: writeCharacteristic } = characteristics;

  // Convert hex string to buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(hexData, 'hex');
    logger?.info('[NobleBLE] Converted hex to buffer:', {
      hexLength: hexData.length,
      bufferLength: buffer.length,
      firstBytes: buffer.slice(0, Math.min(16, buffer.length)).toString('hex'),
    });
  } catch (error) {
    logger?.error('[NobleBLE] Hex conversion failed:', error);
    throw new Error(`Failed to convert hex data: ${error}`);
  }

  logger?.debug('[NobleBLE] Writing data to device:', deviceId, 'total length:', buffer.length);

  // If data is small enough, send directly
  if (buffer.length <= BLE_PACKET_SIZE) {
    logger?.info('[NobleBLE] Sending single packet:', {
      deviceId,
      packetSize: buffer.length,
      data: `${buffer.toString('hex').substring(0, 32)}...`,
    });

    return new Promise((resolve, reject) => {
      writeCharacteristic.write(buffer, true, (error: string) => {
        if (error) {
          logger?.error('[NobleBLE] Single packet write (without response) failed:', error);
          reject(new Error(error));
          return;
        }

        logger?.info('[NobleBLE] Single packet write (without response) successful');
        resolve();
      });
    });
  }

  // Split into chunks for large data
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const chunkSize = Math.min(BLE_PACKET_SIZE, buffer.length - offset);
    const chunk = buffer.subarray(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }

  logger?.debug('[NobleBLE] Splitting data into', chunks.length, 'chunks');

  // Helper function to write a single chunk
  const writeChunk = (chunk: Buffer, chunkIndex: number, totalChunks: number): Promise<void> => {
    safeLog(
      logger,
      'debug',
      `[NobleBLE] Writing chunk ${chunkIndex}/${totalChunks}, size:`,
      chunk.length
    );

    return new Promise<void>((resolve, reject) => {
      writeCharacteristic.write(chunk, false, (error: string) => {
        if (error) {
          safeLog(logger, 'error', `[NobleBLE] Write chunk ${chunkIndex} failed:`, error);
          reject(new Error(error));
          return;
        }

        safeLog(logger, 'debug', `[NobleBLE] Write chunk ${chunkIndex} successful`);
        resolve();
      });
    });
  };

  // Helper function for delay
  const delay = (ms: number): Promise<void> =>
    new Promise<void>(resolve => {
      setTimeout(() => resolve(), ms);
    });

  // Write chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkIndex = i + 1;
    const totalChunks = chunks.length;

    await writeChunk(chunk, chunkIndex, totalChunks);

    // Small delay between chunks to avoid overwhelming the device
    if (i < chunks.length - 1) {
      await delay(10);
    }
  }

  logger?.debug('[NobleBLE] All chunks written successfully');
}

// Subscribe to notifications
async function subscribeNotifications(
  deviceId: string,
  callback: (data: string) => void
): Promise<void> {
  const peripheral = connectedDevices.get(deviceId);
  const characteristics = deviceCharacteristics.get(deviceId);

  if (!peripheral || !characteristics) {
    throw new Error(`Device ${deviceId} not connected or characteristics not available`);
  }

  const { notify: notifyCharacteristic } = characteristics;

  logger?.info('[NobleBLE] Subscribing to notifications for device:', deviceId);

  // Store callback for this device
  notificationCallbacks.set(deviceId, callback);

  return new Promise((resolve, reject) => {
    // Subscribe to notifications
    notifyCharacteristic.subscribe((error: string) => {
      if (error) {
        logger?.error('[NobleBLE] Notification subscription failed:', error);
        reject(new Error(error));
        return;
      }

      logger?.info('[NobleBLE] Notification subscription successful');

      // Set up data handler
      notifyCharacteristic.on('data', (data: Buffer) => {
        try {
          const hexString = data.toString('hex');
          logger?.info('[NobleBLE] Received notification data:', {
            deviceId,
            dataLength: data.length,
            hexLength: hexString.length,
            firstBytes: `${hexString.substring(0, 32)}...`,
          });
          callback(hexString);
        } catch (error) {
          logger?.error('[NobleBLE] Notification data processing error:', error);
        }
      });

      resolve();
    });
  });
}

// Unsubscribe from notifications
async function unsubscribeNotifications(deviceId: string): Promise<void> {
  const peripheral = connectedDevices.get(deviceId);
  const characteristics = deviceCharacteristics.get(deviceId);

  if (!peripheral || !characteristics) {
    return;
  }

  const { notify: notifyCharacteristic } = characteristics;

  logger?.info('[NobleBLE] Unsubscribing from notifications for device:', deviceId);

  return new Promise<void>(resolve => {
    notifyCharacteristic.unsubscribe((error: string) => {
      if (error) {
        logger?.error('[NobleBLE] Notification unsubscription failed:', error);
      } else {
        logger?.info('[NobleBLE] Notification unsubscription successful');
      }

      // Remove all listeners
      notifyCharacteristic.removeAllListeners('data');
      notificationCallbacks.delete(deviceId);
      resolve();
    });
  });
}

// Setup IPC handlers
export function setupNobleBleHandlers(webContents: WebContents): void {
  try {
    // @ts-ignore – electron-log is only available at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    logger = require('electron-log') as Logger;
    // @ts-ignore – electron is only available at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { ipcMain } = require('electron');

    safeLog(logger, 'info', 'Setting up Noble BLE IPC handlers');

    // Handle enumerate request
    ipcMain.handle(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE, async () => {
      try {
        const devices = await enumerateDevices();
        safeLog(logger, 'info', 'Enumeration completed, devices:', devices);
        return devices;
      } catch (error) {
        safeLog(logger, 'error', 'Enumeration failed:', error);
        throw error;
      }
    });

    // Handle stop scan request
    ipcMain.handle(EOneKeyBleMessageKeys.NOBLE_BLE_STOP_SCAN, async () => {
      await stopScanning();
    });

    // Handle get device request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_GET_DEVICE,
      (_event: IpcMainInvokeEvent, deviceId: string) => getDevice(deviceId)
    );

    // Handle connect request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT,
      async (_event: IpcMainInvokeEvent, deviceId: string) => {
        await connectDevice(deviceId, webContents);
      }
    );

    // Handle disconnect request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT,
      async (_event: IpcMainInvokeEvent, deviceId: string) => {
        await disconnectDevice(deviceId);
      }
    );

    // Handle write request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_WRITE,
      async (_event: IpcMainInvokeEvent, deviceId: string, hexData: string) => {
        await writeData(deviceId, hexData);
      }
    );

    // Handle subscribe request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE,
      async (_event: IpcMainInvokeEvent, deviceId: string) => {
        await subscribeNotifications(deviceId, (data: string) => {
          // Send data back to renderer process
          webContents.send(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, deviceId, data);
        });
      }
    );

    // Handle unsubscribe request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE,
      async (_event: IpcMainInvokeEvent, deviceId: string) => {
        await unsubscribeNotifications(deviceId);
      }
    );

    // Cleanup on app quit
    webContents.on('destroyed', () => {
      safeLog(logger, 'info', 'Cleaning up Noble BLE handlers');

      // Disconnect all devices
      connectedDevices.forEach(async (peripheral, deviceId) => {
        await disconnectDevice(deviceId);
      });

      // Stop scanning
      stopScanning();

      // Clear caches
      discoveredDevices.clear();
      connectedDevices.clear();
      deviceCharacteristics.clear();
      notificationCallbacks.clear();
    });

    safeLog(logger, 'info', 'Noble BLE IPC handlers setup completed');
  } catch (error) {
    console.error('[NobleBLE] Failed to setup IPC handlers:', error);
    throw error;
  }
}
