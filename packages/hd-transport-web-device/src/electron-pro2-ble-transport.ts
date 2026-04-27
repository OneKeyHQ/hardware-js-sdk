import transport, {
  LogBlockCommand,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  PROTOCOL_V2_PACKET_SRC_COMMAND,
} from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  createDeferred,
  wait,
} from '@onekeyfe/hd-shared';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { DesktopAPI } from '@onekeyfe/hd-transport-electron';
import type { OneKeyDeviceInfo, ProtocolType } from '@onekeyfe/hd-transport';
import type EventEmitter from 'events';

const { parseConfigure, ProtocolV2, check } = transport;

declare global {
  interface Window {
    desktopApi?: DesktopAPI;
  }
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
};

const toPro2Descriptor = (device: { id: string; name: string | null }): OneKeyDeviceInfo =>
  ({
    id: device.id,
    name: device.name,
    path: device.id,
    debug: false,
    commType: 'electron-ble',
    protocolType: 'V2',
  } as OneKeyDeviceInfo);

/**
 * BLE write chunking — matches legacy noble-ble-handler BLE_PACKET_SIZE.
 * Frames larger than this are split into chunks with inter-packet delay.
 */
const BLE_PACKET_SIZE = 192;

/** Inter-packet delay in ms between BLE write chunks */
const BLE_WRITE_DELAY_MS = 5;

/** Maximum number of retries for a BLE GATT write */
const BLE_WRITE_MAX_RETRIES = 3;

/** Delay between write retries in ms */
const BLE_WRITE_RETRY_DELAY_MS = 300;

/** Timeout for waiting on a BLE notification response (ms) */
const BLE_RESPONSE_TIMEOUT_MS = 30_000;

/**
 * ElectronPro2BleTransport — BLE transport for OneKey Pro2 using Protocol V2.
 *
 * This transport uses the same Protocol V2 framing as WebUSB Pro2,
 * but communicates over BLE GATT (via Electron Noble bridge).
 *
 * Frame format (Protocol V2, 0x5A framing):
 *   [SOF=0x5A] [LEN_L] [LEN_H] [CRC8_HEAD] [CHANNEL] [ATTR] [SEQ] [DATA...] [CRC8_BODY]
 *
 * BLE I/O model:
 *   Send: GATT write to writable characteristic (chunked if > BLE_PACKET_SIZE)
 *   Receive: GATT notification from notify characteristic
 */
export default class ElectronPro2BleTransport {
  /** Protocol V1 protobuf schema (Initialize, GetFeatures, etc.) — kept for cross-protocol message lookup */
  private _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protocol V2 protobuf schema (Ping, FileWrite, FirmwareUpdate, etc.) */
  private _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronPro2BleTransport';

  configured = false;

  runPromise: Deferred<Uint8Array> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  private connectedDevices: Set<string> = new Set();

  /** Accumulation buffer for reassembling Protocol V2 response frames from BLE notifications */
  private rxBuffers: Map<string, Uint8Array[]> = new Map();

  private notificationCleanups: Map<string, () => void> = new Map();

  private disconnectCleanups: Map<string, () => void> = new Map();

  // ----- Error handling -----

  private handleBluetoothError(error: any): never {
    if (error && typeof error === 'object') {
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

  // ----- Lifecycle -----

  private cleanupDeviceState(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
    this.rxBuffers.delete(deviceId);

    const notifyCleanup = this.notificationCleanups.get(deviceId);
    if (notifyCleanup) {
      notifyCleanup();
      this.notificationCleanups.delete(deviceId);
    }

    const disconnectCleanup = this.disconnectCleanups.get(deviceId);
    if (disconnectCleanup) {
      disconnectCleanup();
      this.disconnectCleanups.delete(deviceId);
    }
  }

  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;

    if (!window.desktopApi?.nobleBle) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Noble BLE API is not available. Please ensure you are running in Electron with Noble support.'
      );
    }

    this.Log?.debug('[Pro2 BLE] Transport initialized');
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  /**
   * Configure Protocol V2 protobuf schema for system messages.
   */
  configureProtocolV2(signedData: any) {
    this._messagesV2 = parseConfigure(signedData);
    this.Log?.debug('[Pro2 BLE] Protocol V2 schema configured');
  }

  async listen() {
    return this.enumerate();
  }

