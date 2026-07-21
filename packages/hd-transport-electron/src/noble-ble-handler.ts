/*
 * Noble BLE Handler for Electron Main Process
 * Handles BLE communication using Noble library
 */

/* eslint-disable @typescript-eslint/no-var-requires, import/no-extraneous-dependencies */

import {
  EOneKeyBleMessageKeys,
  ERRORS,
  HardwareErrorCode,
  ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
  ONEKEY_SERVICE_UUID,
  ONEKEY_WRITE_CHARACTERISTIC_UUID,
  isHeaderChunk,
  isOnekeyDevice,
  wait,
} from '@onekeyfe/hd-shared';
import { COMMON_HEADER_SIZE } from '@onekeyfe/hd-transport';
import pRetry from 'p-retry';

import { safeLog } from './types/noble-extended';
import { softRefreshSubscription } from './ble-ops';

import type { IpcMainInvokeEvent, WebContents } from 'electron';
import type { Characteristic, Peripheral, Service } from '@stoprocent/noble';
import type { CharacteristicPair, DeviceInfo, Logger, NobleModule } from './types/noble-extended';

// Noble will be dynamically imported to avoid bundling issues
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
const pairedDevices = new Set<string>(); // Windows BLE device pairing status tracking
const deviceCharacteristics = new Map<string, CharacteristicPair>();
const notificationCallbacks = new Map<string, (data: string) => void>();
const subscribedDevices = new Map<string, boolean>(); // Track subscription status

// 🔒 Subscription operation state tracking to prevent race conditions
const subscriptionOperations = new Map<string, 'subscribing' | 'unsubscribing' | 'idle'>();

// Packet reassembly state for each device
interface PacketAssemblyState {
  bufferLength: number;
  buffer: number[];
  packetCount: number;
  messageId?: string; // Add message ID to track concurrent requests
}
const devicePacketStates = new Map<string, PacketAssemblyState>();

// Windows-only response watchdog state moved to utils/windows-ble-recovery

// Pairing-related state removed

// Device operation history removed

// Service UUIDs to scan for - using constants from hd-shared
const ONEKEY_SERVICE_UUIDS = [ONEKEY_SERVICE_UUID];

// Pre-normalized characteristic identifiers for fast comparison
// Reduce any uuid form (long base-form with/without dashes, or short) to its
// 16-bit key for comparisons — noble/mac reports base-UUIDs short-form.
const uuid16Key = (uuid: string): string => {
  const stripped = (uuid ?? '').replace(/-/g, '').toLowerCase();
  return stripped.length >= 8 ? stripped.substring(4, 8) : stripped;
};

const NORMALIZED_WRITE_UUID = '0002';
const NORMALIZED_NOTIFY_UUID = '0003';

// Timeout and interval constants
const BLUETOOTH_INIT_TIMEOUT = 10000; // 10 seconds for Bluetooth initialization
const DEVICE_SCAN_TIMEOUT = 5000; // 5 seconds for device scanning
const FAST_SCAN_TIMEOUT = 1500; // 1.5 seconds for fast targeted scanning
const DEVICE_CHECK_INTERVAL = 500; // 500ms interval for periodic device checks
const CONNECTION_TIMEOUT = 3000; // 3 seconds for device connection
// Keep-alive idle window. The renderer's release() no longer disconnects, so
// this timer is what physically frees an unused device for other hosts (the
// phone app — a BLE peripheral serves one central at a time, and it does not
// advertise while connected). 60s aligns with the device's own auto-lock
// default: past that the next operation needs a PIN anyway, so holding the
// link longer buys nothing.
const BLE_IDLE_DISCONNECT_MS = 60_000;
// Bound on a cleanup disconnect — noble's disconnect callback can hang on a
// wedged peripheral; never let recovery paths wait on it forever.
const BLE_DISCONNECT_TIMEOUT_MS = 2000;
// Backstop while a request is OUTSTANDING (write sent, response not complete).
// "Idle" means no outstanding request — a user reading a confirm screen for
// minutes must NOT be disconnected — so the 60s clock only runs between
// requests. This long backstop covers the truly wedged case (device never
// answers, upper layers never cancel) so a dead call can't hold the link
// forever.
const BLE_BUSY_BACKSTOP_MS = 10 * 60_000;
const SERVICE_DISCOVERY_TIMEOUT = 10000; // 10 seconds for service discovery

