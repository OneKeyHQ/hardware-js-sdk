import transport, {
  COMMON_HEADER_SIZE,
  LogBlockCommand,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  bytesToHex,
  hexToBytes,
  probeProtocolV2,
} from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  createDeferred,
  isHeaderChunk,
  wait,
} from '@onekeyfe/hd-shared';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { DesktopAPI } from '@onekeyfe/hd-transport-electron';
import type { OneKeyDeviceInfo, ProtocolType } from '@onekeyfe/hd-transport';
import type EventEmitter from 'events';

const { parseConfigure, buildBuffers, receiveOne, check } = transport;

declare global {
  interface Window {
    desktopApi?: DesktopAPI;
  }
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
};

interface PacketProcessResult {
  isComplete: boolean;
  completePacket?: string;
  error?: string;
}

const toBleDescriptor = (
  device: { id: string; name: string | null },
  protocolType?: ProtocolType
): OneKeyDeviceInfo =>
  ({
    id: device.id,
    name: device.name,
    path: device.id,
    debug: false,
    commType: 'electron-ble',
    ...(protocolType ? { protocolType } : {}),
  } as OneKeyDeviceInfo);

const BLE_PACKET_SIZE = 192;
const BLE_WRITE_DELAY_MS = 5;
const BLE_WRITE_MAX_RETRIES = 3;
const BLE_WRITE_RETRY_DELAY_MS = 300;
const BLE_RESPONSE_TIMEOUT_MS = 30_000;
const PROTOCOL_PROBE_TIMEOUT_MS = 1500;

/**
 * Desktop Electron BLE transport with automatic Protocol V1/V2 detection.
 *
 * Protocol V1 devices continue using chunked packets. Protocol V2 is detected
 * after connect by probing GetProtoVersion, then uses 0x5A frames for later calls.
 */
export default class ElectronAutoBleTransport {
  private _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  private _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronAutoBleTransport';

  configured = false;

  runPromise: Deferred<Uint8Array | string> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  private connectedDevices: Set<string> = new Set();

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private v1Buffers: Map<string, { buffer: number[]; bufferLength: number }> = new Map();

  private v2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  private notificationCleanups: Map<string, () => void> = new Map();

  private disconnectCleanups: Map<string, () => void> = new Map();

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

  private cleanupDeviceState(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
    this.deviceProtocol.delete(deviceId);
    this.v1Buffers.delete(deviceId);
    this.v2Assemblers.delete(deviceId);

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

    this.Log?.debug('[Auto BLE] Transport initialized');
  }

  configure(signedData: any) {
    this._messages = parseConfigure(signedData);
    this.configured = true;
  }

  configureProtocolV2(signedData: any) {
    this._messagesV2 = parseConfigure(signedData);
    this.Log?.debug('[Auto BLE] Protocol V2 schema configured');
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
      this.Log?.debug(`[Auto BLE] enumerate found ${devices.length} device(s):`);
      for (const dev of devices) {
        this.Log?.debug(`[Auto BLE]   id="${dev.id}" name="${dev.name}"`);
      }
      return devices.map(device => toBleDescriptor(device));
    } catch (error) {
      this.Log?.error('[Auto BLE] enumerate failed:', error);
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

      this.v1Buffers.set(uuid, { buffer: [], bufferLength: 0 });
      this.v2Assemblers.set(uuid, new ProtocolV2FrameAssembler());

      await window.desktopApi.nobleBle.subscribe(uuid);

      const cleanup = window.desktopApi.nobleBle.onNotification(
        (deviceId: string, data: string) => {
          if (deviceId === uuid) {
            this.handleNotification(uuid, data);
          }
        }
      );
      this.notificationCleanups.set(uuid, cleanup);

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

      const protocolType = await this.detectProtocol(uuid);

      this.emitter?.emit('device-connect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });

      return {
        ...toBleDescriptor({ id: device.id, name: device.name }, protocolType),
        uuid,
      };
    } catch (error) {
      this.Log?.error('[Auto BLE] acquire failed:', error);
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
      this.Log?.error('[Auto BLE] release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  private async detectProtocol(uuid: string): Promise<ProtocolType> {
    const protocol: ProtocolType = (await this.probeProtocolV2(uuid)) ? 'V2' : 'V1';
    this.deviceProtocol.set(uuid, protocol);
    this.Log?.debug(`[Auto BLE] detectProtocol: uuid=${uuid} -> ${protocol}`);
    return protocol;
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    return probeProtocolV2({
      call: (name, data, options) => this.callProtocolV2(uuid, name, data, options?.timeoutMs),
      timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS,
      logger: this.Log,
      logPrefix: 'Auto BLE',
      onBeforeProbe: () => {
        this.deviceProtocol.set(uuid, 'V2');
        this.v2Assemblers.get(uuid)?.reset();
      },
      onProbeFailed: () => {
        this.v2Assemblers.get(uuid)?.reset();
      },
    });
  }

  private async writeWithChunking(uuid: string, hexData: string): Promise<void> {
    const totalBytes = hexData.length / 2;

    if (totalBytes <= BLE_PACKET_SIZE) {
      await wait(BLE_WRITE_DELAY_MS);
      await this.writeWithRetry(uuid, hexData);
      return;
    }

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
          `[Auto BLE] write failed (attempt ${attempt}/${BLE_WRITE_MAX_RETRIES}):`,
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

  private handleNotification(deviceId: string, hexData: string): void {
    if (hexData === 'PAIRING_REJECTED') {
      this.Log?.debug('[Auto BLE] Pairing rejection detected for device:', deviceId);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled));
      }
      return;
    }

    const protocol = this.deviceProtocol.get(deviceId) ?? 'V1';
    if (protocol === 'V2') {
      this.handleProtocolV2Notification(deviceId, hexData);
      return;
    }
    this.handleProtocolV1Notification(deviceId, hexData);
  }

