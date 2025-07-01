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
  isHeaderChunk,
} from '@onekeyfe/hd-shared';
import { COMMON_HEADER_SIZE } from '@onekeyfe/hd-transport';
import type { WebContents, IpcMainInvokeEvent } from 'electron';
import type { Peripheral, Service, Characteristic } from '@abandonware/noble';
import type { NobleModule, Logger, DeviceInfo, CharacteristicPair } from './types/noble-extended';
import { safeLog } from './types/noble-extended';

// Noble will be dynamically imported to avoid bundlinpissues
let noble: NobleModule | null = null;
let logger: Logger | null = null;

// Device cache and connection state
const discoveredDevices = new Map<string, Peripheral>();
const connectedDevices = new Map<string, Peripheral>();
const deviceCharacteristics = new Map<string, CharacteristicPair>();
const notificationCallbacks = new Map<string, (data: string) => void>();
const subscribedDevices = new Map<string, boolean>(); // Track subscription status

// Packet reassembly state for each device
interface PacketAssemblyState {
  bufferLength: number;
  buffer: number[];
  packetCount: number;
  messageId?: string; // Add message ID to track concurrent requests
}
const devicePacketStates = new Map<string, PacketAssemblyState>();

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

// Clean up device state - unified function for all cleanup scenarios
function cleanupDeviceState(deviceId: string): void {
  connectedDevices.delete(deviceId);
  deviceCharacteristics.delete(deviceId);
  notificationCallbacks.delete(deviceId);
  devicePacketStates.delete(deviceId);
  subscribedDevices.delete(deviceId);
  logger?.info('[NobleBLE] Device state cleaned up:', deviceId);
}

// Handle device disconnection - unified handler for all disconnect scenarios
function handleDeviceDisconnect(deviceId: string, webContents: WebContents): void {
  logger?.info('[NobleBLE] Device disconnected:', deviceId);

  // Get device info before cleanup
  const peripheral = connectedDevices.get(deviceId);
  const deviceName = peripheral?.advertisement?.localName || 'Unknown Device';

  // Clean up device state
  cleanupDeviceState(deviceId);

  // Send disconnect event to renderer process
  webContents.send(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, {
    id: deviceId,
    name: deviceName,
  });
}

// Set up disconnect listener for a peripheral
function setupDisconnectListener(
  peripheral: Peripheral,
  deviceId: string,
  webContents: WebContents
): void {
  // Remove any existing disconnect listeners to avoid duplicates
  peripheral.removeAllListeners('disconnect');

  // Set up new disconnect listener
  peripheral.on('disconnect', () => {
    handleDeviceDisconnect(deviceId, webContents);
  });
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

          // Log discovered characteristics summary
          logger?.info('[NobleBLE] Discovered characteristics:', {
            count: characteristics?.length || 0,
            uuids: characteristics?.map(c => c.uuid) || [],
          });

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

          for (const characteristic of characteristics) {
            const normalizedCharUuid = normalizeUuid(characteristic.uuid);

            if (normalizedCharUuid === expectedWriteUuid) {
              writeCharacteristic = characteristic;
            } else if (normalizedCharUuid === expectedNotifyUuid) {
              notifyCharacteristic = characteristic;
            }
          }

          logger?.info('[NobleBLE] Characteristic discovery result:', {
            writeFound: !!writeCharacteristic,
            notifyFound: !!notifyCharacteristic,
          });

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
      // Set up unified disconnect listener
      setupDisconnectListener(peripheral, deviceId, webContents);
    }

    // Check if we already have characteristics for this device
    if (deviceCharacteristics.has(deviceId)) {
      logger?.info('[NobleBLE] Device characteristics already available');
      // Clean up existing notification state to avoid conflicts
      const existingCallback = notificationCallbacks.get(deviceId);
      if (existingCallback) {
        logger?.info('[NobleBLE] Cleaning up existing notification state');
        const existingCharacteristics = deviceCharacteristics.get(deviceId);
        if (existingCharacteristics) {
          existingCharacteristics.notify.removeAllListeners('data');
        }
        notificationCallbacks.delete(deviceId);
        devicePacketStates.delete(deviceId);
        subscribedDevices.delete(deviceId);
      }
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

      // Set up unified disconnect listener
      setupDisconnectListener(peripheral, deviceId, webContents);

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
    // Remove disconnect listener to avoid triggering handleDeviceDisconnect
    peripheral.removeAllListeners('disconnect');

    peripheral.disconnect(() => {
      // Clean up device state using unified function
      cleanupDeviceState(deviceId);
      resolve();
    });
  });
}

// BLE packet size constants (similar to React Native)
const BLE_PACKET_SIZE = 192; // Use Android packet size as default for desktop