// Write-related constants
const BLE_PACKET_SIZE = 192;
const UNIFIED_WRITE_DELAY = 5;
const RETRY_CONFIG = { MAX_ATTEMPTS: 15, WRITE_TIMEOUT: 2000 } as const;
const IS_WINDOWS = process.platform === 'win32';
const ABORTABLE_WRITE_ERROR_PATTERNS = [
  /status:\s*3/i, // Windows pairing cancelled / GATT write failed
];

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
  //  notification telemetry
  logger?.info('[NobleBLE] Notification', {
    deviceId,
    dataLength: data.length,
  });

  // Get or initialize packet state for this device
  let packetState = devicePacketStates.get(deviceId);
  if (!packetState) {
    packetState = { bufferLength: 0, buffer: [], packetCount: 0 };
    devicePacketStates.set(deviceId, packetState);
    logger?.info('[NobleBLE] Initialized new packet state for device:', deviceId);
  }

  try {
    if (isHeaderChunk(data)) {
      // Validate header chunk
      if (data.length < MIN_HEADER_LENGTH) {
        return { isComplete: false, error: 'Invalid header chunk: too short' };
      }

      // Generate message ID for this packet sequence
      const messageId = `${deviceId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

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

      logger?.info('[NobleBLE] Packet assembled', {
        deviceId,
        totalPackets: packetState.packetCount,
        expectedLength: packetState.bufferLength,
        actualLength: packetState.buffer.length - COMMON_HEADER_SIZE,
      });

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
    bleTraceVerbose('adapter.state', { state });

    // Update global state
    updateBluetoothState(state);

    // When Bluetooth is powered off, clear all device caches and reset state to avoid stale peripherals
    if (state === 'poweredOff') {
      logger?.info('[NobleBLE] Bluetooth powered off - clearing device caches and resetting state');

      // Cleanup all connected devices (send disconnect event to renderer)
      const connectedIds = Array.from(connectedDevices.keys());
      for (const deviceId of connectedIds) {
        try {
          cleanupDevice(deviceId, undefined, {
            cleanupConnection: true,
            sendDisconnectEvent: true,
            cancelOperations: true,
            reason: 'bluetooth-poweredOff',
          });
        } catch (e) {
          safeLog(logger, 'error', 'Failed to cleanup device during poweredOff', {
            deviceId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Clear discovery and subscription-related states to ensure next connect starts from state-1
      discoveredDevices.clear();
      deviceCharacteristics.clear();
      subscribedDevices.clear();
      notificationCallbacks.clear();
      devicePacketStates.clear();
      subscriptionOperations.clear();
      pairedDevices.clear();

      // Best-effort stop scanning
      if (noble) {
        try {
          noble.stopScanning();
        } catch (e) {
          safeLog(
            logger,
            'error',
            'Failed to stop scanning on poweredOff',
            e instanceof Error ? e.message : String(e)
          );
        }
      }
    }
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

// ===== Keep-alive idle disconnect =====
// One timer per connected device. Semantics: the 60s idle countdown runs only
// while NO request is outstanding — a write CLEARS it (and arms a long busy
// backstop instead); the arrival of a COMPLETE response re-arms it. Owned by
// the main process on purpose: a renderer reload must not orphan a held link.
const idleDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearIdleDisconnect(deviceId: string): void {
  const timer = idleDisconnectTimers.get(deviceId);
  if (timer) {
    clearTimeout(timer);
    idleDisconnectTimers.delete(deviceId);
  }
}

function armIdleDisconnect(
  deviceId: string,
  ms: number = BLE_IDLE_DISCONNECT_MS,
  reason: 'idle' | 'busy-backstop' = 'idle'
): void {
  clearIdleDisconnect(deviceId);
  idleDisconnectTimers.set(
    deviceId,
    setTimeout(() => {
      idleDisconnectTimers.delete(deviceId);
      if (!connectedDevices.has(deviceId)) return;
      logger?.info('[NobleBLE] Keep-alive timeout, disconnecting device:', deviceId, reason);
      bleTrace('idle.disconnect', { deviceId, afterMs: ms, reason });
      const peripheral = connectedDevices.get(deviceId);
      const deviceName = peripheral?.advertisement?.localName || 'Unknown Device';
      disconnectDevice(deviceId)
        .then(() => {
          // Tell every renderer the link is gone. Normally nobody listens (the
          // logical release already dropped the listener), but on the busy
          // backstop a call is still in flight and its transport must reject
          // rather than hang on a silently-dead link.
          broadcastToAllWebContents(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, {
            id: deviceId,
            name: deviceName,
          });
        })
        .catch(error => {
          logger?.error('[NobleBLE] Keep-alive disconnect failed:', error);
        });
    }, ms)
  );
}

function broadcastToAllWebContents(channel: string, payload: unknown): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { webContents: electronWebContents } = require('electron') as {
      webContents: { getAllWebContents(): WebContents[] };
    };
    for (const wc of electronWebContents.getAllWebContents()) {
      if (!wc.isDestroyed()) wc.send(channel, payload);
    }
  } catch (error) {
    logger?.error('[NobleBLE] broadcast failed:', { channel, error: String(error) });
  }
}

// ===== BLE debug trace (renderer console) =====
// Forwards key BLE lifecycle events to the renderer so they show up in the
// window's DevTools console under a single filterable "[BLE-TRACE]" keyword
// (the preload prints them). The channel string is shared by value with the
// Trezor electron-ble connector and the app preload — keep them in sync.
const BLE_TRACE_CHANNEL = '$onekey-ble-trace';

function bleTrace(event: string, data?: Record<string, unknown>): void {
  // Broadcast to every webContents rather than one captured at init: the
  // preload (and its console printer) runs in the main window, the tray AND
  // embedded webviews, and the console a developer actually watches is not
  // necessarily `browserWindow.webContents`.
  broadcastToAllWebContents(BLE_TRACE_CHANNEL, {
    src: 'onekey-ble',
    ts: Date.now(),
    event,
    data,
  });
}

// Verbose tier: healthy-path timeline lines, emitted only in diagnostic mode
// (ONEKEY_BLE_DIAG=1). Default output stays quiet — errors, timeouts,
// fallback-route events and the two cold-connect anchor lines only.
function bleTraceVerbose(event: string, data?: Record<string, unknown>): void {
  if (process.env.ONEKEY_BLE_DIAG !== '1') return;
  bleTrace(event, data);
}

// Initialize Noble
async function initializeNoble(): Promise<void> {
  if (noble) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    noble = require('@stoprocent/noble') as NobleModule;
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

    // The noble module is a process-wide singleton shared with any other BLE
    // handler in this main process (e.g. the Trezor electron-ble connector), so
    // these events report the ADAPTER's true scan state no matter who started
    // or stopped the scan — the one signal that lets a slow/failed connect be
    // correlated with a scan someone else left running.
    noble.on('scanStart', () => {
      logger?.info('[NobleBLE] adapter scanStart (global: any handler on this noble instance)');
    });
    noble.on('scanStop', () => {
      logger?.info('[NobleBLE] adapter scanStop (global: any handler on this noble instance)');
    });

    logger?.info('[NobleBLE] Noble initialized successfully');
  } catch (error) {
    logger?.error('[NobleBLE] Failed to initialize Noble:', error);
    bluetoothState.unsupported = true;
    bluetoothState.initialized = true;
    throw error;
  }
}

// (Removed) cancelPairing: pairing is handled automatically during Windows init now

// ===== Unified Device Cleanup System =====

/**
 * Device cleanup options
 */
interface DeviceCleanupOptions {
  /** Whether to clean up BLE connection state */
  cleanupConnection?: boolean;
  /** Whether to clean up discovered cache (discoveredDevices Map) */
  cleanupDiscoveredCache?: boolean;
  /** Whether to send disconnect event */
  sendDisconnectEvent?: boolean;
  /** Whether to cancel ongoing operations */
  cancelOperations?: boolean;
  /** Cleanup reason (for logging) */
  reason?: string;
}

/**
 * Unified device cleanup function - single entry point for all cleanup operations
 */
function cleanupDevice(
  deviceId: string,
  webContents?: WebContents,
  options: DeviceCleanupOptions = {}
): void {
  const {
    cleanupConnection = true,
    cleanupDiscoveredCache = false,
    sendDisconnectEvent = false,
    cancelOperations = true,
    reason = 'unknown',
  } = options;

  logger?.info('[NobleBLE] Starting device cleanup', {
    deviceId,
    reason,
    cleanupConnection,
    cleanupDiscoveredCache,
    sendDisconnectEvent,
    cancelOperations,
  });
  bleTraceVerbose('cleanup', { deviceId, reason, cleanupConnection });
  clearIdleDisconnect(deviceId);

  // Get device info before cleanup
  const peripheral = connectedDevices.get(deviceId);
  const deviceName = peripheral?.advertisement?.localName || 'Unknown Device';

  // 1. Clean up connection state
  if (cleanupConnection) {
    connectedDevices.delete(deviceId);
    deviceCharacteristics.delete(deviceId);
    notificationCallbacks.delete(deviceId);
    devicePacketStates.delete(deviceId);
    subscribedDevices.delete(deviceId);
    subscriptionOperations.delete(deviceId);
    pairedDevices.delete(deviceId);
  }

  // 2. Clean up discovered cache (optional)
  if (cleanupDiscoveredCache) {
    discoveredDevices.delete(deviceId);
  }

  // 3. Send disconnect event (if needed)
  if (sendDisconnectEvent && webContents) {
    webContents.send(EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED, {
      id: deviceId,
      name: deviceName,
    });
  }

  logger?.info('[NobleBLE] Device cleanup completed', { deviceId, reason });
}

/**
 * Handle device disconnect - automatic disconnect case
 */
function handleDeviceDisconnect(deviceId: string, webContents: WebContents): void {
  logger?.error('[NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED:', {
    deviceId,
    hasPeripheral: connectedDevices.has(deviceId),
    hasCharacteristics: deviceCharacteristics.has(deviceId),
    stackTrace: new Error().stack?.split('\n').slice(1, 5),
  });
  bleTrace('disconnect.detected', { deviceId });

  cleanupDevice(deviceId, webContents, {
    cleanupConnection: true,
    sendDisconnectEvent: true,
    cancelOperations: true,
    reason: 'auto-disconnect',
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

// ===== Write helpers (inline) =====

async function writeCharacteristicWithAck(
  deviceId: string,
  writeCharacteristic: Characteristic,
  buffer: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    writeCharacteristic.write(buffer, true, (error?: Error) => {
      if (error) {
        logger?.error('[NobleBLE] Write failed', { deviceId, error: String(error) });
        bleTrace('write.error', { deviceId, error: String(error) });
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function attemptWindowsWriteUntilPaired(
  deviceId: string,
  doGetWriteCharacteristic: () => Characteristic | null | undefined,
  payload: Buffer,
  contextLabel: string
): Promise<void> {
  const timeoutMs = RETRY_CONFIG.WRITE_TIMEOUT;
  for (let attempt = 1; attempt <= RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
    // If disconnected, abort
    if (!connectedDevices.has(deviceId)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.BleConnectedError,
        `Device ${deviceId} disconnected during retry`
      );
    }

    logger?.debug('[BLE-Write] Windows write attempt', {
      deviceId,
      attempt,
      context: contextLabel,
    });

    const latestWrite = doGetWriteCharacteristic();
    if (!latestWrite) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Write characteristic not available for ${deviceId}`
      );
    }

    try {
      await writeCharacteristicWithAck(deviceId, latestWrite, payload);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger?.error('[BLE-Write] Windows write error', {
        deviceId,
        attempt,
        context: contextLabel,
        error: errorMessage,
      });
      // Abort immediately on known error patterns (e.g., status: 3)
      if (ABORTABLE_WRITE_ERROR_PATTERNS.some(p => p.test(errorMessage))) {
        await unsubscribeNotifications(deviceId).catch(() => {});
        await disconnectDevice(deviceId).catch(() => {});
        discoveredDevices.delete(deviceId);
        subscriptionOperations.set(deviceId, 'idle');
        logger?.info('[NobleBLE] Deep cleanup to reset device state to initial', { deviceId });
        // Reset subscription operation state to avoid entering intermediate states
        throw ERRORS.TypedError(
          HardwareErrorCode.BleConnectedError,
          `Write failed with abortable error for device ${deviceId}: ${errorMessage}`
        );
      }
    }

    // Check if paired already
    if (pairedDevices.has(deviceId)) {
      logger?.info('[BLE-Write] Windows write success (paired, exiting loop)', {
        deviceId,
        attempt,
        context: contextLabel,
      });
      return;
    }

    if (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
      await wait(timeoutMs);
    }

    if (pairedDevices.has(deviceId)) {
      logger?.info('[BLE-Write] Notification observed during wait (paired), exiting loop', {
        deviceId,
        attempt,
        context: contextLabel,
      });
      return;
    }

    // Try soft refresh first
    try {
      const notifyCharacteristic = deviceCharacteristics.get(deviceId)?.notify;
      await softRefreshSubscription({
        deviceId,
        notifyCharacteristic,
        subscriptionOperations,
        subscribedDevices,
        pairedDevices,
        notificationCallbacks,
        processNotificationData,
        logger,
      });
      logger?.info('[BLE-Write] Subscription refresh completed', { deviceId });
    } catch (refreshError) {
      const errMsg = refreshError instanceof Error ? refreshError.message : String(refreshError);
      logger?.error('[BLE-Write] Subscription refresh failed', { deviceId, error: errMsg });
    }
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.DeviceNotFound,
    `No response observed after ${RETRY_CONFIG.MAX_ATTEMPTS} writes: ${deviceId}`
  );
}

