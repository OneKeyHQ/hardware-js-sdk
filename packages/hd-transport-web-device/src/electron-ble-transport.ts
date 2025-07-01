import transport, { COMMON_HEADER_SIZE, LogBlockCommand } from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  Deferred,
  createDeferred,
  isHeaderChunk,
} from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';
import type EventEmitter from 'events';

const { parseConfigure, buildBuffers, receiveOne, check } = transport;

// Noble BLE specific API interface
declare global {
  interface Window {
    desktopApi?: {
      // Existing BLE methods
      onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => () => void;
      stopBleScan: () => void;
      selectBleDevice: (deviceId: string) => void;
      preSelectDevice?: (uuid: string) => void;
      clearPreSelect?: () => void;

      // Noble BLE specific methods
      nobleBle?: {
        enumerate: () => Promise<{ id: string; name: string }[]>;
        getDevice: (uuid: string) => Promise<{ id: string; name: string } | null>;
        connect: (uuid: string) => Promise<void>;
        disconnect: (uuid: string) => Promise<void>;
        subscribe: (uuid: string) => Promise<void>;
        unsubscribe: (uuid: string) => Promise<void>;
        write: (uuid: string, data: string) => Promise<void>;
        onNotification: (callback: (deviceId: string, data: string) => void) => () => void;
        onDeviceDisconnected: (
          callback: (device: { id: string; name: string }) => void
        ) => () => void;
      };
    };
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
      throw error;
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
      await window.desktopApi.nobleBle.connect(uuid);
      this.connectedDevices.add(uuid);

      // Initialize data buffer for this device
      this.dataBuffers.set(uuid, { buffer: [], bufferLength: 0 });

      // Subscribe to notifications
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
            this.connectedDevices.delete(uuid);
            this.dataBuffers.delete(uuid);

            // Clean up listeners
            const notifyCleanup = this.notificationCleanups.get(uuid);
            if (notifyCleanup) {
              notifyCleanup();
              this.notificationCleanups.delete(uuid);
            }

            const disconnectCleanup = this.disconnectCleanups.get(uuid);
            if (disconnectCleanup) {
              disconnectCleanup();
              this.disconnectCleanups.delete(uuid);
            }

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
      throw error;
    }
  }

  async release(id: string) {
    try {
      if (this.connectedDevices.has(id)) {
        // Unsubscribe from notifications
        if (window.desktopApi?.nobleBle) {
          await window.desktopApi.nobleBle.unsubscribe(id);
        }

        // Clean up notification listener
        const cleanup = this.notificationCleanups.get(id);
        if (cleanup) {
          cleanup();
          this.notificationCleanups.delete(id);
        }

        // Clean up disconnect listener
        const disconnectCleanup = this.disconnectCleanups.get(id);
        if (disconnectCleanup) {
          disconnectCleanup();
          this.disconnectCleanups.delete(id);
        }

        // Disconnect device
        if (window.desktopApi?.nobleBle) {
          await window.desktopApi.nobleBle.disconnect(id);
        }

        // Clean up local state
        this.connectedDevices.delete(id);
        this.dataBuffers.delete(id);
      }
    } catch (error) {
      this.Log?.error('[Transport] Noble BLE release failed:', error);
      // Clean up local state even if release fails
      this.connectedDevices.delete(id);
      this.dataBuffers.delete(id);

      const cleanup = this.notificationCleanups.get(id);
      if (cleanup) {
        cleanup();
        this.notificationCleanups.delete(id);
      }

      const disconnectCleanup = this.disconnectCleanups.get(id);
      if (disconnectCleanup) {
        disconnectCleanup();
        this.disconnectCleanups.delete(id);
      }
    }
  }

  // Handle notification data from Noble BLE
  private handleNotificationData(deviceId: string, hexData: string): void {
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

    const buffers = buildBuffers(messages, name, data) as Array<ByteBuffer>;

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
