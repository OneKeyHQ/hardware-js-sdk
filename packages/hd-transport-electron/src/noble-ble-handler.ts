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
  ERRORS,
  HardwareErrorCode,
  wait,
} from '@onekeyfe/hd-shared';
import { COMMON_HEADER_SIZE } from '@onekeyfe/hd-transport';
import type { WebContents, IpcMainInvokeEvent } from 'electron';
import type { Peripheral, Service, Characteristic } from '@abandonware/noble';
import pRetry from 'p-retry';
import type { NobleModule, Logger, DeviceInfo, CharacteristicPair } from './types/noble-extended';
import { safeLog } from './types/noble-extended';

// Noble will be dynamically imported to avoid bundlinpissues
let noble: NobleModule | null = null;
let logger: Logger | null = null;

// Bluetooth state management
const bluetoothState: {
  available: boolean;
  unsupported: boolean;
  initialized: boolean;
} = {
  available: false,
  unsupported: false,
  initialized: false,
};

// Global persistent state listener for app layer
let persistentStateListener: ((state: string) => void) | null = null;

// Device cache and connection state
const discoveredDevices = new Map<string, Peripheral>();
const connectedDevices = new Map<string, Peripheral>();
const deviceCharacteristics = new Map<string, CharacteristicPair>();
const notificationCallbacks = new Map<string, (data: string) => void>();
const subscribedDevices = new Map<string, boolean>(); // Track subscription status

// 🔒 Add subscription operation state tracking to prevent race conditions
const subscriptionOperations = new Map<string, 'subscribing' | 'unsubscribing' | 'idle'>();

// Packet reassembly state for each device
interface PacketAssemblyState {
  bufferLength: number;
  buffer: number[];
  packetCount: number;
  messageId?: string; // Add message ID to track concurrent requests
}
const devicePacketStates = new Map<string, PacketAssemblyState>();

// Track recent write operations to detect pairing rejection
const recentWriteOperations = new Map<string, number>(); // deviceId -> timestamp
const WRITE_DISCONNECT_THRESHOLD = 1000; // 1 second

// Service UUIDs to scan for - using constants from hd-shared
const ONEKEY_SERVICE_UUIDS = [ONEKEY_SERVICE_UUID];

// Pre-normalized characteristic identifiers for fast comparison
const NORMALIZED_WRITE_UUID = '0002';
const NORMALIZED_NOTIFY_UUID = '0003';

// Timeout and interval constants
const BLUETOOTH_INIT_TIMEOUT = 10000; // 10 seconds for Bluetooth initialization
const DEVICE_SCAN_TIMEOUT = 5000; // 5 seconds for device scanning
const FAST_SCAN_TIMEOUT = 1500; // 1.5 seconds for fast targeted scanning
const DEVICE_CHECK_INTERVAL = 500; // 500ms interval for periodic device checks
const CONNECTION_TIMEOUT = 3000; // 15 seconds for device connection
const CHUNK_WRITE_DELAY = 10; // 10ms delay between chunk writes

// BLE packet size constants
const BLE_PACKET_SIZE = 192; // Use Android packet size as default for desktop

// Validation limits
const MIN_HEADER_LENGTH = 9; // Minimum header chunk length

// Packet processing result types
interface PacketProcessResult {
  isComplete: boolean;
  completePacket?: string;
  error?: string;
}

