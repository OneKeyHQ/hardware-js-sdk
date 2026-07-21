import transport, { COMMON_HEADER_SIZE, LogBlockCommand } from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  createDeferred,
  isHeaderChunk,
} from '@onekeyfe/hd-shared';

import type { Deferred } from '@onekeyfe/hd-shared';
import type EventEmitter from 'events';
// Import DesktopAPI type from hd-transport-electron
import type { DesktopAPI } from '@onekeyfe/hd-transport-electron';

const { parseConfigure, buildBuffers, receiveOne, check } = transport;

// BLE debug trace, renderer side (console filter keyword "[BLE-TRACE]").
const bleTrace = (event: string, data?: Record<string, unknown>): void => {
  // Single stringified line so it can be copied as plain text.
  const dataText = data ? ` ${JSON.stringify(data)}` : '';
  // eslint-disable-next-line no-console
  console.log(
    `[BLE-TRACE] ${new Date().toISOString().slice(11, 23)} sdk-transport ${event}${dataText}`
  );
};

// Noble BLE specific API interface
declare global {
  interface Window {
    desktopApi?: DesktopAPI;
  }
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
};

// Packet processing result interface
interface PacketProcessResult {
  isComplete: boolean;
  completePacket?: string;
  error?: string;
}

export default class ElectronBleTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronBleTransport';

  configured = false;

  runPromise: Deferred<any> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  // Cache for connected devices
  private connectedDevices: Set<string> = new Set();

  // Data processing state
  private dataBuffers: Map<string, { buffer: number[]; bufferLength: number }> = new Map();

  // Notification cleanup functions
  private notificationCleanups: Map<string, () => void> = new Map();

  // Disconnect listener cleanup functions
  private disconnectCleanups: Map<string, () => void> = new Map();

  // Handle bluetooth related errors with proper error code mapping
  private handleBluetoothError(error: any): never {
    if (error && typeof error === 'object') {
      // Check for specific bluetooth error codes
      if ('code' in error) {
        if (error.code === HardwareErrorCode.BlePoweredOff) {
          throw ERRORS.TypedError(HardwareErrorCode.BlePoweredOff);
        }
        if (error.code === HardwareErrorCode.BleUnsupported) {
          throw ERRORS.TypedError(HardwareErrorCode.BleUnsupported);
        }
        if (error.code === HardwareErrorCode.BlePermissionError) {
          throw ERRORS.TypedError(HardwareErrorCode.BlePermissionError);
        }
      }
      // Check for error message containing bluetooth state related text using predefined messages
      const errorMessage = error.message || String(error);
      const poweredOffMessage = HardwareErrorCodeMessage[HardwareErrorCode.BlePoweredOff];
      const unsupportedMessage = HardwareErrorCodeMessage[HardwareErrorCode.BleUnsupported];
      const permissionMessage = HardwareErrorCodeMessage[HardwareErrorCode.BlePermissionError];

      if (errorMessage.includes(poweredOffMessage) || errorMessage.includes('poweredOff')) {
        throw ERRORS.TypedError(HardwareErrorCode.BlePoweredOff);
      }
      if (errorMessage.includes(unsupportedMessage) || errorMessage.includes('unsupported')) {
        throw ERRORS.TypedError(HardwareErrorCode.BleUnsupported);
      }
      if (errorMessage.includes(permissionMessage) || errorMessage.includes('unauthorized')) {
        throw ERRORS.TypedError(HardwareErrorCode.BlePermissionError);
      }
    }

    throw error;
  }

  // Clean up all device state and listeners - unified cleanup function
  private cleanupDeviceState(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
    this.dataBuffers.delete(deviceId);

    // Clean up notification listener
    const notifyCleanup = this.notificationCleanups.get(deviceId);
    if (notifyCleanup) {
      notifyCleanup();
      this.notificationCleanups.delete(deviceId);
    }

    // Clean up disconnect listener
    const disconnectCleanup = this.disconnectCleanups.get(deviceId);
    if (disconnectCleanup) {
      disconnectCleanup();
      this.disconnectCleanups.delete(deviceId);
    }
  }

  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;

    // Check if Noble BLE API is available
    if (!window.desktopApi?.nobleBle) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Noble BLE API is not available. Please ensure you are running in Electron with Noble support.'
      );
    }

    this.Log?.debug('[Transport] Noble BLE Transport initialized');
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {}

  async enumerate(): Promise<{ id: string; name: string }[]> {
    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      const devices = await window.desktopApi.nobleBle.enumerate();
      return devices;
    } catch (error) {
      this.Log?.error('[Transport] Noble BLE enumerate failed:', error);
      bleTrace('enumerate.error', { error: String(error) });
      this.handleBluetoothError(error);
    }
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    // Force clean running Promise
    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
    }

    // `step` pins down where a failed acquire died (subscribe = the
    // encryption-gated characteristic, the broken-OS-bond signature).
    let step = 'getDevice';
    const startedAt = Date.now();
    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      // Check if device is available
      const device = await window.desktopApi.nobleBle.getDevice(uuid);
      if (!device) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device ${uuid} not found`);
      }

      // Connect to device
      step = 'connect';
      try {
        await window.desktopApi.nobleBle.connect(uuid);
        this.connectedDevices.add(uuid);
      } catch (error) {
        this.handleBluetoothError(error);
      }

      // Initialize data buffer for this device
      this.dataBuffers.set(uuid, { buffer: [], bufferLength: 0 });

      // Subscribe to notifications
      step = 'subscribe';
      await window.desktopApi.nobleBle.subscribe(uuid);

      // Set up notification listener
      const cleanup = window.desktopApi.nobleBle.onNotification(
        (deviceId: string, data: string) => {
          if (deviceId === uuid) {
            this.handleNotificationData(uuid, data);
          }
        }
      );
      this.notificationCleanups.set(uuid, cleanup);

      // Set up disconnect listener
      const disconnectCleanup = window.desktopApi.nobleBle.onDeviceDisconnected(
        (disconnectedDevice: any) => {
          if (disconnectedDevice.id === uuid) {
            bleTrace('event.device-disconnect', { uuid });
            // Fail a call blocked on a dead link instead of hanging.
            if (this.runPromise) {
              this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
            }
            this.cleanupDeviceState(uuid);

            // Trigger disconnect event
            this.emitter?.emit('device-disconnect', {
              name: disconnectedDevice.name,
              id: disconnectedDevice.id,
              connectId: disconnectedDevice.id,
            });
          }
        }
      );
      this.disconnectCleanups.set(uuid, disconnectCleanup);

      // Trigger connect event
      this.emitter?.emit('device-connect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });

      return { uuid, path: uuid };
    } catch (error) {
      this.Log?.error('[Transport] Noble BLE acquire failed:', error);
      bleTrace('acquire.error', {
        uuid,
        step,
        elapsedMs: Date.now() - startedAt,
        error: String(error),
      });
      if (step === 'subscribe') {
        // Broken-bond signature: tear the link down so the next attempt
        // cold-connects and macOS can re-negotiate the bond.
        bleTrace('acquire.subscribe.teardown', { uuid });
        await this.disconnect(uuid);
      }
      throw error;
    }
  }

  async release(id: string) {
    // Logical release only — the link and subscription stay up for reuse; the
    // main process idle timer does the physical disconnect. Hard teardown is
    // `disconnect()`. Renderer listeners must still go, or the next acquire's
    // fresh listeners would double-process every packet.
    this.cleanupDeviceState(id);
    return Promise.resolve();
  }

  /**
   * Hard teardown for the SDK's error-recovery path (DeviceConnector
   * .disconnect); normal release() deliberately does not come here.
   */
  async disconnect(id: string) {
    bleTrace('disconnect.start', { id });
    // Independent best-effort steps, each time-boxed: on a wedged link the
    // underlying noble callbacks can simply never fire, and this is the
    // error-RECOVERY path — it must never hang the retry ladder.
    const bounded = async (label: string, ms: number, run: () => Promise<unknown> | undefined) => {
      try {
        const raced = await Promise.race([
          Promise.resolve(run()),
          new Promise<'timeout'>(resolve => {
            setTimeout(() => resolve('timeout'), ms);
          }),
        ]);
        if (raced === 'timeout') bleTrace(`disconnect.${label}.timeout`, { id, ms });
      } catch (error) {
        bleTrace(`disconnect.${label}.error`, { id, error: String(error) });
      }
    };
    await bounded('unsubscribe', 2000, () => window.desktopApi?.nobleBle?.unsubscribe(id));
    await bounded('disconnect', 3000, () => window.desktopApi?.nobleBle?.disconnect(id));
    bleTrace('disconnect.done', { id });
    this.cleanupDeviceState(id);
  }

  // Handle notification data from Noble BLE
  private handleNotificationData(deviceId: string, hexData: string): void {
    // Check for pairing rejection
    if (hexData === 'PAIRING_REJECTED') {
      this.Log?.debug('[Transport] Pairing rejection detected for device:', deviceId);
      bleTrace('event.pairing-rejected', { deviceId });
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled));
      }
      return;
    }

    const result = this.processNotificationPacket(deviceId, hexData);

    if (result.error) {
      this.Log?.error('[Transport] Packet processing error:', result.error);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
      return;
    }

    if (result.isComplete && result.completePacket) {
      if (this.runPromise) {
        this.runPromise.resolve(result.completePacket);
      }
    }
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';

    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    if (!this.connectedDevices.has(uuid)) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound, `Device ${uuid} not connected`);
    }

    this.runPromise = createDeferred();
    const messages = this._messages;

    // Log different types of commands appropriately
    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      this.Log?.debug('[Transport] Noble BLE call', 'name:', name, 'data:', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else if (LogBlockCommand.has(name)) {
      this.Log?.debug('[Transport] Noble BLE call', 'name:', name);
    } else {
      this.Log?.debug('[Transport] Noble BLE call', 'name:', name, 'data:', data);
    }

    const buffers = buildBuffers(messages, name, data);

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE write API not available');
      }

      // Write each buffer to the device
      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];

        if (!buffer || typeof buffer.toString !== 'function') {
          this.Log?.error(`[Transport] Noble BLE buffer ${i + 1} is invalid:`, buffer);
          throw new Error(`Buffer ${i + 1} is invalid`);
        }

        // Use ByteBuffer's toString('hex') method directly, similar to other transports
        const hexString = buffer.toString('hex');

        if (hexString.length === 0) {
          this.Log?.error(`[Transport] Noble BLE buffer ${i + 1} generated empty hex string`);
          throw new Error(`Buffer ${i + 1} is empty`);
        }

        await window.desktopApi.nobleBle.write(uuid, hexString);
      }

      // Wait for response
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.error('[Transport] Noble BLE call error:', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  // Process hex data from notification with validation and packet reassembly
  private processNotificationPacket(deviceId: string, hexData: string): PacketProcessResult {
    try {
      // Validate input
      if (typeof hexData !== 'string') {
        return { isComplete: false, error: 'Invalid hexData type' };
      }

      // Clean and validate hex format
      const cleanHexData = hexData.replace(/\s+/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(cleanHexData)) {
        return { isComplete: false, error: 'Invalid hex data format' };
      }

      // Convert hex string to Uint8Array
      const hexMatch = cleanHexData.match(/.{1,2}/g);
      if (!hexMatch) {
        return { isComplete: false, error: 'Failed to parse hex data' };
      }

      const data = new Uint8Array(hexMatch.map(byte => parseInt(byte, 16)));

      // Get buffer state
      const bufferState = this.dataBuffers.get(deviceId);
      if (!bufferState) {
        return { isComplete: false, error: 'No buffer state for device' };
      }

      // Process header or data chunk
      if (isHeaderChunk(data)) {
        const dataView = new DataView(data.buffer);
        bufferState.bufferLength = dataView.getInt32(5, false);
        bufferState.buffer = [...data.subarray(3)];
      } else {
        bufferState.buffer = bufferState.buffer.concat([...data]);
      }

      // Check if packet is complete
      if (bufferState.buffer.length - COMMON_HEADER_SIZE >= bufferState.bufferLength) {
        const completeBuffer = new Uint8Array(bufferState.buffer);

        // Reset buffer state
        bufferState.bufferLength = 0;
        bufferState.buffer = [];

        // Convert to hex string
        const hexString = Array.from(completeBuffer)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        return { isComplete: true, completePacket: hexString };
      }

      return { isComplete: false };
    } catch (error) {
      return { isComplete: false, error: `Packet processing error: ${error}` };
    }
  }
}
