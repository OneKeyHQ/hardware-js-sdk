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

    console.log('=====>LOG: ', this.Log);
    this.Log?.debug('[Transport] Noble BLE Transport initialized');
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {}

  async enumerate(): Promise<{ id: string; name: string }[]> {
    this.Log?.debug('[Transport] Starting Noble BLE enumerate');

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      const devices = await window.desktopApi.nobleBle.enumerate();
      this.Log?.debug('[Transport] Noble BLE enumerate completed:', devices);

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

    this.Log?.debug('[Transport] Acquiring Noble BLE device:', uuid);

    // Force clean running Promise
    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
      this.Log?.debug('[Transport] Force clean Noble BLE run promise:', forceCleanRunPromise);
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
            this.Log?.debug('[Transport] Noble BLE device disconnected:', uuid);
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

      this.Log?.debug('[Transport] Noble BLE device acquired successfully:', uuid);
      return { uuid, path: uuid };
    } catch (error) {
      this.Log?.error('[Transport] Noble BLE acquire failed:', error);
      throw error;
    }
  }

  async release(id: string) {
    this.Log?.debug('[Transport] Releasing Noble BLE device:', id);

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

      this.Log?.debug('[Transport] Noble BLE device released:', id);
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
    try {
      // Ensure hexData is a valid string
      if (typeof hexData !== 'string') {
        this.Log?.error('[Transport] Invalid hexData type:', typeof hexData, hexData);
        return;
      }

      // Remove any whitespace and validate hex format
      const cleanHexData = hexData.replace(/\s+/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(cleanHexData)) {
        this.Log?.error('[Transport] Invalid hex data format:', cleanHexData);
        return;
      }

      // Convert hex string to Uint8Array
      const hexMatch = cleanHexData.match(/.{1,2}/g);
      if (!hexMatch) {
        this.Log?.error('[Transport] Failed to parse hex data:', cleanHexData);
        return;
      }

      const data = new Uint8Array(hexMatch.map(byte => parseInt(byte, 16)));

      this.Log?.debug('[Transport] Received Noble BLE notification:', deviceId, data);

      const bufferState = this.dataBuffers.get(deviceId);
      if (!bufferState) {
        this.Log?.error('[Transport] No buffer state for device:', deviceId);
        return;
      }

      if (isHeaderChunk(data)) {
        // Read buffer length from header (big-endian 32-bit integer at offset 5)
        const dataView = new DataView(data.buffer);
        bufferState.bufferLength = dataView.getInt32(5, false); // false = big-endian
        bufferState.buffer = [...data.subarray(3)];
      } else {
        bufferState.buffer = bufferState.buffer.concat([...data]);
      }

      if (bufferState.buffer.length - COMMON_HEADER_SIZE >= bufferState.bufferLength) {
        // Complete packet received
        const completeBuffer = new Uint8Array(bufferState.buffer);
        this.Log?.debug('[Transport] Noble BLE complete packet received, resolving Promise');

        // Reset buffer state
        bufferState.bufferLength = 0;
        bufferState.buffer = [];

        // Convert to hex string for processing
        const hexString = Array.from(completeBuffer)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (this.runPromise) {
          this.runPromise.resolve(hexString);
        }
      }
    } catch (error) {
      this.Log?.error('[Transport] Noble BLE notification processing error:', error);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
    }
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';

    this.Log?.debug('[Transport] Noble BLE call this.runPromise', this.runPromise);
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

    this.Log?.debug('[Transport] Noble BLE buildBuffers result:', {
      bufferCount: buffers.length,
      buffersInfo: buffers.map((buffer, index) => {
        const bufferExists = !!buffer;
        const hasToString = typeof buffer?.toString === 'function';

        return {
          index,
          bufferExists,
          hasToString,
          bufferType: buffer?.constructor?.name,
          bufferLimit: buffer?.limit,
          bufferOffset: buffer?.offset,
        };
      }),
    });

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE write API not available');
      }

      this.Log?.debug('[Transport] Noble BLE preparing to write', buffers.length, 'buffers');

      // Write each buffer to the device
      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];

        if (!buffer || typeof buffer.toString !== 'function') {
          this.Log?.error(`[Transport] Noble BLE buffer ${i + 1} is invalid:`, buffer);
          throw new Error(`Buffer ${i + 1} is invalid`);
        }

        // Use ByteBuffer's toString('hex') method directly, similar to other transports
        const hexString = buffer.toString('hex');

        this.Log?.debug(`[Transport] Noble BLE writing buffer ${i + 1}/${buffers.length}:`, {
          bufferSize: buffer.limit,
          hexLength: hexString.length,
          firstBytes: `${hexString.substring(0, 32)}...`,
        });

        if (hexString.length === 0) {
          this.Log?.error(`[Transport] Noble BLE buffer ${i + 1} generated empty hex string`);
          throw new Error(`Buffer ${i + 1} is empty`);
        }

        await window.desktopApi.nobleBle.write(uuid, hexString);

        this.Log?.debug(`[Transport] Noble BLE buffer ${i + 1} write completed`);
      }

      this.Log?.debug('[Transport] Noble BLE all buffers written, waiting for response');

      // Wait for response
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      this.Log?.debug('[Transport] Noble BLE receive data:', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.debug('[Transport] Noble BLE call error:', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }
}