// Write data to device with chunking support
async function writeData(deviceId: string, hexData: string): Promise<void> {
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
  } catch (error) {
    logger?.error('[NobleBLE] Hex conversion failed:', error);
    throw new Error(`Failed to convert hex data: ${error}`);
  }

  logger?.info('[NobleBLE] Writing data:', {
    deviceId,
    dataLength: buffer.length,
    firstBytes: buffer.subarray(0, 8).toString('hex'),
  });

  // If data is small enough, send directly
  if (buffer.length <= BLE_PACKET_SIZE) {
    return new Promise((resolve, reject) => {
      writeCharacteristic.write(buffer, true, (error: string) => {
        if (error) {
          logger?.error('[NobleBLE] Single packet write failed:', error);
          reject(new Error(error));
          return;
        }
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

  logger?.info('[NobleBLE] Splitting into chunks:', chunks.length);

  // Helper function to write a single chunk
  const writeChunk = (chunk: Buffer, chunkIndex: number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      writeCharacteristic.write(chunk, false, (error: string) => {
        if (error) {
          logger?.error(`[NobleBLE] Chunk ${chunkIndex} write failed:`, error);
          reject(new Error(error));
          return;
        }
        resolve();
      });
    });

  // Helper function for delay
  const delay = (ms: number): Promise<void> =>
    new Promise<void>(resolve => {
      setTimeout(() => resolve(), ms);
    });

  // Write chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkIndex = i + 1;

    await writeChunk(chunk, chunkIndex);

    // Small delay between chunks to avoid overwhelming the device
    if (i < chunks.length - 1) {
      await delay(10);
    }
  }
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

  // Check if already subscribed at the characteristic level
  if (subscribedDevices.get(deviceId)) {
    logger?.info('[NobleBLE] Device already subscribed to characteristic, updating callback only');

    // Just update the callback without re-subscribing
    notificationCallbacks.set(deviceId, callback);

    // Reset packet state for new session
    devicePacketStates.set(deviceId, {
      bufferLength: 0,
      buffer: [],
      packetCount: 0,
      messageId: undefined,
    });

    return Promise.resolve();
  }

  // Clean up any existing listeners before subscribing
  if (notificationCallbacks.has(deviceId)) {
    logger?.info('[NobleBLE] Cleaning up previous notification listeners');
    notifyCharacteristic.removeAllListeners('data');
  }

  // Store callback for this device
  notificationCallbacks.set(deviceId, callback);

  // Reset packet state for new subscription session
  devicePacketStates.set(deviceId, {
    bufferLength: 0,
    buffer: [],
    packetCount: 0,
    messageId: undefined,
  });

  return new Promise((resolve, reject) => {
    // Subscribe to notifications only if not already subscribed
    notifyCharacteristic.subscribe((error: string) => {
      if (error) {
        logger?.error('[NobleBLE] Notification subscription failed:', error);
        reject(new Error(error));
        return;
      }

      logger?.info('[NobleBLE] Notification subscription successful');
      subscribedDevices.set(deviceId, true);

      // Set up data handler with proper packet reassembly
      notifyCharacteristic.on('data', (data: Buffer) => {
        try {
          // Get or initialize packet state for this device
          let packetState = devicePacketStates.get(deviceId);
          if (!packetState) {
            packetState = { bufferLength: 0, buffer: [], packetCount: 0 };
            devicePacketStates.set(deviceId, packetState);
          }

          // Check if this is a header chunk
          if (isHeaderChunk(data)) {
            // Generate message ID for this packet sequence
            const messageId = `${deviceId}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`;

            // Reset packet state for new message
            packetState.bufferLength = data.readInt32BE(5);
            packetState.buffer = [...data.subarray(3)]; // Start with header data (skip first 3 bytes)
            packetState.packetCount = 1; // Reset counter for new message
            packetState.messageId = messageId;
          } else {
            // Check if we have a valid packet state with expected length
            if (packetState.bufferLength === 0) {
              logger?.error('[NobleBLE] Received data chunk without header, ignoring');
              return; // Ignore orphaned data chunks
            }

            // Increment packet counter for data chunks
            packetState.packetCount += 1;

            // Append data chunk to buffer
            packetState.buffer = packetState.buffer.concat([...data]);
          }

          // Check if we have received the complete packet
          if (packetState.buffer.length - COMMON_HEADER_SIZE >= packetState.bufferLength) {
            const completeBuffer = Buffer.from(packetState.buffer);
            const hexString = completeBuffer.toString('hex');

            logger?.info('[NobleBLE] Packet complete:', {
              deviceId,
              packets: packetState.packetCount,
              length: completeBuffer.length,
            });

            // Reset packet state for next message
            packetState.bufferLength = 0;
            packetState.buffer = [];
            packetState.packetCount = 0;

            // Send complete packet to callback
            callback(hexString);
          }
        } catch (error) {
          logger?.error('[NobleBLE] Notification data processing error:', error);
          // Reset packet state on error
          const packetState = devicePacketStates.get(deviceId);
          if (packetState) {
            packetState.bufferLength = 0;
            packetState.buffer = [];
          }
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

      // Remove all listeners and clear subscription status
      notifyCharacteristic.removeAllListeners('data');
      notificationCallbacks.delete(deviceId);
      devicePacketStates.delete(deviceId);
      subscribedDevices.delete(deviceId);
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
      connectedDevices.forEach(async (_peripheral, deviceId) => {
        await disconnectDevice(deviceId);
      });

      // Stop scanning
      stopScanning();

      // Clear all caches using individual clear operations for better cleanup
      discoveredDevices.clear();
      connectedDevices.clear();
      deviceCharacteristics.clear();
      notificationCallbacks.clear();
      devicePacketStates.clear();
      subscribedDevices.clear();
    });

    safeLog(logger, 'info', 'Noble BLE IPC handlers setup completed');
  } catch (error) {
    console.error('[NobleBLE] Failed to setup IPC handlers:', error);
    throw error;
  }
}