async function transmitHexDataToDevice(deviceId: string, hexData: string): Promise<void> {
  const characteristics = deviceCharacteristics.get(deviceId);
  const peripheral = connectedDevices.get(deviceId);
  if (!peripheral || !characteristics) {
    throw ERRORS.TypedError(
      HardwareErrorCode.BleCharacteristicNotFound,
      `Device ${deviceId} not connected or characteristics not available`
    );
  }
  // A request is now OUTSTANDING: stop the idle countdown entirely (the user
  // may take minutes on the device's confirm screen — that is not "idle") and
  // arm the long backstop instead so a device that never answers can't hold
  // the link forever. The complete-response handler re-arms the 60s idle clock.
  armIdleDisconnect(deviceId, BLE_BUSY_BACKSTOP_MS, 'busy-backstop');

  const toBuffer = Buffer.from(hexData, 'hex');
  logger?.info('[NobleBLE] Writing data:', {
    deviceId,
    dataLength: toBuffer.length,
    firstBytes: toBuffer.subarray(0, 8).toString('hex'),
  });

  const doGetWriteCharacteristic = () => deviceCharacteristics.get(deviceId)?.write;

  if (!IS_WINDOWS || pairedDevices.has(deviceId)) {
    // macOS / Linux or already paired on Windows: direct write
    const writeCharacteristic = doGetWriteCharacteristic();
    if (!writeCharacteristic) {
      throw ERRORS.TypedError(
        HardwareErrorCode.BleCharacteristicNotFound,
        `Write characteristic not available for ${deviceId}`
      );
    }
    if (toBuffer.length <= BLE_PACKET_SIZE) {
      await wait(UNIFIED_WRITE_DELAY);
      await writeCharacteristicWithAck(deviceId, writeCharacteristic, toBuffer);
      return;
    }
    // chunked
    for (let offset = 0; offset < toBuffer.length; ) {
      const chunkSize = Math.min(BLE_PACKET_SIZE, toBuffer.length - offset);
      const chunk = toBuffer.subarray(offset, offset + chunkSize);
      offset += chunkSize;
      const latest = doGetWriteCharacteristic();
      if (!latest) {
        throw ERRORS.TypedError(
          HardwareErrorCode.BleCharacteristicNotFound,
          `Write characteristic not available for ${deviceId}`
        );
      }
      await writeCharacteristicWithAck(deviceId, latest, chunk);
      if (offset < toBuffer.length) {
        await wait(UNIFIED_WRITE_DELAY);
      }
    }
    return;
  }

  // Windows unpaired path: use loop
  if (toBuffer.length <= BLE_PACKET_SIZE) {
    await wait(UNIFIED_WRITE_DELAY);
    await attemptWindowsWriteUntilPaired(deviceId, doGetWriteCharacteristic, toBuffer, 'single');
    return;
  }
  // chunked loop
  for (let offset = 0, idx = 0; offset < toBuffer.length; idx++) {
    const chunkSize = Math.min(BLE_PACKET_SIZE, toBuffer.length - offset);
    const chunk = toBuffer.subarray(offset, offset + chunkSize);
    offset += chunkSize;
    await attemptWindowsWriteUntilPaired(
      deviceId,
      doGetWriteCharacteristic,
      chunk,
      `chunk-${idx + 1}`
    );
    if (offset < toBuffer.length) {
      await wait(UNIFIED_WRITE_DELAY);
    }
  }
}

// Handle discovered device (for general enumeration only)
function handleDeviceDiscovered(peripheral: Peripheral): void {
  const deviceName = peripheral.advertisement?.localName || 'Unknown Device';

  // Only process OneKey devices for general discovery
  if (!isOnekeyDevice(deviceName)) {
    return;
  }

  logger?.info('[NobleBLE] Discovered OneKey device:', deviceName);
  discoveredDevices.set(peripheral.id, peripheral);
}

// Ensure discover listener is properly set up
// This fixes the issue where devices are not found after web-usb communication failures
function ensureDiscoverListener(): void {
  if (!noble) return;

  // Check if discover listener exists by checking listener count
  const listenerCount = (noble as any).listenerCount('discover');

  if (listenerCount === 0) {
    logger?.info('[NobleBLE] Discover listener missing, re-adding it');
    noble.on('discover', (peripheral: Peripheral) => {
      handleDeviceDiscovered(peripheral);
    });
  } else {
    logger?.debug('[NobleBLE] Discover listener already exists, count:', listenerCount);
  }
}