  async enumerate(): Promise<OneKeyDeviceInfo[]> {
    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }
      const devices = await window.desktopApi.nobleBle.enumerate();
      this.Log?.debug(`[Pro2 BLE] enumerate found ${devices.length} device(s):`);
      for (const dev of devices) {
        this.Log?.debug(`[Pro2 BLE]   id="${dev.id}" name="${dev.name}"`);
      }
      return devices.map(toPro2Descriptor);
    } catch (error) {
      this.Log?.error('[Pro2 BLE] enumerate failed:', error);
      this.handleBluetoothError(error);
    }
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
    }

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      const device = await window.desktopApi.nobleBle.getDevice(uuid);
      if (!device) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device ${uuid} not found`);
      }

      try {
        await window.desktopApi.nobleBle.connect(uuid);
        this.connectedDevices.add(uuid);
      } catch (error) {
        this.handleBluetoothError(error);
      }

      // Initialize receive buffer
      this.rxBuffers.set(uuid, []);

      // Subscribe to notifications
      await window.desktopApi.nobleBle.subscribe(uuid);

      // Set up notification listener — receives raw bytes as hex string
      const cleanup = window.desktopApi.nobleBle.onNotification(
        (deviceId: string, data: string) => {
          if (deviceId === uuid) {
            this.handleNotification(uuid, data);
          }
        }
      );
      this.notificationCleanups.set(uuid, cleanup);

      // Set up disconnect listener
      const disconnectCleanup = window.desktopApi.nobleBle.onDeviceDisconnected(
        (disconnectedDevice: any) => {
          if (disconnectedDevice.id === uuid) {
            this.cleanupDeviceState(uuid);
            this.emitter?.emit('device-disconnect', {
              name: disconnectedDevice.name,
              id: disconnectedDevice.id,
              connectId: disconnectedDevice.id,
            });
          }
        }
      );
      this.disconnectCleanups.set(uuid, disconnectCleanup);

      this.emitter?.emit('device-connect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });

      return {
        ...toPro2Descriptor({ id: device.id, name: device.name }),
        uuid,
      };
    } catch (error) {
      this.Log?.error('[Pro2 BLE] acquire failed:', error);
      throw error;
    }
  }

  async release(id: string) {
    try {
      if (this.connectedDevices.has(id)) {
        if (window.desktopApi?.nobleBle) {
          await window.desktopApi.nobleBle.unsubscribe(id);
          await window.desktopApi.nobleBle.disconnect(id);
        }
        this.cleanupDeviceState(id);
      }
    } catch (error) {
      this.Log?.error('[Pro2 BLE] release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  // ----- BLE Write with chunking & retry -----

  /**
   * Write data to BLE GATT characteristic with chunking and retry.
   *
   * If the frame is larger than BLE_PACKET_SIZE (192 bytes), it is split
   * into chunks with a small inter-packet delay, matching the legacy
   * noble-ble-handler behavior.
   *
   * Each chunk write is retried up to BLE_WRITE_MAX_RETRIES times on failure.
   */
  private async writeWithChunking(uuid: string, hexData: string): Promise<void> {
    const totalBytes = hexData.length / 2;

    if (totalBytes <= BLE_PACKET_SIZE) {
      await wait(BLE_WRITE_DELAY_MS);
      await this.writeWithRetry(uuid, hexData);
      return;
    }

    // Split into chunks
    for (let offset = 0; offset < hexData.length; ) {
      const chunkHexLen = Math.min(BLE_PACKET_SIZE * 2, hexData.length - offset);
      const chunkHex = hexData.substring(offset, offset + chunkHexLen);
      offset += chunkHexLen;

      await this.writeWithRetry(uuid, chunkHex);

      if (offset < hexData.length) {
        await wait(BLE_WRITE_DELAY_MS);
      }
    }
  }

  /**
   * Write a single chunk to BLE with retry on failure.
   */
  private async writeWithRetry(uuid: string, hexData: string): Promise<void> {
    let lastError: any;
    const nobleBle = window.desktopApi?.nobleBle;
    if (!nobleBle) {
      throw new Error('Noble BLE API not available');
    }

    for (let attempt = 1; attempt <= BLE_WRITE_MAX_RETRIES; attempt++) {
      try {
        await nobleBle.write(uuid, hexData);
        return;
      } catch (error) {
        lastError = error;
        this.Log?.error(
          `[Pro2 BLE] Write failed (attempt ${attempt}/${BLE_WRITE_MAX_RETRIES}):`,
          error
        );
        if (attempt < BLE_WRITE_MAX_RETRIES) {
          await wait(BLE_WRITE_RETRY_DELAY_MS);
        }
      }
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.BleWriteCharacteristicError,
      `BLE write failed after ${BLE_WRITE_MAX_RETRIES} attempts: ${lastError?.message ?? lastError}`
    );
  }

  // ----- BLE Notification Handling (Protocol V2 frame reassembly) -----

  /**
   * Handle a single BLE notification payload.
   *
   * Protocol V2 frames may arrive in multiple BLE notifications
   * depending on MTU. We accumulate chunks and attempt parsing
   * after each arrival.
   */
  private handleNotification(deviceId: string, hexData: string): void {
    if (hexData === 'PAIRING_REJECTED') {
      this.Log?.debug('[Pro2 BLE] Pairing rejection detected for device:', deviceId);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled));
      }
      return;
    }

    try {
      const bytes = hexToBytes(hexData);
      if (bytes.length === 0) return;

      const chunks = this.rxBuffers.get(deviceId);
      if (!chunks) return;

      chunks.push(bytes);

      // Try to assemble a complete Protocol V2 frame
      const assembled = concatUint8Arrays(chunks);

      // Need at least 4 bytes to read the frame length
      if (assembled.length < 4) return;

      // Check SOF
      if (assembled[0] !== 0x5a) {
        // Not a Protocol V2 frame — discard accumulated data
        this.rxBuffers.set(deviceId, []);
        this.Log?.error('[Pro2 BLE] Invalid SOF byte, discarding buffer');
        return;
      }

      // Read expected frame length
      const expectedLen = assembled[1] + assembled[2] * 256;

      // Protocol V2 LEN is the complete frame size, same as parseProtoV2Frame().
      const totalFrameBytes = expectedLen;

      if (assembled.length < totalFrameBytes) {
        // Need more data — keep accumulating
        return;
      }

      // We have a complete frame
      const frameData = assembled.slice(0, totalFrameBytes);
      this.rxBuffers.set(deviceId, []);

      if (this.runPromise) {
        this.runPromise.resolve(frameData);
      }
    } catch (error) {
      this.Log?.error('[Pro2 BLE] Notification handling error:', error);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
    }
  }

  // ----- Core RPC (Protocol V2) -----

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';

    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    if (!this.connectedDevices.has(uuid)) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound, `Device ${uuid} not connected`);
    }

    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      this.Log?.debug('[Pro2 BLE] call', 'name:', name, 'data:', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else if (LogBlockCommand.has(name)) {
      this.Log?.debug('[Pro2 BLE] call', 'name:', name);
    } else {
      this.Log?.debug('[Pro2 BLE] call', 'name:', name, 'data:', data);
    }

    this.runPromise = createDeferred();

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      if (!this._messagesV2) {
        throw ERRORS.TypedError(
          HardwareErrorCode.TransportNotConfigured,
          'Protocol V2 schema not configured'
        );
      }

      const frame = ProtocolV2.encode(
        {
          protocolV1: this._messages,
          protocolV2: this._messagesV2,
        },
        name,
        data,
        {
          packetSrc: PROTOCOL_V2_PACKET_SRC_COMMAND,
          router: PROTOCOL_V2_CHANNEL_BLE_UART,
        }
      );

      // Send frame via BLE GATT write (with chunking & retry)
      const hexString = bytesToHex(frame);
      await this.writeWithChunking(uuid, hexString);

      // Wait for response with timeout
      const rxFrame = await Promise.race([
        this.runPromise.promise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              ERRORS.TypedError(
                HardwareErrorCode.BleTimeoutError,
                `BLE response timeout after ${BLE_RESPONSE_TIMEOUT_MS}ms for ${name}`
              )
            );
          }, BLE_RESPONSE_TIMEOUT_MS);
        }),
      ]);

      if (!(rxFrame instanceof Uint8Array)) {
        throw new Error('Response is not Uint8Array');
      }

      const decoded = ProtocolV2.decode(
        {
          protocolV1: this._messages,
          protocolV2: this._messagesV2,
        },
        rxFrame
      );

      this.Log?.debug(
        `[ProtocolV2 BLE] TX name=${name} | RX msgType=${decoded.msgType} pbPayload=${decoded.pbPayload.length}B`
      );

      return check.call(decoded);
    } catch (e) {
      this.Log?.error('[Pro2 BLE] call error:', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  getProtocolType(_path: string): ProtocolType {
    return 'V2';
  }
}

// ----- Utility functions -----

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length === 0 || clean.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