// Process incoming BLE notification data with proper packet reassembly
function processNotificationData(deviceId: string, data: Buffer): PacketProcessResult {
  // Get or initialize packet state for this device
  let packetState = devicePacketStates.get(deviceId);
  if (!packetState) {
    packetState = { bufferLength: 0, buffer: [], packetCount: 0 };
    devicePacketStates.set(deviceId, packetState);
  }

  try {
    if (isHeaderChunk(data)) {
      // Validate header chunk
      if (data.length < MIN_HEADER_LENGTH) {
        return { isComplete: false, error: 'Invalid header chunk: too short' };
      }

      // Generate message ID for this packet sequence
      const messageId = `${deviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Reset packet state for new message
      packetState.bufferLength = data.readInt32BE(5);
      packetState.buffer = [...data.subarray(3)];
      packetState.packetCount = 1;
      packetState.messageId = messageId;

      // Only validate for negative lengths (which would be invalid)
      if (packetState.bufferLength < 0) {
        logger?.error('[NobleBLE] Invalid negative packet length detected:', {
          length: packetState.bufferLength,
          dataLength: data.length,
          rawHeader: data.subarray(0, Math.min(16, data.length)).toString('hex'),
          lengthBytes: data.subarray(5, 9).toString('hex'),
        });
        resetPacketState(packetState);
        return { isComplete: false, error: 'Invalid packet length in header' };
      }
    } else {
      // Validate we have an active packet session
      if (packetState.bufferLength === 0) {
        return { isComplete: false, error: 'Received data chunk without header' };
      }

      // Increment packet counter and append data
      packetState.packetCount += 1;
      packetState.buffer = packetState.buffer.concat([...data]);
    }

    // Check if packet is complete
    if (packetState.buffer.length - COMMON_HEADER_SIZE >= packetState.bufferLength) {
      const completeBuffer = Buffer.from(packetState.buffer);
      const hexString = completeBuffer.toString('hex');

      // Reset packet state for next message
      resetPacketState(packetState);

      return { isComplete: true, completePacket: hexString };
    }

    return { isComplete: false };
  } catch (error) {
    resetPacketState(packetState);
    return { isComplete: false, error: `Packet processing error: ${error}` };
  }
}

// Reset packet state to clean state
function resetPacketState(packetState: PacketAssemblyState): void {
  packetState.bufferLength = 0;
  packetState.buffer = [];
  packetState.packetCount = 0;
  packetState.messageId = undefined;
}

// Check Bluetooth availability - returns detailed state
async function checkBluetoothAvailability(): Promise<{
  available: boolean;
  state: string;
  unsupported: boolean;
  initialized: boolean;
}> {
  // Use existing initializeNoble which already handles bluetooth state
  if (!bluetoothState.initialized) {
    await initializeNoble();
  }

  const currentState = noble?.state || 'unknown';

  return {
    available: bluetoothState.available,
    state: currentState,
    unsupported: bluetoothState.unsupported,
    initialized: bluetoothState.initialized,
  };
}

// Setup persistent state listener for app layer
function setupPersistentStateListener(): void {
  if (!noble || persistentStateListener) return;

  persistentStateListener = (state: string) => {
    logger?.info('[NobleBLE] Persistent state change:', state);

    // Update global state
    updateBluetoothState(state);
  };

  noble.on('stateChange', persistentStateListener);
  logger?.info('[NobleBLE] Persistent state listener setup');

  // Manually check and update initial state
  const currentState = noble.state;
  if (currentState) {
    logger?.info('[NobleBLE] Initial state detected:', currentState);
    updateBluetoothState(currentState);
  }
}

// Update bluetooth state helper
function updateBluetoothState(state: string): void {
  if (state === 'poweredOn') {
    bluetoothState.available = true;
    bluetoothState.unsupported = false;
    bluetoothState.initialized = true;
  } else if (state === 'unsupported') {
    bluetoothState.available = false;
    bluetoothState.unsupported = true;
    bluetoothState.initialized = true;
  } else if (state === 'poweredOff') {
    bluetoothState.available = false;
    bluetoothState.unsupported = false;
    bluetoothState.initialized = true;
  } else if (state === 'unauthorized') {
    bluetoothState.available = false;
    bluetoothState.unsupported = false;
    bluetoothState.initialized = true;
  }
}

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
        reject(ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not initialized'));
        return;
      }

      if (noble.state === 'poweredOn') {
        resolve();
        return;
      }

      // Setup persistent state listener before initialization
      setupPersistentStateListener();

      const timeout = setTimeout(() => {
        reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Bluetooth initialization timeout')
        );
      }, BLUETOOTH_INIT_TIMEOUT);

      const cleanup = () => {
        clearTimeout(timeout);
        if (noble) {
          noble.removeListener('stateChange', onStateChange);
        }
      };

      const onStateChange = (state: string) => {
        logger?.info('[NobleBLE] Bluetooth state:', state);

        if (state === 'poweredOn') {
          cleanup();
          resolve();
        } else if (state === 'unsupported') {
          cleanup();
          reject(ERRORS.TypedError(HardwareErrorCode.BleUnsupported));
        } else if (state === 'poweredOff') {
          cleanup();
          reject(ERRORS.TypedError(HardwareErrorCode.BlePoweredOff));
        } else if (state === 'unauthorized') {
          cleanup();
          reject(ERRORS.TypedError(HardwareErrorCode.BlePermissionError));
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
    bluetoothState.unsupported = true;
    bluetoothState.initialized = true;
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
  recentWriteOperations.delete(deviceId);
  // 🔒 Clear operation state
  subscriptionOperations.delete(deviceId);
  logger?.info('[NobleBLE] Device state cleaned up:', deviceId);
}

// Handle device disconnection - unified handler for all disconnect scenarios
function handleDeviceDisconnect(deviceId: string, webContents: WebContents): void {
  logger?.error('[NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED:', {
    deviceId,
    hasPeripheral: connectedDevices.has(deviceId),
    hasCharacteristics: deviceCharacteristics.has(deviceId),
    stackTrace: new Error().stack?.split('\n').slice(1, 5),
  });

  // Get device info before cleanup
  const peripheral = connectedDevices.get(deviceId);
  const deviceName = peripheral?.advertisement?.localName || 'Unknown Device';

  // Check if this is a pairing rejection (write completed but device disconnected quickly)
  const recentWriteTime = recentWriteOperations.get(deviceId);
  const now = Date.now();
  const isPairingRejection = recentWriteTime && now - recentWriteTime < WRITE_DISCONNECT_THRESHOLD;

  if (isPairingRejection) {
    logger?.info('[NobleBLE] Pairing rejection detected, sending error notification');
    // Send pairing rejection error directly to transport
    webContents.send(EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION, deviceId, 'PAIRING_REJECTED');
  }

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

  logger?.info('[NobleBLE] Discovered OneKey device:', deviceName);

  // Cache the device in both maps
  discoveredDevices.set(peripheral.id, peripheral);
}

// Perform targeted scan for a specific device ID
async function performTargetedScan(targetDeviceId: string): Promise<Peripheral | null> {
  if (!noble) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not available');
  }

  // First check if we have a recent cached peripheral\n  const cachedDevice = deviceCache.get(targetDeviceId);\n  if (cachedDevice && (Date.now() - cachedDevice.lastSeen) < 30000) { // 30 seconds cache\n    logger?.info('[NobleBLE] Using cached device for fast connection:', targetDeviceId);\n    \n    // Use cached device if it was successful before\n    if (cachedDevice.connectionSuccess) {\n      discoveredDevices.set(targetDeviceId, cachedDevice.peripheral);\n      return cachedDevice.peripheral;\n    }\n  }\n\n  logger?.info('[NobleBLE] Starting targeted scan for device:', targetDeviceId);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (noble) {
        noble.stopScanning();
      }
      logger?.info('[NobleBLE] Targeted scan timeout for device:', targetDeviceId);
      resolve(null);
    }, FAST_SCAN_TIMEOUT);

    // Set up discovery handler for target device
    const onDiscover = (peripheral: Peripheral) => {
      if (peripheral.id === targetDeviceId) {
        clearTimeout(timeout);
        if (noble) {
          noble.stopScanning();
        }

        // Cache the found device
        discoveredDevices.set(peripheral.id, peripheral);

        logger?.info('[NobleBLE] Target device found:', {
          id: peripheral.id,
          name: peripheral.advertisement?.localName || 'Unknown',
        });

        // Clean up listener
        if (noble) {
          noble.removeListener('discover', onDiscover);
        }

        resolve(peripheral);
      }
    };

    // Add discovery listener
    if (noble) {
      noble.on('discover', onDiscover);
    }

    // Start scanning
    if (noble) {
      noble.startScanning(ONEKEY_SERVICE_UUIDS, false, (error?: Error) => {
        if (error) {
          clearTimeout(timeout);
          if (noble) {
            noble.removeListener('discover', onDiscover);
          }
          logger?.error('[NobleBLE] Failed to start targeted scan:', error);
          reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.message));
          return;
        }

        logger?.info('[NobleBLE] Targeted scan started for device:', targetDeviceId);
      });
    }
  });
}

// Enumerate devices
async function enumerateDevices(): Promise<DeviceInfo[]> {
  if (!noble) {
    await initializeNoble();
  }

  if (!noble) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not available');
  }

  logger?.info('[NobleBLE] Starting device enumeration');

  // Clear previous discoveries
  discoveredDevices.clear();

  return new Promise((resolve, reject) => {
    const devices: DeviceInfo[] = [];

    if (!noble) {
      reject(ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not available'));
      return;
    }

    // Set timeout for scanning
    const timeout = setTimeout(() => {
      if (noble) {
        noble.stopScanning();
      }
      logger?.info('[NobleBLE] Scan completed, found devices:', devices.length);
      resolve(devices);
    }, DEVICE_SCAN_TIMEOUT);

    // Start scanning for OneKey service UUIDs
    noble.startScanning(ONEKEY_SERVICE_UUIDS, false, (error?: Error) => {
      if (error) {
        clearTimeout(timeout);
        logger?.error('[NobleBLE] Failed to start scanning:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.message));
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
      const interval = setInterval(checkDevices, DEVICE_CHECK_INTERVAL);

      // Clean up interval when timeout occurs
      setTimeout(() => {
        clearInterval(interval);
      }, DEVICE_SCAN_TIMEOUT);
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

// Get device info - supports both discovered and direct connection modes
function getDevice(deviceId: string): DeviceInfo | null {
  // First check if device was discovered through scanning
  const peripheral = discoveredDevices.get(deviceId);
  if (peripheral) {
    const deviceName = peripheral.advertisement?.localName || 'Unknown Device';
    return {
      id: peripheral.id,
      name: deviceName,
      state: peripheral.state || 'disconnected',
    };
  }

  // If not discovered, check if it's already connected (direct connection mode)
  const connectedPeripheral = connectedDevices.get(deviceId);
  if (connectedPeripheral) {
    const deviceName = connectedPeripheral.advertisement?.localName || 'Unknown Device';
    return {
      id: connectedPeripheral.id,
      name: deviceName,
      state: connectedPeripheral.state || 'connected',
    };
  }

  // For direct connection mode, return a placeholder device info
  // This allows the connection process to proceed without prior discovery
  return {
    id: deviceId,
    name: 'OneKey Device',
    state: 'disconnected',
  };
}

// Core service discovery function (single attempt)
async function discoverServicesAndCharacteristics(
  peripheral: Peripheral
): Promise<CharacteristicPair> {
  return new Promise((resolve, reject) => {
    peripheral.discoverServices(ONEKEY_SERVICE_UUIDS, (error: string, services: Service[]) => {
      if (error) {
        logger?.error('[NobleBLE] Service discovery failed:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, error));
        return;
      }

      if (!services || services.length === 0) {
        reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, 'No OneKey services found'));
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
            reject(ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound, error));
            return;
          }

          // Log discovered characteristics summary
          logger?.info('[NobleBLE] Discovered characteristics:', {
            count: characteristics?.length || 0,
            uuids: characteristics?.map(c => c.uuid) || [],
          });

          let writeCharacteristic: Characteristic | null = null;
          let notifyCharacteristic: Characteristic | null = null;

          // Find characteristics by extracting the distinguishing part of UUID
          for (const characteristic of characteristics) {
            const uuid = characteristic.uuid.replace(/-/g, '').toLowerCase();
            const uuidKey = uuid.length >= 8 ? uuid.substring(4, 8) : uuid;

            if (uuidKey === NORMALIZED_WRITE_UUID) {
              writeCharacteristic = characteristic;
            } else if (uuidKey === NORMALIZED_NOTIFY_UUID) {
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
            reject(
              ERRORS.TypedError(
                HardwareErrorCode.BleCharacteristicNotFound,
                'Required characteristics not found'
              )
            );
            return;
          }

          resolve({ write: writeCharacteristic, notify: notifyCharacteristic });
        }
      );
    });
  });
}

// Force reconnect to clear potential connection state issues
async function forceReconnectPeripheral(peripheral: Peripheral, deviceId: string): Promise<void> {
  logger?.info('[NobleBLE] Forcing connection reset for device:', deviceId);

  // Step 1: Force disconnect if connected
  if (peripheral.state === 'connected') {
    await new Promise<void>(resolve => {
      peripheral.disconnect(() => {
        logger?.info('[NobleBLE] Force disconnect completed');
        resolve();
      });
    });

    // Wait for complete disconnection
    await wait(1000);
  }

  // Step 2: Clear device state
  connectedDevices.delete(deviceId);
  deviceCharacteristics.delete(deviceId);
  devicePacketStates.delete(deviceId);
  subscribedDevices.delete(deviceId);
  subscriptionOperations.delete(deviceId);

  // Step 3: Re-establish connection
  await new Promise<void>((resolve, reject) => {
    peripheral.connect((error: string) => {
      if (error) {
        logger?.error('[NobleBLE] Force reconnect failed:', error);
        reject(new Error(`Force reconnect failed: ${error}`));
      } else {
        logger?.info('[NobleBLE] Force reconnect successful');
        connectedDevices.set(deviceId, peripheral);
        resolve();
      }
    });
  });

  // Wait for connection to stabilize
  await wait(500);
}

// Enhanced connection with fresh peripheral rescan as last resort
async function connectAndDiscoverWithFreshScan(deviceId: string): Promise<CharacteristicPair> {
  logger?.info('[NobleBLE] Attempting connection with fresh peripheral scan as fallback');

  const currentPeripheral = discoveredDevices.get(deviceId);

  // First attempt with existing peripheral
  if (currentPeripheral) {
    try {
      return await discoverServicesAndCharacteristicsWithRetry(currentPeripheral, deviceId);
    } catch (error) {
      logger?.error(
        '[NobleBLE] Service discovery failed with existing peripheral, attempting fresh scan...'
      );
    }
  }

  // Last resort: Fresh scan to get new peripheral object
  logger?.info(
    '[NobleBLE] Performing fresh scan to get new peripheral object for device:',
    deviceId
  );

  try {
    const freshPeripheral = await performTargetedScan(deviceId);
    if (!freshPeripheral) {
      throw new Error(`Device ${deviceId} not found in fresh scan`);
    }

    // Update device maps with fresh peripheral
    discoveredDevices.set(deviceId, freshPeripheral);

    // Connect to fresh peripheral
    await new Promise<void>((resolve, reject) => {
      freshPeripheral.connect((error: string) => {
        if (error) {
          reject(new Error(`Fresh peripheral connection failed: ${error}`));
        } else {
          connectedDevices.set(deviceId, freshPeripheral);
          resolve();
        }
      });
    });

    // Attempt service discovery with fresh peripheral (single attempt)
    logger?.info('[NobleBLE] Attempting service discovery with fresh peripheral');
    await wait(1000); // Give fresh connection more time to stabilize

    return await discoverServicesAndCharacteristics(freshPeripheral);
  } catch (error) {
    logger?.error('[NobleBLE] Fresh scan and connection failed:', error);
    throw error;
  }
}

// Enhanced service discovery with p-retry for robust BLE connection
async function discoverServicesAndCharacteristicsWithRetry(
  peripheral: Peripheral,
  deviceId: string
): Promise<CharacteristicPair> {
  return pRetry(
    async attemptNumber => {
      logger?.info('[NobleBLE] Starting service discovery:', {
        deviceId,
        peripheralState: peripheral.state,
        attempt: attemptNumber,
        maxRetries: 5,
        targetUUIDs: ONEKEY_SERVICE_UUIDS,
      });

      // Strategy: Force reconnect on 3rd attempt to clear potential state issues
      if (attemptNumber === 3) {
        logger?.info('[NobleBLE] Attempting force reconnect to clear connection state...');
        try {
          await forceReconnectPeripheral(peripheral, deviceId);
        } catch (error) {
          logger?.error('[NobleBLE] Force reconnect failed:', error);
          throw error;
        }
      }

      // Progressive delay strategy - handled by p-retry, but add extra wait for higher attempts
      if (attemptNumber > 1) {
        logger?.info(`[NobleBLE] Service discovery retry attempt ${attemptNumber}/5`);
      }

      // Verify connection state before attempting service discovery
      if (peripheral.state !== 'connected') {
        throw new Error(`Device not connected: ${peripheral.state}`);
      }

      try {
        return await discoverServicesAndCharacteristics(peripheral);
      } catch (error) {
        logger?.error(`[NobleBLE] No services found (attempt ${attemptNumber}/5)`);

        if (attemptNumber < 5) {
          logger?.error(`[NobleBLE] Will retry service discovery (attempt ${attemptNumber + 1}/5)`);
        }

        throw error; // p-retry will handle the retry logic
      }
    },
    {
      retries: 4, // Total 5 attempts (initial + 4 retries)
      factor: 1.5, // Exponential backoff: 1000ms → 1500ms → 2250ms → 3000ms
      minTimeout: 1000, // Start with 1 second delay
      maxTimeout: 3000, // Maximum 3 seconds delay
      onFailedAttempt: error => {
        // This runs after each failed attempt
        logger?.error(`[NobleBLE] Service discovery attempt ${error.attemptNumber} failed:`, {
          message: error.message,
          retriesLeft: error.retriesLeft,
          nextRetryIn: `${Math.min(1000 * 1.5 ** error.attemptNumber, 3000)}ms`,
        });
      },
    }
  );
}

// Connect to device - supports both discovered and direct connection modes
async function connectDevice(deviceId: string, webContents: WebContents): Promise<void> {
  logger?.info('[NobleBLE] Connect device request:', {
    deviceId,
    hasDiscovered: discoveredDevices.has(deviceId),
    hasConnected: connectedDevices.has(deviceId),
    hasCharacteristics: deviceCharacteristics.has(deviceId),
    totalDiscovered: discoveredDevices.size,
    totalConnected: connectedDevices.size,
  });

  let peripheral = discoveredDevices.get(deviceId);

  // If device not discovered, try a targeted scan for this specific device
  if (!peripheral) {
    logger?.info('[NobleBLE] Device not discovered, attempting targeted scan for:', deviceId);

    // Initialize Noble if not already done
    if (!noble) {
      await initializeNoble();
    }

    if (!noble) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not available');
    }

    // Perform a targeted scan to find the specific device
    try {
      const foundPeripheral = await performTargetedScan(deviceId);
      if (!foundPeripheral) {
        throw ERRORS.TypedError(
          HardwareErrorCode.DeviceNotFound,
          `Device ${deviceId} not found even after targeted scan`
        );
      }
      peripheral = foundPeripheral;
    } catch (error) {
      logger?.error('[NobleBLE] Targeted scan failed:', error);
      throw error;
    }
  }

  // At this point, peripheral is guaranteed to be defined
  if (!peripheral) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device ${deviceId} not found`);
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

      // ⚠️ CRITICAL FIX: Check for ongoing subscription operations to prevent race conditions
      const ongoingOperation = subscriptionOperations.get(deviceId);
      if (ongoingOperation && ongoingOperation !== 'idle') {
        logger?.info(
          '[NobleBLE] Device has ongoing subscription operation:',
          ongoingOperation,
          'waiting...'
        );
        // Wait for ongoing operation to complete
        await wait(100);
        // Retry connection after waiting
        return connectDevice(deviceId, webContents);
      }

      // Don't clean up notification state if device is already properly connected
      // The existing notification subscription is still valid and working
      const hasActiveSubscription = subscribedDevices.has(deviceId);
      const hasCallback = notificationCallbacks.has(deviceId);

      if (hasActiveSubscription && hasCallback) {
        logger?.info(
          '[NobleBLE] Device already has active notification subscription, reusing connection'
        );
        return;
      }

      // Only clean up if subscription is broken
      logger?.info(
        '[NobleBLE] Found orphaned characteristics without active subscription, cleaning up'
      );
      const existingCharacteristics = deviceCharacteristics.get(deviceId);
      if (existingCharacteristics) {
        existingCharacteristics.notify.removeAllListeners('data');
      }
      notificationCallbacks.delete(deviceId);
      devicePacketStates.delete(deviceId);
      subscribedDevices.delete(deviceId);
      // Continue to re-setup the connection properly
    }

    // Discover services and characteristics with enhanced retry including fresh scan
    try {
      const characteristics = await connectAndDiscoverWithFreshScan(deviceId);
      deviceCharacteristics.set(deviceId, characteristics);
      logger?.info('[NobleBLE] Device ready for communication:', deviceId);
      return;
    } catch (error) {
      logger?.error(
        '[NobleBLE] Service/characteristic discovery failed after all attempts:',
        error
      );
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'Connection timeout'));
    }, CONNECTION_TIMEOUT);

    // TypeScript type assertion - peripheral is guaranteed to be defined at this point
    const connectedPeripheral = peripheral as Peripheral;
    connectedPeripheral.connect((error: string) => {
      clearTimeout(timeout);

      if (error) {
        logger?.error('[NobleBLE] Connection failed:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, error));
        return;
      }

      logger?.info('[NobleBLE] Connected to device:', deviceId);
      connectedDevices.set(deviceId, connectedPeripheral);

      // Set up unified disconnect listener
      setupDisconnectListener(connectedPeripheral, deviceId, webContents);

      // Discover services and characteristics with enhanced retry including fresh scan
      connectAndDiscoverWithFreshScan(deviceId)
        .then(characteristics => {
          deviceCharacteristics.set(deviceId, characteristics);
          logger?.info('[NobleBLE] Device ready for communication:', deviceId);
          resolve();
        })
        .catch(error => {
          logger?.error(
            '[NobleBLE] Service/characteristic discovery failed after all attempts:',
            error
          );
          // Disconnect on failure
          connectedPeripheral.disconnect();
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

// Write data to device with chunking support
async function writeData(deviceId: string, hexData: string): Promise<void> {
  const peripheral = connectedDevices.get(deviceId);
  const characteristics = deviceCharacteristics.get(deviceId);

  if (!peripheral || !characteristics) {
    const error = `Device ${deviceId} not connected or characteristics not available`;
    logger?.error('[NobleBLE] writeData failed:', error);
    throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound, error);
  }

  const { write: writeCharacteristic } = characteristics;

  // Convert hex string to buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(hexData, 'hex');
  } catch (error) {
    logger?.error('[NobleBLE] Hex conversion failed:', error);
    throw ERRORS.TypedError(
      HardwareErrorCode.BleWriteCharacteristicError,
      `Failed to convert hex data: ${error}`
    );
  }

  logger?.info('[NobleBLE] Writing data:', {
    deviceId,
    dataLength: buffer.length,
    firstBytes: buffer.subarray(0, 8).toString('hex'),
  });

  // If data is small enough, send directly
  if (buffer.length <= BLE_PACKET_SIZE) {
    await wait(10);
    return new Promise((resolve, reject) => {
      writeCharacteristic.write(buffer, true, (error: string) => {
        if (error) {
          logger?.error('[NobleBLE] Single packet write failed:', error);
          reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, error));
          return;
        }
        // Record successful write time for pairing rejection detection
        recentWriteOperations.set(deviceId, Date.now());
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
          reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, error));
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
      await delay(CHUNK_WRITE_DELAY);
    }
  }

  // Record successful write time for pairing rejection detection
  recentWriteOperations.set(deviceId, Date.now());
}

// Subscribe to notifications
async function subscribeNotifications(
  deviceId: string,
  callback: (data: string) => void
): Promise<void> {
  const peripheral = connectedDevices.get(deviceId);
  const characteristics = deviceCharacteristics.get(deviceId);

  if (!peripheral || !characteristics) {
    throw ERRORS.TypedError(
      HardwareErrorCode.TransportNotFound,
      `Device ${deviceId} not connected or characteristics not available`
    );
  }

  const { notify: notifyCharacteristic } = characteristics;

  logger?.info('[NobleBLE] Subscribing to notifications for device:', deviceId);

  // 🔒 Set operation state to prevent race conditions
  subscriptionOperations.set(deviceId, 'subscribing');

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

    // 🔒 Clear operation state
    subscriptionOperations.set(deviceId, 'idle');
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
    logger?.info('[NobleBLE] 🔄 Starting subscription process...', { deviceId });

    notifyCharacteristic.subscribe((error: string) => {
      if (error) {
        logger?.error('[NobleBLE] ❌ Notification subscription failed:', error);
        // 🔒 Clear operation state on error
        subscriptionOperations.set(deviceId, 'idle');
        reject(ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotifyError, error));
        return;
      }

      logger?.info('[NobleBLE] ✅ Notification subscription successful');
      subscribedDevices.set(deviceId, true);

      // 🔒 Clear operation state on success
      subscriptionOperations.set(deviceId, 'idle');

      // Set up data handler with robust packet reassembly
      notifyCharacteristic.on('data', (data: Buffer) => {
        const result = processNotificationData(deviceId, data);

        if (result.error) {
          logger?.error('[NobleBLE] Packet processing error:', result.error);
          return;
        }

        if (result.isComplete && result.completePacket) {
          logger?.info('[NobleBLE] Packet complete:', {
            deviceId,
            length: result.completePacket.length / 2,
          });
          callback(result.completePacket);
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

  // 🔒 Set operation state to prevent race conditions
  subscriptionOperations.set(deviceId, 'unsubscribing');

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

      // 🔒 Clear operation state
      subscriptionOperations.set(deviceId, 'idle');
      resolve();
    });
  });
}

// Setup IPC handlers
export function setupNobleBleHandlers(webContents: WebContents): void {
  try {
    console.log('NOBLE_VERSION_771');
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
        logger?.info('[NobleBLE] IPC CONNECT request received:', {
          deviceId,
          hasPeripheral: connectedDevices.has(deviceId),
          hasCharacteristics: deviceCharacteristics.has(deviceId),
          totalConnectedDevices: connectedDevices.size,
        });
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

    // Handle Bluetooth availability check request
    ipcMain.handle(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK, async () => {
      try {
        const bluetoothStatus = await checkBluetoothAvailability();
        safeLog(logger, 'info', 'Bluetooth availability check completed:', bluetoothStatus);
        return bluetoothStatus;
      } catch (error) {
        safeLog(logger, 'error', 'Bluetooth availability check failed:', error);
        return {
          available: false,
          state: 'error',
          unsupported: false,
          initialized: false,
        };
      }
    });

    // Cleanup on app quit
    webContents.on('destroyed', () => {
      safeLog(logger, 'info', 'Cleaning up Noble BLE handlers');

      // Disconnect all devices
      connectedDevices.forEach(async (_peripheral, deviceId) => {
        await disconnectDevice(deviceId);
      });

      // Stop scanning
      stopScanning();

      // Remove persistent state listener
      if (noble && persistentStateListener) {
        noble.removeListener('stateChange', persistentStateListener);
        persistentStateListener = null;
      }

      // Clear all caches using individual clear operations for better cleanup
      discoveredDevices.clear();
      connectedDevices.clear();
      deviceCharacteristics.clear();
      notificationCallbacks.clear();
      devicePacketStates.clear();
      subscribedDevices.clear();

      // Clear operation states
      subscriptionOperations.clear();
    });

    safeLog(logger, 'info', 'Noble BLE IPC handlers setup completed');
  } catch (error) {
    console.error('[NobleBLE] Failed to setup IPC handlers:', error);
    throw error;
  }
}