// Perform targeted scan for a specific device ID
// Uses self-contained local listener pattern - no global state needed
async function performTargetedScan(targetDeviceId: string): Promise<Peripheral | null> {
  if (!noble) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not available');
  }

  // Capture noble reference for use in closures (TypeScript narrowing)
  const nobleInstance = noble;

  logger?.info('[NobleBLE] Starting targeted scan for device:', targetDeviceId);

  return new Promise((resolve, reject) => {
    // Local discover listener - only matches target device
    const onDiscover = (peripheral: Peripheral) => {
      if (peripheral.id === targetDeviceId) {
        logger?.info('[NobleBLE] Target device found during targeted scan:', {
          id: peripheral.id,
          name: peripheral.advertisement?.localName,
        });
        clearTimeout(timeoutId);
        nobleInstance.removeListener('discover', onDiscover);
        nobleInstance.stopScanning();
        discoveredDevices.set(peripheral.id, peripheral);
        resolve(peripheral);
      }
    };

    // Timeout handler - must be after onDiscover so it can reference it
    const timeoutId = setTimeout(() => {
      nobleInstance.removeListener('discover', onDiscover);
      nobleInstance.stopScanning();
      logger?.info('[NobleBLE] Targeted scan timeout for device:', targetDeviceId);
      bleTrace('scan.targeted.timeout', { deviceId: targetDeviceId });
      resolve(null);
    }, FAST_SCAN_TIMEOUT);

    // Add local listener for this scan
    nobleInstance.on('discover', onDiscover);

    // Start scanning
    nobleInstance.startScanning(ONEKEY_SERVICE_UUIDS, false, (error?: Error) => {
      if (error) {
        clearTimeout(timeoutId);
        nobleInstance.removeListener('discover', onDiscover);
        logger?.error('[NobleBLE] Failed to start targeted scan:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.message));
        return;
      }
      logger?.info('[NobleBLE] Targeted scan started for device:', targetDeviceId);
    });
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

  // Capture noble reference for use in closures (TypeScript narrowing)
  const nobleInstance = noble;

  logger?.info('[NobleBLE] Starting device enumeration');

  // Clear previous discoveries
  discoveredDevices.clear();

  // Ensure discover listener is properly set up before scanning
  // This is crucial to fix the issue where devices are not found after web-usb failures
  ensureDiscoverListener();

  return new Promise((resolve, reject) => {
    const devices: DeviceInfo[] = [];
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // Cleanup function: clears both timeout and interval
    const cleanup = () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      nobleInstance.stopScanning();
    };

    // Collect discovered devices into the devices array
    const checkDevices = () => {
      discoveredDevices.forEach((peripheral, id) => {
        const existingDevice = devices.find(d => d.id === id);
        if (!existingDevice) {
          const deviceName = peripheral.advertisement?.localName || 'Unknown Device';
          devices.push({
            commType: 'electron-ble',
            id,
            name: deviceName,
            state: peripheral.state || 'disconnected',
          });
        }
      });
    };

    // Set timeout for scanning
    const timeoutId = setTimeout(() => {
      cleanup();
      logger?.info('[NobleBLE] Scan completed, found devices:', devices.length);
      bleTraceVerbose('scan.enumerate.done', { found: devices.length });
      resolve(devices);
    }, DEVICE_SCAN_TIMEOUT);

    // Start scanning for OneKey service UUIDs
    nobleInstance.startScanning(ONEKEY_SERVICE_UUIDS, false, (error?: Error) => {
      if (error) {
        cleanup();
        logger?.error('[NobleBLE] Failed to start scanning:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.message));
        return;
      }

      logger?.info('[NobleBLE] Scanning started for OneKey devices');

      // Check for devices periodically
      intervalId = setInterval(checkDevices, DEVICE_CHECK_INTERVAL);
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

// Clean up all Noble listeners (for app exit)
function cleanupNobleListeners(): void {
  if (!noble) return;

  // Remove all listeners to prevent memory leaks
  // Noble uses EventEmitter, need to use removeAllListeners
  try {
    (noble as any).removeAllListeners('discover');
    (noble as any).removeAllListeners('stateChange');
    logger?.info('[NobleBLE] All Noble listeners cleaned up');
  } catch (error) {
    logger?.error('[NobleBLE] Failed to clean up some listeners:', error);
  }
}

// Get device info - supports both discovered and direct connection modes
function getDevice(deviceId: string): DeviceInfo | null {
  // First check if device was discovered through scanning
  const peripheral = discoveredDevices.get(deviceId);
  if (peripheral) {
    const deviceName = peripheral.advertisement?.localName || 'Unknown Device';
    return {
      commType: 'electron-ble',
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
      commType: 'electron-ble',
      id: connectedPeripheral.id,
      name: deviceName,
      state: connectedPeripheral.state || 'connected',
    };
  }

  // For direct connection mode, return a placeholder device info
  // This allows the connection process to proceed without prior discovery
  return {
    commType: 'electron-ble',
    id: deviceId,
    name: 'OneKey Device',
    state: 'disconnected',
  };
}

/**
 * Core service discovery function with timeout and disconnect protection.
 *
 * Design: Uses Promise.race + try/finally pattern instead of flags.
 * - Promisify Noble callbacks → async/await flow control
 * - Promise.race → handle timeout/disconnect racing
 * - try/finally → guaranteed cleanup
 * - No manual flags needed - Promise semantics handle completion
 */
async function discoverServicesAndCharacteristics(
  peripheral: Peripheral,
  options?: { unfiltered?: boolean; shortUuidFilter?: boolean }
): Promise<CharacteristicPair> {
  // Cleanup resources - will be set up and cleaned in try/finally
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onDisconnect: (() => void) | undefined;

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (onDisconnect) peripheral.removeListener('disconnect', onDisconnect);
  };

  // Racing promises for timeout and disconnect
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logger?.error('[NobleBLE] Service discovery timeout');
      reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, 'Service discovery timeout'));
    }, SERVICE_DISCOVERY_TIMEOUT);
  });

  const disconnectPromise = new Promise<never>((_, reject) => {
    onDisconnect = () => {
      logger?.error('[NobleBLE] Device disconnected during service discovery');
      reject(
        ERRORS.TypedError(
          HardwareErrorCode.BleServiceNotFound,
          'Device disconnected during service discovery'
        )
      );
    };
    peripheral.once('disconnect', onDisconnect);
  });

  // Main discovery logic as async function
  const discoveryPromise = (async (): Promise<CharacteristicPair> => {
    // Step 1: Discover services (promisified). In unfiltered mode we discover
    // everything and pick the OneKey service in JS — field data (Classic,
    // 2026-07-19) showed the UUID-filtered query returning empty on a link
    // where an unfiltered probe saw 5 services, so the filter itself is under
    // suspicion (same failure family as the Windows scan-filter issue).
    // 'filtered16' passes the 2-byte SHORT form: CBUUID equality is semantic
    // (long==short, verified experimentally), but the long string keeps a
    // 16-byte internal representation — the encoding that goes into the
    // targeted over-the-air ATT query. If short-form filtering succeeds where
    // long-form fails on the same fresh link, the wire-encoding mismatch
    // against the device's 2-byte GATT registration is proven end to end.
    let serviceFilter: string[];
    if (options?.unfiltered) {
      serviceFilter = [];
    } else if (options?.shortUuidFilter) {
      serviceFilter = ONEKEY_SERVICE_UUIDS.map(uuid16Key);
    } else {
      serviceFilter = ONEKEY_SERVICE_UUIDS;
    }
    const services = await new Promise<Service[]>((resolve, reject) => {
      peripheral.discoverServices(serviceFilter, (error, svc) => {
        if (error) {
          logger?.error('[NobleBLE] Service discovery failed:', error);
          reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, error.message));
        } else {
          resolve(svc);
        }
      });
    });

    if (!services || services.length === 0) {
      throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, 'No OneKey services found');
    }

    // Always pick by 16-bit key: our constants are Bluetooth-base-UUID long
    // forms while noble on macOS reports base-UUID services in SHORT form
    // ('0001') — a naive full-string compare misses them (field-confirmed on
    // Classic, 2026-07-19: the OneKey service was present as '0001').
    const wanted = ONEKEY_SERVICE_UUIDS.map(uuid16Key);
    const service = services.find(svc => wanted.includes(uuid16Key(svc.uuid)));
    if (!service) {
      // Carry the full UUID list in the error so the trace shows exactly
      // what the device exposed — the datum that decides filter-bug vs
      // service-hidden.
      throw ERRORS.TypedError(
        HardwareErrorCode.BleServiceNotFound,
        `No OneKey service in result set: ${services.map(svc => svc.uuid).join('|')}`
      );
    }
    logger?.info('[NobleBLE] Found service:', service.uuid);
    // Always record the full service list AND the exact uuid string of the
    // pick — across modes and platforms this shows which uuid FORM (short
    // '0001' vs long base form) each noble backend reports, the datum behind
    // the filtered-query mismatch.
    bleTraceVerbose('gatt.discovery.services', {
      mode: options?.unfiltered ? 'unfiltered' : `filtered:${serviceFilter.join(',')}`,
      uuids: services.map(svc => svc.uuid).join('|'),
      picked: service.uuid,
    });

    // Step 2: Discover characteristics (promisified). Mirror the service-level
    // filter strategy — same wire-encoding considerations apply.
    let characteristicFilter: string[];
    if (options?.unfiltered) {
      characteristicFilter = [];
    } else if (options?.shortUuidFilter) {
      characteristicFilter = [
        ONEKEY_WRITE_CHARACTERISTIC_UUID,
        ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
      ].map(uuid16Key);
    } else {
      characteristicFilter = [ONEKEY_WRITE_CHARACTERISTIC_UUID, ONEKEY_NOTIFY_CHARACTERISTIC_UUID];
    }
    const characteristics = await new Promise<Characteristic[]>((resolve, reject) => {
      service.discoverCharacteristics(characteristicFilter, (error, chars) => {
        if (error) {
          logger?.error('[NobleBLE] Characteristic discovery failed:', error);
          reject(ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound, error.message));
        } else {
          resolve(chars);
        }
      });
    });

    // Step 3: Find required characteristics
    logger?.info('[NobleBLE] Discovered characteristics:', {
      count: characteristics?.length || 0,
      uuids: characteristics?.map(c => c.uuid) || [],
    });

    let writeCharacteristic: Characteristic | null = null;
    let notifyCharacteristic: Characteristic | null = null;

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
      throw ERRORS.TypedError(
        HardwareErrorCode.BleCharacteristicNotFound,
        'Required characteristics not found'
      );
    }

    return { write: writeCharacteristic, notify: notifyCharacteristic };
  })();

  // Race between discovery, timeout, and disconnect
  // Promise.race ensures first completion wins, others are ignored
  try {
    return await Promise.race([discoveryPromise, timeoutPromise, disconnectPromise]);
  } finally {
    // Guaranteed cleanup regardless of outcome
    cleanup();
  }
}

