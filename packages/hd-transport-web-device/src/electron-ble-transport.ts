import transport, { COMMON_HEADER_SIZE, LogBlockCommand } from '@onekeyfe/hd-transport'; // COMMON_HEADER_SIZE, // LogBlockCommand, // AcquireInput,
import {
  ERRORS,
  HardwareErrorCode,
  Deferred,
  createDeferred,
  ONEKEY_SERVICE_UUID,
  ONEKEY_WRITE_CHARACTERISTIC_UUID,
  ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
  isHeaderChunk,
} from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';
import type EventEmitter from 'events';

const { parseConfigure, buildBuffers, receiveOne, check } = transport;

// Add type declaration for desktopApi
declare global {
  interface Window {
    desktopApi?: {
      onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => () => void;
      stopBleScan: () => void;
      selectBleDevice: (deviceId: string) => void;
      preSelectDevice?: (uuid: string) => void;
      clearPreSelect?: () => void;
    };
  }
}

interface BleTransport {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  writeCharacteristic: BluetoothRemoteGATTCharacteristic;
  notifyCharacteristic: BluetoothRemoteGATTCharacteristic;
  notifySubscription: null | ((event: Event) => void);
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

  // Cache discovered devices and transport objects
  private deviceList: Array<{ id: string; name: string; device: BluetoothDevice }> = [];

  private transportCache: Record<string, BleTransport> = {};

  // Track last logged device list to avoid duplicate logs
  private lastLoggedDevices = '';

  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;