  private handleProtocolV2Notification(deviceId: string, hexData: string): void {
    try {
      const bytes = hexToBytes(hexData);
      if (bytes.length === 0) return;

      const assembler = this.v2Assemblers.get(deviceId);
      if (!assembler) return;

      const frameData = assembler.push(bytes);
      if (!frameData) return;

      if (this.runPromise) {
        this.runPromise.resolve(frameData);
      }
    } catch (error) {
      this.Log?.error('[Auto BLE] Protocol V2 notification error:', error);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
    }
  }

  private handleProtocolV1Notification(deviceId: string, hexData: string): void {
    const result = this.processProtocolV1Notification(deviceId, hexData);

    if (result.error) {
      this.Log?.error('[Auto BLE] Protocol V1 packet processing error:', result.error);
      if (this.runPromise) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
      return;
    }

    if (result.isComplete && result.completePacket && this.runPromise) {
      this.runPromise.resolve(result.completePacket);
    }
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    if (!this.connectedDevices.has(uuid)) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound, `Device ${uuid} not connected`);
    }

    const protocol = this.deviceProtocol.get(uuid) ?? 'V1';
    if (LogBlockCommand.has(name)) {
      this.Log?.debug('[Auto BLE] call', 'name:', name, 'protocol:', protocol);
    } else {
      this.Log?.debug('[Auto BLE] call', 'name:', name, 'data:', data, 'protocol:', protocol);
    }

    if (protocol === 'V2') {
      return this.callProtocolV2(uuid, name, data);
    }
    return this.callProtocolV1(uuid, name, data);
  }

  private async callProtocolV1(uuid: string, name: string, data: Record<string, unknown>) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    this.runPromise = createDeferred();
    const messages = this._messages;
    const buffers = buildBuffers(messages, name, data);

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE write API not available');
      }

      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        if (!buffer || typeof buffer.toString !== 'function') {
          throw new Error(`Buffer ${i + 1} is invalid`);
        }
        const hexString = buffer.toString('hex');
        if (hexString.length === 0) {
          throw new Error(`Buffer ${i + 1} is empty`);
        }
        await window.desktopApi.nobleBle.write(uuid, hexString);
      }

      const response = await this.runPromise.promise;
      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.error('[Auto BLE] Protocol V1 call error:', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  private async callProtocolV2(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    timeoutMs = BLE_RESPONSE_TIMEOUT_MS
  ) {
    if (!this._messages || !this._messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel' || name === 'GetProtoVersion';
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    this.runPromise = createDeferred();

    try {
      const session = new ProtocolV2Session({
        schemas: {
          protocolV1: this._messages,
          protocolV2: this._messagesV2,
        },
        router: PROTOCOL_V2_CHANNEL_BLE_UART,
        writeFrame: frame => this.writeWithChunking(uuid, bytesToHex(frame)),
        readFrame: async () => {
          const rxFrame = await this.runPromise?.promise;
          if (!(rxFrame instanceof Uint8Array)) {
            throw new Error('Response is not Uint8Array');
          }
          return rxFrame;
        },
        logger: this.Log,
        logPrefix: 'ProtocolV2 BLE',
        createTimeoutError: (_messageName, timeout) =>
          ERRORS.TypedError(
            HardwareErrorCode.BleTimeoutError,
            `BLE response timeout after ${timeout}ms for ${name}`
          ),
      });

      return await session.call(name, data, { timeoutMs });
    } catch (e) {
      this.Log?.error('[Auto BLE] Protocol V2 call error:', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  private processProtocolV1Notification(deviceId: string, hexData: string): PacketProcessResult {
    try {
      if (typeof hexData !== 'string') {
        return { isComplete: false, error: 'Invalid hexData type' };
      }

      const cleanHexData = hexData.replace(/\s+/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(cleanHexData)) {
        return { isComplete: false, error: 'Invalid hex data format' };
      }

      const hexMatch = cleanHexData.match(/.{1,2}/g);
      if (!hexMatch) {
        return { isComplete: false, error: 'Failed to parse hex data' };
      }

      const data = new Uint8Array(hexMatch.map(byte => parseInt(byte, 16)));
      const bufferState = this.v1Buffers.get(deviceId);
      if (!bufferState) {
        return { isComplete: false, error: 'No buffer state for device' };
      }

      if (isHeaderChunk(data)) {
        const dataView = new DataView(data.buffer);
        bufferState.bufferLength = dataView.getInt32(5, false);
        bufferState.buffer = [...data.subarray(3)];
      } else {
        bufferState.buffer = bufferState.buffer.concat([...data]);
      }

      if (bufferState.buffer.length - COMMON_HEADER_SIZE >= bufferState.bufferLength) {
        const completeBuffer = new Uint8Array(bufferState.buffer);
        bufferState.bufferLength = 0;
        bufferState.buffer = [];

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

  getProtocolType(path: string): ProtocolType {
    return this.deviceProtocol.get(path) ?? 'V1';
  }
}