/**
 * Force reconnect to clear potential connection state issues (GATT cache).
 *
 * IMPORTANT: This function removes all disconnect listeners during reconnect.
 * Caller MUST call setupDisconnectListener() after this function returns.
 */
async function forceReconnectPeripheral(peripheral: Peripheral, deviceId: string): Promise<void> {
  logger?.info('[NobleBLE] Forcing connection reset for device:', deviceId);

  // Step 1: Clean up all device state first
  cleanupDevice(deviceId, undefined, {
    cleanupConnection: true,
    sendDisconnectEvent: false,
    cancelOperations: true,
    reason: 'force-reconnect',
  });

  // Step 2: Force disconnect if connected
  if (peripheral.state === 'connected') {
    // Remove disconnect listener before intentional disconnect to avoid spurious events
    peripheral.removeAllListeners('disconnect');
    await new Promise<void>(resolve => {
      peripheral.disconnect(() => {
        logger?.info('[NobleBLE] Force disconnect completed');
        resolve();
      });
    });
  }

  // Step 3: Re-establish connection
  await new Promise<void>((resolve, reject) => {
    peripheral.connect((error: Error | undefined) => {
      if (error) {
        logger?.error('[NobleBLE] Force reconnect failed:', error);
        reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, error.message));
      } else {
        logger?.info('[NobleBLE] Force reconnect successful');
        connectedDevices.set(deviceId, peripheral);
        resolve();
      }
    });
  });

  // Wait for connection to stabilize
  await wait(500);

  // NOTE: Caller MUST call setupDisconnectListener() after this function returns
}

// Last resort: Fresh scan to get completely new peripheral object and discover services
async function freshScanAndDiscoverTraced(
  deviceId: string,
  webContents: WebContents
): Promise<CharacteristicPair> {
  bleTrace('gatt.freshScan.start', { deviceId });
  try {
    const result = await freshScanAndDiscover(deviceId, webContents);
    bleTrace('gatt.freshScan.done', { deviceId });
    return result;
  } catch (error) {
    bleTrace('gatt.freshScan.error', { deviceId, error: String(error) });
    throw error;
  }
}