    if (!navigator.bluetooth) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Web Bluetooth is not supported by current browser'
      );
    }
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {}

  // Helper function to handle onBleSelect logging with deduplication
  private logDeviceListIfChanged(
    devices: Array<{ id: string; name: string }>,
    scenario: 'enumerate' | 'acquire',
    additionalInfo?: string
  ): boolean {
    // Sort devices by id to ensure consistent comparison regardless of order
    const sortedDevices = [...devices].sort((a, b) => a.id.localeCompare(b.id));
    const deviceListString = JSON.stringify(sortedDevices.map(d => ({ id: d.id, name: d.name })));

    // Only log if the device list has changed
    if (deviceListString !== this.lastLoggedDevices) {
      const prefix =
        scenario === 'enumerate'
          ? '[Transport] Received new devices'
          : '[Transport] Received devices in acquire';

      const message = additionalInfo ? `${prefix} (${additionalInfo}):` : `${prefix}:`;

      this.Log?.debug(message, devices);

      // Update the last logged devices string
      this.lastLoggedDevices = deviceListString;

      return true; // Logged
    }

    return false; // Not logged (duplicate)
  }

  async enumerate(): Promise<{ id: string; name: string }[]> {
    this.Log?.debug('[Transport] Starting enumerate');

    try {
      // Check window.desktopApi
      this.Log?.debug('[Transport] Checking desktopApi:', window.desktopApi);
      if (!window.desktopApi?.onBleSelect) {
        console.error('[Transport] desktopApi.onBleSelect not available');
        throw new Error('desktopApi.onBleSelect not available');
      }

      // Clear previous pre-selection state
      window.desktopApi?.clearPreSelect?.();

      // Use Set for deduplication, store discovered devices
      const deviceSet = new Set<string>();
      const devices: Array<{ id: string; name: string }> = [];

      // Reset last logged devices for this operation
      this.lastLoggedDevices = '';

      return await new Promise(resolve => {
        this.Log?.debug('[Transport] Setting up device scanning with 3s timeout');

        // Cleanup function
        const cleanupAll = () => {
          this.Log?.debug('[Transport] Cleaning up resources');
          clearTimeout(timeoutId);
          cleanup?.();
          // Stop BLE scanning through desktopApi
          window.desktopApi?.stopBleScan();
        };

        // Set 3 second timeout
        const timeoutId = setTimeout(() => {
          this.Log?.debug('[Transport] Scan timeout, returning devices:', devices);
          cleanupAll();
          resolve(devices);
        }, 3000);

        // Listen for device discovery events
        const cleanup = window.desktopApi?.onBleSelect(newDevices => {
          // Use helper function to log only if device list changed
          this.logDeviceListIfChanged(newDevices, 'enumerate');

          // Add new devices to list (with deduplication)
          newDevices.forEach(device => {
            const deviceKey = `${device.id}-${device.name}`;
            if (!deviceSet.has(deviceKey)) {
              deviceSet.add(deviceKey);
              devices.push(device);
              this.Log?.debug('[Transport] Added new device:', device);
            }
          });
        });

        // Trigger device search
        navigator.bluetooth
          .requestDevice({
            filters: [{ services: [ONEKEY_SERVICE_UUID] }],
            optionalServices: [ONEKEY_SERVICE_UUID],
          })
          .catch(error => {
            // Ignore user cancellation errors
            this.Log?.debug('[Transport] RequestDevice error (expected):', error);
          });
      });
    } catch (error) {
      // Make sure to stop scanning even if there's an error
      window.desktopApi?.stopBleScan();
      console.error('[Transport] Error in enumerate:', error);
      throw error;
    }
  }

  // Add device disconnect listener
  private addDisconnectListener(device: BluetoothDevice) {
    this.Log?.debug('[Transport] Adding disconnect listener for device:', device.id);
    device.addEventListener('gattserverdisconnected', () => {
      this.Log?.debug('[Transport] Device disconnected:', device.id);
      // Clean up cache
      delete this.transportCache[device.id];
      // Trigger disconnect event
      this.emitter?.emit('device-disconnect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });
    });
  }

  // Monitor characteristic value changes
  private _monitorCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic,
    deviceId: string
  ) {
    let bufferLength = 0;
    let buffer: number[] = [];

    const subscription = (event: Event) => {
      const { value } = event.target as BluetoothRemoteGATTCharacteristic;
      if (!value) return;

      this.Log?.debug('[Transport] Received notification from device:', deviceId, value);

      try {
        // Convert DataView to Buffer-like Uint8Array
        const data = new Uint8Array(value.buffer);
        this.Log?.debug('[Transport] Received a packet, buffer:', data);

        if (isHeaderChunk(data)) {
          // Read buffer length from header (big-endian 32-bit integer at offset 5)
          const dataView = new DataView(value.buffer);
          bufferLength = dataView.getInt32(5, false); // false = big-endian
          buffer = [...data.subarray(3)];
        } else {
          buffer = buffer.concat([...data]);
        }

        if (buffer.length - COMMON_HEADER_SIZE >= bufferLength) {
          // 6 is COMMON_HEADER_SIZE
          const completeBuffer = new Uint8Array(buffer);
          this.Log?.debug('[Transport] Received complete packet, resolving Promise');
          bufferLength = 0;
          buffer = [];

          // Convert to hex string for processing
          const hexString = Array.from(completeBuffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          if (this.runPromise) {
            this.runPromise.resolve(hexString);
          }
        }
      } catch (error) {
        console.error('[Transport] Monitor data error:', error);
        if (this.runPromise) {
          this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
        }
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', subscription);
    return subscription;
  }

  // Find cached device
  private findDevice(id: string) {
    return this.deviceList.find(d => d.id === id);
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    this.Log?.debug('[Transport] Acquiring device:', uuid);

    // Reset last logged devices for this operation
    this.lastLoggedDevices = '';

    // Check existing connection status and clean up invalid connections
    const existingTransport = this.transportCache[uuid];
    if (existingTransport) {
      const { server, device } = existingTransport;
      this.Log?.debug('[Transport] Found existing transport, checking connection status');
      this.Log?.debug('[Transport] Device GATT connected:', device.gatt?.connected);
      this.Log?.debug('[Transport] Server connected:', server?.connected);

      // If connection is disconnected, clean up cache
      if (!device.gatt?.connected || !server?.connected) {
        this.Log?.debug('[Transport] Connection is stale, cleaning up...');
        await this.release(uuid);
      } else {
        this.Log?.debug('[Transport] Connection is still active, reusing existing transport');
        return { uuid, path: uuid };
      }
    }

    // Force clean running Promise
    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
      this.Log?.debug('[Transport] Force clean Bluetooth run promise:', forceCleanRunPromise);
    }

    try {
      // 1. Find device or trigger device selection process
      let deviceInfo = this.findDevice(uuid);

      if (!deviceInfo) {
        this.Log?.debug('[Transport] Device not found in cache, requesting user to select device');

        // Check window.desktopApi
        if (!window.desktopApi?.onBleSelect) {
          throw new Error('desktopApi.onBleSelect not available');
        }

        deviceInfo = await new Promise((resolve, reject) => {
          let resolved = false;
          let targetDeviceName: string | null = null;

          // Pre-select device first
          window.desktopApi?.preSelectDevice?.(uuid);

          // Cleanup functions
          const cleanupAndResolve = (deviceInfo: any) => {
            if (resolved) return;
            resolved = true;
            cleanup?.();
            clearTimeout(timeoutId);
            window.desktopApi?.clearPreSelect?.();
            resolve(deviceInfo);
          };

          const cleanupAndReject = (error: any) => {
            if (resolved) return;
            resolved = true;
            cleanup?.();
            clearTimeout(timeoutId);
            window.desktopApi?.stopBleScan();
            window.desktopApi?.clearPreSelect?.();
            reject(error);
          };

          // Listen for device selection events - get target device name for matching
          const cleanup = window.desktopApi?.onBleSelect(devices => {
            // Use helper function to log only if device list changed
            this.logDeviceListIfChanged(devices, 'acquire', `target: ${uuid}`);

            // Find the target device by UUID to get its name
            const targetDevice = devices.find(device => device.id === uuid);
            if (targetDevice) {
              targetDeviceName = targetDevice.name;
              this.Log?.debug('[Transport] Target device name for matching:', targetDeviceName);
            }
          });

          // Wait for browser's requestDevice to be triggered (automatically selected by main process)
          navigator.bluetooth
            .requestDevice({
              filters: [{ services: [ONEKEY_SERVICE_UUID] }],
              optionalServices: [ONEKEY_SERVICE_UUID],
            })
            .then(selectedDevice => {
              this.Log?.debug(
                '[Transport] Device selected from browser:',
                selectedDevice.id,
                selectedDevice.name,
                'Target UUID:',
                uuid,
                'Target name:',
                targetDeviceName
              );

              // Verify the selected device matches by name
              if (targetDeviceName && selectedDevice.name !== targetDeviceName) {
                this.Log?.debug(
                  '[Transport] Selected device name does not match target:',
                  selectedDevice.name,
                  'vs',
                  targetDeviceName
                );
                cleanupAndReject(
                  new Error(
                    `Selected device name "${selectedDevice.name}" does not match target name "${targetDeviceName}"`
                  )
                );
                return;
              }

              // Device name matches or no target name available, proceed
              cleanupAndResolve({
                id: selectedDevice.id,
                name: selectedDevice.name || 'Unknown Device',
                device: selectedDevice,
                originalUuid: uuid, // Keep track of the original UUID for reference
              });
            })
            .catch(error => {
              console.error('[Transport] RequestDevice error:', error);
              // cleanupAndReject(error);
            });

          // Set timeout
          const timeoutId = setTimeout(() => {
            this.Log?.debug('[Transport] Acquire timeout - v2 - waiting for device selection');
            cleanupAndReject(new Error('Acquire device timeout'));
          }, 5000);
        });

        if (!deviceInfo) {
          throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
        }

        // Clear pre-selection state
        window.desktopApi?.clearPreSelect?.();
      }

      const { device } = deviceInfo;

      // 2. Add disconnect listener for device
      this.addDisconnectListener(device);

      // 3. Connect to device
      let server;
      try {
        this.Log?.debug('[Transport] Start connecting to device:', device.id);
        server = await device.gatt?.connect();
        this.Log?.debug('[Transport] Device gatt available:', !!device.gatt);
        this.Log?.debug('[Transport] Device gatt connected:', device.gatt?.connected);
        this.Log?.debug('[Transport] Connected to device:', server);
      } catch (e: any) {
        this.Log?.debug('[Transport] Connect to device error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, e.message || e);
      }

      if (!server) {
        throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'Unable to connect to device');
      }

      // 4. Get service
      let service;
      try {
        this.Log?.debug('[Transport] Start getting service:', ONEKEY_SERVICE_UUID);
        service = await server.getPrimaryService(ONEKEY_SERVICE_UUID);
        this.Log?.debug('[Transport] Got service:', service);
      } catch (e: any) {
        this.Log?.debug('[Transport] Get service error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
      }

      // 5. Get characteristics
      let writeCharacteristic;
      let notifyCharacteristic;
      try {
        this.Log?.debug(
          '[Transport] Start getting write characteristic:',
          ONEKEY_WRITE_CHARACTERISTIC_UUID
        );
        writeCharacteristic = await service.getCharacteristic(ONEKEY_WRITE_CHARACTERISTIC_UUID);
        this.Log?.debug('[Transport] Got write characteristic:', writeCharacteristic);
        this.Log?.debug(
          '[Transport] Start getting notify characteristic:',
          ONEKEY_NOTIFY_CHARACTERISTIC_UUID
        );
        notifyCharacteristic = await service.getCharacteristic(ONEKEY_NOTIFY_CHARACTERISTIC_UUID);
        this.Log?.debug('[Transport] Got notify characteristic:', notifyCharacteristic);
      } catch (e: any) {
        this.Log?.debug('[Transport] Get characteristic error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound);
      }

      // 6. Check if characteristics support write and notify
      if (
        !writeCharacteristic.properties.write &&
        !writeCharacteristic.properties.writeWithoutResponse
      ) {
        throw ERRORS.TypedError('BLECharacteristicNotWritable: write characteristic not writable');
      }

      if (!notifyCharacteristic.properties.notify) {
        throw ERRORS.TypedError(
          'BLECharacteristicNotNotifiable: notify characteristic not notifiable'
        );
      }

      // 7. Create transport object
      const transport: BleTransport = {
        device,
        server,
        service,
        writeCharacteristic,
        notifyCharacteristic,
        notifySubscription: null,
      };

      this.Log?.debug('[Transport] Created transport:', transport);

      // 8. Start notifications
      try {
        this.Log?.debug('[Transport] Start notifications:', notifyCharacteristic);
        await notifyCharacteristic.startNotifications();
        this.Log?.debug('[Transport] Started notifications:', notifyCharacteristic);
        transport.notifySubscription = this._monitorCharacteristic(notifyCharacteristic, uuid);
      } catch (e: any) {
        this.Log?.debug('[Transport] Start notifications error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotifyError);
      }

      // 9. Cache transport object and device info
      this.transportCache[uuid] = transport;
      if (!this.findDevice(uuid)) {
        this.deviceList.push(deviceInfo);
      }

      // 10. Trigger device connect event
      this.emitter?.emit('device-connect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });

      return { uuid, path: uuid };
    } catch (error) {
      console.error('[Transport] Error acquiring device:', error);
      // Make sure to stop scanning
      window.desktopApi?.stopBleScan();
      throw error;
    }
  }

  async release(id: string) {
    const transport = this.transportCache[id];
    if (!transport) return;

    const { notifyCharacteristic, notifySubscription } = transport;

    try {
      // Stop notification subscription
      if (notifyCharacteristic && notifySubscription) {
        this.Log?.debug('[Transport] Removing notification listener for device:', id);
        notifyCharacteristic.removeEventListener('characteristicvaluechanged', notifySubscription);
        try {
          await notifyCharacteristic.stopNotifications();
        } catch (e) {
          this.Log?.debug('[Transport] Stop notifications error (ignored):', e);
        }
      }

      // Clean up cache - don't actively disconnect, let system manage connection state
      delete this.transportCache[id];

      this.Log?.debug('[Transport] Device released (connection kept alive):', id);
    } catch (error) {
      console.error('[Transport] Error releasing device:', error);
      // Clean up cache even if error occurs
      delete this.transportCache[id];
    }
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';

    this.Log?.debug('electron-ble-transport call this.runPromise', this.runPromise);
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const transport = this.transportCache[uuid];
    if (!transport) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
    }

    // Check connection status
    const { device, server } = transport;
    if (!device.gatt?.connected || !server?.connected) {
      this.Log?.debug('[Transport] Connection lost during call, device needs to be re-acquired');
      throw ERRORS.TypedError(
        HardwareErrorCode.BleDeviceNotBonded,
        'Device connection lost, please re-acquire device'
      );
    }

    this.runPromise = createDeferred();
    const messages = this._messages;

    // Log different types of commands appropriately
    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      this.Log?.debug('electron-ble-transport', 'call-', ' name: ', name, ' data: ', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else if (LogBlockCommand.has(name)) {
      this.Log?.debug('electron-ble-transport', 'call-', ' name: ', name);
    } else {
      this.Log?.debug('electron-ble-transport', 'call-', ' name: ', name, ' data: ', data);
    }

    const buffers = buildBuffers(messages, name, data) as Array<ByteBuffer>;

    // Helper function to write chunked data
    async function writeChunkedData(
      buffers: ByteBuffer[],
      writeFunction: (data: ArrayBuffer) => Promise<void>,
      onError: (e: any) => void
    ) {
      // Web Bluetooth typically supports larger packets than mobile
      const packetCapacity = 512; // Adjust based on your device's MTU
      let index = 0;
      let chunk = ByteBuffer.allocate(packetCapacity);

      while (index < buffers.length) {
        const buffer = buffers[index].toBuffer();
        chunk.append(buffer);
        index += 1;

        if (chunk.offset === packetCapacity || index >= buffers.length) {
          chunk.reset();
          try {
            // Convert ByteBuffer to ArrayBuffer for Web Bluetooth
            const arrayBuffer = chunk.toArrayBuffer();
            await writeFunction(arrayBuffer);
            chunk = ByteBuffer.allocate(packetCapacity);
          } catch (e) {
            onError(e);
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
          }
        }
      }
    }

    try {
      if (name === 'EmmcFileWrite') {
        // For file write operations, use chunked writing with retry
        await writeChunkedData(
          buffers,
          async (data: ArrayBuffer) => {
            // Implement retry logic for file writes
            let retries = 3;
            while (retries > 0) {
              try {
                await transport.writeCharacteristic.writeValueWithoutResponse(data);
                break;
              } catch (e) {
                retries--;
                if (retries === 0) throw e;
                // eslint-disable-next-line no-promise-executor-return
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
              }
            }
          },
          e => {
            this.runPromise = null;
            this.Log?.debug('writeCharacteristic write error: ', e);
          }
        );
      } else if (name === 'FirmwareUpload') {
        // For firmware upload, use writeWithoutResponse for better performance
        await writeChunkedData(
          buffers,
          async (data: ArrayBuffer) => {
            await transport.writeCharacteristic.writeValueWithoutResponse(data);
          },
          e => {
            this.runPromise = null;
            this.Log?.debug('writeCharacteristic write error: ', e);
          }
        );
      } else {
        // For regular commands, write each buffer directly
        for (const buffer of buffers) {
          const arrayBuffer = buffer.toArrayBuffer();
          try {
            await transport.writeCharacteristic.writeValueWithoutResponse(arrayBuffer);
          } catch (e: any) {
            this.Log?.debug('writeCharacteristic write error: ', e);
            this.runPromise = null;

            // Map Web Bluetooth errors to our error codes
            if (e.name === 'NetworkError' || e.message?.includes('disconnected')) {
              throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded);
            } else if (e.name === 'NotSupportedError') {
              throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, e.message);
            } else {
              throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
            }
          }
        }
      }

      // Wait for response
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      this.Log?.debug('receive data: ', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.debug('call error: ', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }
}