async function freshScanAndDiscover(
  deviceId: string,
  webContents: WebContents
): Promise<CharacteristicPair> {
  logger?.info(
    '[NobleBLE] Performing fresh scan to get new peripheral object for device:',
    deviceId
  );

  // The device does not advertise while WE hold a link to it — scanning with
  // the old (possibly wedged) connection still up would just time out. Drop it
  // first, bounded, so the device goes back on air.
  const stalePeripheral = connectedDevices.get(deviceId) ?? discoveredDevices.get(deviceId);
  if (stalePeripheral && stalePeripheral.state === 'connected') {
    bleTrace('gatt.freshScan.predisconnect', { deviceId });
    stalePeripheral.removeAllListeners('disconnect');
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, BLE_DISCONNECT_TIMEOUT_MS);
      stalePeripheral.disconnect(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    connectedDevices.delete(deviceId);
  }

  const freshPeripheral = await performTargetedScan(deviceId);
  if (!freshPeripheral) {
    // Deep cleanup: fresh scan found no device, reset to initial state
    discoveredDevices.delete(deviceId);
    subscriptionOperations.set(deviceId, 'idle');
    logger?.info('[NobleBLE] Deep cleanup before throwing DeviceNotFound (fresh scan null)', {
      deviceId,
    });
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Device ${deviceId} not found in fresh scan`
    );
  }

  // Update device maps with fresh peripheral
  discoveredDevices.set(deviceId, freshPeripheral);

  // Connect to fresh peripheral
  await new Promise<void>((resolve, reject) => {
    freshPeripheral.connect((error: Error | undefined) => {
      if (error) {
        reject(
          ERRORS.TypedError(
            HardwareErrorCode.BleConnectedError,
            `Fresh peripheral connection failed: ${error.message}`
          )
        );
      } else {
        connectedDevices.set(deviceId, freshPeripheral);
        resolve();
      }
    });
  });

  // Setup disconnect listener for fresh peripheral
  setupDisconnectListener(freshPeripheral, deviceId, webContents);

  // Wait for connection to stabilize (fresh peripheral doesn't need GATT cache clearing)
  await wait(500);

  // Attempt service discovery with fresh peripheral
  logger?.info('[NobleBLE] Attempting service discovery with fresh peripheral');
  return discoverServicesAndCharacteristics(freshPeripheral);
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

      if (attemptNumber > 1) {
        logger?.info(`[NobleBLE] Service discovery retry attempt ${attemptNumber}/5`);
      }

      // Verify connection state before attempting service discovery
      if (peripheral.state !== 'connected') {
        throw ERRORS.TypedError(
          HardwareErrorCode.BleConnectedError,
          `Device not connected: ${peripheral.state}`
        );
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

/**
 * Setup connection and discover services for a peripheral.
 * Common logic extracted from connectDevice to avoid duplication.
 *
 * @returns CharacteristicPair on success
 * @throws Error on failure (caller should handle cleanup)
 */
async function setupConnectionAndDiscoverServices(
  peripheral: Peripheral,
  deviceId: string,
  webContents: WebContents
): Promise<CharacteristicPair> {
  const startedAt = Date.now();
  setupDisconnectListener(peripheral, deviceId, webContents);

  // Optimistic path first: the link at this point was either just established
  // or is a healthy kept-alive one, so its GATT cache has no reason to be
  // stale. The old unconditional force-reconnect ("clear GATT cache") doubled
  // every connect (~1.3s extra + a second macOS pairing prompt); it is now the
  // FALLBACK for the one case it actually fixes — a discovery failure.
  if (peripheral.state === 'connected') {
    // Two direct attempts: immediate, then once more after a settle delay.
    // Field data (Classic, 2026-07-19): discovery ~115ms after link-up returns
    // "No OneKey services found" — the GATT/encryption isn't ready yet — while
    // the force-reconnect route succeeded only because of its internal 500ms
    // stabilize wait. Retrying on the SAME link after the settle avoids the
    // second physical connect (and its extra pairing prompt) entirely.
    // Filtered query first where it can win; UNFILTERED discovery with 16-bit
    // key JS matching as the reliable route. On macOS the filtered query
    // always misses (noble/mac reports base-UUIDs short-form, field-confirmed
    // on Classic 2026-07-19) — skip it there and save ~100ms per cold connect.
    // Other platforms keep the filtered attempt until their uuid form is
    // field-confirmed via the gatt.discovery.services trace.
    // ONEKEY_BLE_DIAG=1 re-enables the filtered attempt on macOS as a probe:
    // its per-combination success/failure (route field + direct.miss traces) is
    // the readout for the device-model / BLE-firmware / CB-cache test matrix.
    const discoveryAttempts =
      process.platform === 'darwin' && process.env.ONEKEY_BLE_DIAG !== '1'
        ? (['unfiltered'] as const)
        : (['filtered', 'filtered16', 'unfiltered'] as const);
    // One self-contained conclusion line per cold connect (filter console by
    // "verdict"): which discovery strategies missed/succeeded on this link.
    const attemptResults: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const attempt of discoveryAttempts) {
      if (attempt === 'unfiltered') {
        bleTraceVerbose('gatt.discovery.direct.retry', { deviceId, mode: attempt });
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await discoverServicesAndCharacteristics(peripheral, {
          unfiltered: attempt === 'unfiltered',
          shortUuidFilter: attempt === 'filtered16',
        });
        attemptResults.push(`${attempt}=ok`);
        // The filtered attempts are DIAGNOSTIC PROBES only (they exist to
        // answer the uuid wire-encoding question); the link is always built
        // from the unfiltered result so probe outcomes never change behavior.
        if (attempt !== 'unfiltered') {
          // eslint-disable-next-line no-continue
          continue;
        }
        connectedDevices.set(deviceId, peripheral);
        bleTrace('gatt.discovery.verdict', {
          deviceId,
          attempts: attemptResults.join(','),
          route: `direct-${attempt}`,
          elapsedMs: Date.now() - startedAt,
        });
        return result;
      } catch (directError) {
        attemptResults.push(`${attempt}=miss`);
        bleTrace('gatt.discovery.direct.miss', {
          deviceId,
          mode: attempt,
          elapsedMs: Date.now() - startedAt,
          error: String(directError),
        });
      }
      if (peripheral.state !== 'connected') break;
    }
    bleTrace('gatt.discovery.verdict', {
      deviceId,
      attempts: attemptResults.join(','),
      route: 'escalating-to-force-reconnect',
      elapsedMs: Date.now() - startedAt,
    });
  } else {
    bleTrace('gatt.discovery.direct.skip', { deviceId, state: peripheral.state });
  }

  // Fallback: force reconnect to clear a stale GATT cache, then full retry
  // ladder. A failure of the force-reconnect ITSELF must also escalate to the
  // fresh scan — not propagate out of the ladder.
  try {
    bleTrace('gatt.forceReconnect.start', { deviceId });
    await forceReconnectPeripheral(peripheral, deviceId);
    bleTrace('gatt.forceReconnect.done', { deviceId, elapsedMs: Date.now() - startedAt });
    // forceReconnectPeripheral strips listeners — re-attach.
    setupDisconnectListener(peripheral, deviceId, webContents);

    const result = await discoverServicesAndCharacteristicsWithRetry(peripheral, deviceId);
    bleTrace('gatt.discovery.done', {
      deviceId,
      elapsedMs: Date.now() - startedAt,
      route: 'force-reconnect',
    });
    return result;
  } catch (error) {
    // Last resort: fresh scan to get new peripheral object
    logger?.error('[NobleBLE] Service discovery failed, attempting fresh scan...', error);
    // The encryption-gated GATT fails HERE when the OS bond is broken — this
    // trace is the signature of a "device can never connect" state.
    bleTrace('gatt.discovery.error', {
      deviceId,
      elapsedMs: Date.now() - startedAt,
      error: String(error),
    });
    return freshScanAndDiscoverTraced(deviceId, webContents);
  }
}

// Direct connect-by-id timeout. Kept short: the fallback (targeted scan,
// 1.5s window) is cheap, so a stuck retrieval must not stall the connect flow.
const DIRECT_CONNECT_TIMEOUT_MS = 2000;
// After a direct-connect timeout (device off / out of range), skip the direct
// attempt for this long. ensureConnected retries the whole connect up to 5
// times with backoff — without the cooldown every retry would re-pay the 2s
// timeout against a device that is simply not there.
const DIRECT_CONNECT_COOLDOWN_MS = 15_000;
const directConnectCooldownUntil = new Map<string, number>();

/**
 * Bounded connect-by-id with no scan. Returns the connected peripheral, or
 * undefined so the caller falls back to the targeted scan. Never throws.
 * A LATE success after the timeout is disconnected unless the scan path has
 * already claimed the device (same orphan-link hazard as a late connect).
 */
async function tryDirectConnectById(deviceId: string): Promise<Peripheral | undefined> {
  if (!noble || typeof noble.connectAsync !== 'function') return undefined;
  if ((directConnectCooldownUntil.get(deviceId) ?? 0) > Date.now()) {
    bleTraceVerbose('connect.direct.cooldown', { deviceId });
    return undefined;
  }
  const startedAt = Date.now();
  bleTraceVerbose('connect.direct.start', { deviceId });
  try {
    // Hold the ORIGINAL promise: the late-orphan guard must attach to this
    // pending connect, not issue a second connect request.
    const directPromise = noble.connectAsync(deviceId);
    const raced = await Promise.race([
      directPromise,
      new Promise<'timeout'>(resolve => {
        setTimeout(() => resolve('timeout'), DIRECT_CONNECT_TIMEOUT_MS);
      }),
    ]);
    if (raced === 'timeout') {
      directConnectCooldownUntil.set(deviceId, Date.now() + DIRECT_CONNECT_COOLDOWN_MS);
      bleTrace('connect.direct.timeout', { deviceId, elapsedMs: Date.now() - startedAt });
      // If the pending connect completes later, drop it unless someone claimed it.
      directPromise
        .then(late => {
          const latePeripheral = late ?? discoveredDevices.get(deviceId);
          if (
            latePeripheral &&
            latePeripheral.state === 'connected' &&
            !connectedDevices.has(deviceId)
          ) {
            bleTrace('connect.direct.late', { deviceId });
            latePeripheral.removeAllListeners('disconnect');
            latePeripheral.disconnect(() => {});
          }
        })
        .catch(() => {});
      return undefined;
    }
    // Backends emit a `discover` for the peripheral as a side effect, so the
    // cache may hold it even when connectAsync resolves without a value.
    const peripheral = raced ?? discoveredDevices.get(deviceId);
    bleTraceVerbose('connect.direct.done', {
      deviceId,
      elapsedMs: Date.now() - startedAt,
      found: Boolean(peripheral),
      state: peripheral?.state,
    });
    if (!peripheral || peripheral.state !== 'connected') return undefined;
    discoveredDevices.set(deviceId, peripheral);
    return peripheral;
  } catch (error) {
    bleTrace('connect.direct.error', {
      deviceId,
      elapsedMs: Date.now() - startedAt,
      error: String(error),
    });
    return undefined;
  }
}

/**
 * Forensic probes (ONEKEY_BLE_DIAG=1 only), run AFTER subscribe succeeds —
 * i.e. after the encrypted characteristic has been touched, so link
 * encryption is established. The decisive readout for WHY the filtered
 * discovery fails on a fresh link:
 *  - filtered probe fails pre-encryption (the cold-connect miss) but succeeds
 *    here -> the device answers targeted ATT queries only when encrypted;
 *  - fails here too -> the targeted query is never answered by this firmware;
 *  - elapsedMs classifies the answer source: <~20ms = CB cache, more = air.
 * The unfiltered probe right after calibrates cache-answer latency on this
 * link. Fire-and-forget; must never disturb the call path.
 */
function runDiagProbes(deviceId: string): void {
  if (process.env.ONEKEY_BLE_DIAG !== '1') return;
  const peripheral = connectedDevices.get(deviceId);
  if (!peripheral || peripheral.state !== 'connected') return;

  const probe = (label: string, filter: string[]) =>
    new Promise<void>(resolve => {
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        bleTrace(`gatt.diag.${label}`, { deviceId, result: 'timeout', elapsedMs: 3000 });
        resolve();
      }, 3000);
      peripheral.discoverServices(filter, (error, services) => {
        clearTimeout(timer);
        bleTrace(`gatt.diag.${label}`, {
          deviceId,
          elapsedMs: Date.now() - startedAt,
          error: error ? String(error) : undefined,
          uuids: (services ?? []).map(svc => svc.uuid).join('|') || '<empty>',
        });
        resolve();
      });
    });

  probe('filteredProbe', ONEKEY_SERVICE_UUIDS)
    .then(() => probe('unfilteredProbe', []))
    .catch(() => {
      // forensics must never break the flow
    });
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
  bleTraceVerbose('connect.request', {
    deviceId,
    hasDiscovered: discoveredDevices.has(deviceId),
    hasConnected: connectedDevices.has(deviceId),
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

    // First: bounded connect-by-id with NO scan (proven in the Trezor
    // connector, commit 93034545). Saves the ~650ms targeted scan for a device
    // CoreBluetooth already knows, and reaches a device that is not currently
    // advertising. Time-boxed because noble/mac silently never resolves for an
    // id CB cannot retrieve; on timeout we fall through to the scan.
    peripheral = await tryDirectConnectById(deviceId);

    // Perform a targeted scan to find the specific device
    try {
      const foundPeripheral = peripheral ?? (await performTargetedScan(deviceId));
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
    bleTraceVerbose('connect.reuse', { deviceId });

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
          'skip reconnect'
        );
        // Ongoing subscription operation, avoid recursive reconnect loop; return and wait for completion
        return;
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

    // Setup connection and discover services
    const characteristics = await setupConnectionAndDiscoverServices(
      peripheral,
      deviceId,
      webContents
    );
    deviceCharacteristics.set(deviceId, characteristics);
    logger?.info('[NobleBLE] Device ready for communication:', deviceId);
    return;
  }

  return new Promise((resolve, reject) => {
    const connectStartedAt = Date.now();
    bleTraceVerbose('connect.link.start', { deviceId });
    // Once the timeout has rejected, the noble callback may STILL fire with a
    // successful late connection. Without this guard that link would be
    // registered but ownerless — the IPC handler already failed, so nothing
    // arms its idle timer and it blocks the device until window teardown.
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      bleTrace('connect.link.timeout', { deviceId, elapsedMs: Date.now() - connectStartedAt });
      reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'Connection timeout'));
    }, CONNECTION_TIMEOUT);

    // TypeScript type assertion - peripheral is guaranteed to be defined at this point
    const connectedPeripheral = peripheral as Peripheral;
    connectedPeripheral.connect(async (error: Error | undefined) => {
      clearTimeout(timeout);

      if (timedOut) {
        if (!error && connectedPeripheral.state === 'connected') {
          bleTrace('connect.link.late', { deviceId, elapsedMs: Date.now() - connectStartedAt });
          logger?.info('[NobleBLE] Late connection after timeout, disconnecting:', deviceId);
          connectedPeripheral.disconnect(() => {});
        }
        return;
      }

      if (error) {
        logger?.error('[NobleBLE] Connection failed:', error);
        bleTrace('connect.link.error', {
          deviceId,
          elapsedMs: Date.now() - connectStartedAt,
          error: error.message,
        });
        reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, error.message));
        return;
      }

      logger?.info('[NobleBLE] Connected to device:', deviceId);
      bleTraceVerbose('connect.link.done', { deviceId, elapsedMs: Date.now() - connectStartedAt });
      connectedDevices.set(deviceId, connectedPeripheral);

      // Setup connection and discover services
      try {
        const characteristics = await setupConnectionAndDiscoverServices(
          connectedPeripheral,
          deviceId,
          webContents
        );
        deviceCharacteristics.set(deviceId, characteristics);
        logger?.info('[NobleBLE] Device ready for communication:', deviceId);
        bleTrace('connect.ready', { deviceId, elapsedMs: Date.now() - connectStartedAt });
        resolve();
      } catch (setupError) {
        logger?.error('[NobleBLE] Connection setup failed:', setupError);
        bleTrace('connect.setup.error', { deviceId, error: String(setupError) });
        connectedPeripheral.disconnect(() => {
          reject(setupError);
        });
      }
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
      cleanupDevice(deviceId, undefined, {
        cleanupConnection: true,
        sendDisconnectEvent: false,
        cancelOperations: true,
        reason: 'manual-disconnect',
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

  try {
    await new Promise<void>((resolve, reject) => {
      notifyCharacteristic.unsubscribe((error: Error | undefined) => {
        if (error) {
          logger?.error('[NobleBLE] Notification unsubscription failed:', error);
          reject(error);
        } else {
          logger?.info('[NobleBLE] Notification unsubscription successful');
          resolve();
        }
      });
    });

    // Remove all listeners and clear subscription status
    notifyCharacteristic.removeAllListeners('data');
    notificationCallbacks.delete(deviceId);
    devicePacketStates.delete(deviceId);
    subscribedDevices.delete(deviceId);
  } finally {
    // 🔒 CRITICAL: Always clear operation state (even on error)
    subscriptionOperations.set(deviceId, 'idle');
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
    throw ERRORS.TypedError(
      HardwareErrorCode.BleCharacteristicNotFound,
      `Device ${deviceId} not connected or characteristics not available`
    );
  }

  const { notify: notifyCharacteristic } = characteristics;

  logger?.info('[NobleBLE] Subscribing to notifications for device:', deviceId);

  // 🔒 CRITICAL: Check operation state FIRST to prevent race conditions
  const opState = subscriptionOperations.get(deviceId);

  logger?.info('[NobleBLE] Subscribe context', {
    deviceId,
    opStateBefore: opState || 'idle',
    paired: false,
    hasController: false,
  });

  // If a subscription is already in progress, dedupe
  if (opState === 'subscribing') {
    logger?.info('[NobleBLE] Subscription already in progress, updating callback only');
    notificationCallbacks.set(deviceId, callback);
    return Promise.resolve();
  }

  // 🚨 CRITICAL: Reject subscribe if unsubscribe is in progress
  // Let upper layer handle retry after device reconnection
  if (opState === 'unsubscribing') {
    logger?.error('[NobleBLE] Cannot subscribe while unsubscribe is in progress', {
      deviceId,
      opState,
    });
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceBusy,
      `Device ${deviceId} is currently unsubscribing, please retry after reconnection`
    );
  }

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
  }

  // Clean up listeners uniformly (avoid duplicate calls)
  notifyCharacteristic.removeAllListeners('data');

  // Store callback for this device
  notificationCallbacks.set(deviceId, callback);

  // Reset packet state for new subscription session
  devicePacketStates.set(deviceId, {
    bufferLength: 0,
    buffer: [],
    packetCount: 0,
    messageId: undefined,
  });

  // Helper: rebuild a clean application-layer subscription
  async function rebuildAppSubscription(
    deviceId: string,
    notifyCharacteristic: Characteristic
  ): Promise<void> {
    // Listeners already cleaned up above, no need to repeat
    await new Promise<void>(resolve => {
      notifyCharacteristic.unsubscribe(() => {
        resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      notifyCharacteristic.subscribe((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    notifyCharacteristic.on('data', (data: Buffer) => {
      // Windows BLE pairing detection: receiving any data means device is paired
      if (!pairedDevices.has(deviceId)) {
        pairedDevices.add(deviceId);
        logger?.info('[NobleBLE] Device paired successfully', { deviceId });
      }

      const result = processNotificationData(deviceId, data);
      if (result.error) {
        logger?.error('[NobleBLE] Packet processing error:', result.error);
        return;
      }
      if (result.isComplete && result.completePacket) {
        // Response complete — no request outstanding anymore. Swap the busy
        // backstop for the normal 60s idle countdown.
        armIdleDisconnect(deviceId);
        const appCb = notificationCallbacks.get(deviceId);
        if (appCb) appCb(result.completePacket);
      }
    });
  }

  try {
    await rebuildAppSubscription(deviceId, notifyCharacteristic);
    subscribedDevices.set(deviceId, true);
    // Encryption is established now (the encrypted characteristic answered).
    runDiagProbes(deviceId);
  } catch (error) {
    // A subscribe failure on the encryption-gated notify characteristic is the
    // classic broken-bond signature — must always be visible in the trace.
    bleTrace('subscribe.error', { deviceId, error: String(error) });
    throw error;
  } finally {
    // 🔒 CRITICAL: Always clear operation state (even on error)
    subscriptionOperations.set(deviceId, 'idle');
  }
}

// Setup IPC handlers
export function setupNobleBleHandlers(webContents: WebContents): void {
  // Use console.log for initial logging as electron-log might not be available yet.
  console.log('[NobleBLE] Attempting to set up Noble BLE handlers.');
  try {
    console.log('[NobleBLE] NOBLE_VERSION_771');

    // @ts-ignore – electron-log is only available at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    logger = require('electron-log') as Logger;
    console.log('[NobleBLE] electron-log loaded successfully.');

    // @ts-ignore – electron is only available at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { ipcMain } = require('electron');
    console.log('[NobleBLE] electron.ipcMain loaded successfully.');

    safeLog(logger, 'info', 'Setting up Noble BLE IPC handlers');

    // Handle enumerate request
    console.log(`[NobleBLE] Registering handler for: ${EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE}`);
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
        // A previously-armed idle timer must not fire mid-connect (a cold
        // connect with OS pairing can take ~30s).
        clearIdleDisconnect(deviceId);
        await connectDevice(deviceId, webContents);
        armIdleDisconnect(deviceId);
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
        logger?.info('[NobleBLE] IPC WRITE', { deviceId, len: hexData.length });
        await transmitHexDataToDevice(deviceId, hexData);
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
        armIdleDisconnect(deviceId);
      }
    );

    // Handle unsubscribe request
    ipcMain.handle(
      EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE,
      async (_event: IpcMainInvokeEvent, deviceId: string) => {
        await unsubscribeNotifications(deviceId);
        armIdleDisconnect(deviceId);
      }
    );

    // Handle cancel pairing: cleanup all connected devices
    ipcMain.handle(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING, async () => {
      const deviceIds = Array.from(connectedDevices.keys());
      logger?.info('[NobleBLE] Cancel pairing invoked', {
        platform: process.platform,
        deviceCount: deviceIds.length,
      });

      for (const deviceId of deviceIds) {
        try {
          // Unsubscribe and disconnect (disconnectDevice calls cleanupDevice internally)
          await unsubscribeNotifications(deviceId).catch(() => {});
          await disconnectDevice(deviceId).catch(() => {});

          // disconnectDevice already completed all cleanup, no need to call cleanupDevice again
        } catch (e) {
          logger?.error('[NobleBLE] Cancel pairing cleanup failed', { deviceId, error: e });
        }
      }
    });

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

      // 1. Clean up all connected devices (unified cleanup, avoid duplicates).
      // Physically disconnect too: with keep-alive release the link outlives
      // calls, and the main process can outlive this window (tray) — a held
      // link with no renderer would block the device for every other host.
      const deviceIds = Array.from(connectedDevices.keys());
      deviceIds.forEach(deviceId => {
        const peripheral = connectedDevices.get(deviceId);
        cleanupDevice(deviceId, undefined, {
          cleanupConnection: true,
          sendDisconnectEvent: false,
          cancelOperations: true,
          reason: 'app-quit',
        });
        if (peripheral && peripheral.state === 'connected') {
          peripheral.removeAllListeners('disconnect');
          peripheral.disconnect(() => {
            safeLog(logger, 'info', `Disconnected ${deviceId} on window teardown`);
          });
        }
      });

      // 2. Stop scanning
      stopScanning();

      // 3. Clean up Noble listeners
      if (noble && persistentStateListener) {
        noble.removeListener('stateChange', persistentStateListener);
        persistentStateListener = null;
      }
      cleanupNobleListeners();

      // 4. Clear discovered devices cache
      discoveredDevices.clear();

      safeLog(logger, 'info', 'Noble BLE cleanup completed');
    });

    safeLog(logger, 'info', 'Noble BLE IPC handlers setup completed');
  } catch (error) {
    console.error('[NobleBLE] Failed to setup IPC handlers:', error);
    throw error;
  }
}
