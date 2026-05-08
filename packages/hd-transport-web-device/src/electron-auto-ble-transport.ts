import transport, {
  LogBlockCommand,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  bytesToHex,
  hexToBytes,
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
import type { OneKeyDeviceInfo, ProtocolType, TransportCallOptions } from '@onekeyfe/hd-transport';
import type EventEmitter from 'events';

const { parseConfigure, ProtocolV1, check } = transport;

declare global {
  interface Window {
    desktopApi?: DesktopAPI;
  }
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
  expectedProtocol?: ProtocolType;
};

interface PacketProcessResult {
  isComplete: boolean;
  completePacket?: string;
  error?: string;
}

function inferProtocolTypeFromDeviceName(name?: string | null): ProtocolType | undefined {
  return /\bpro\s*2\b/i.test(name ?? '') ? 'V2' : undefined;
}

const toBleDescriptor = (
  device: { id: string; name: string | null },
  protocolType?: ProtocolType
): OneKeyDeviceInfo => {
  const resolvedProtocolType = protocolType ?? inferProtocolTypeFromDeviceName(device.name);

  return {
    id: device.id,
    name: device.name,
    path: device.id,
    debug: false,
    commType: 'electron-ble',
    ...(resolvedProtocolType ? { protocolType: resolvedProtocolType } : {}),
  } as OneKeyDeviceInfo;
};

const BLE_PACKET_SIZE = 192;
const BLE_WRITE_DELAY_MS = 5;
const BLE_WRITE_MAX_RETRIES = 3;
const BLE_WRITE_RETRY_DELAY_MS = 300;
const BLE_RESPONSE_TIMEOUT_MS = 30_000;
const PROTOCOL_PROBE_TIMEOUT_MS = 1000;

/**
 * Desktop Electron BLE transport with automatic Protocol V1/V2 detection.
 *
 * Protocol V1 devices continue using chunked packets. Protocol V2 is detected
 * after a Protocol V1 Initialize timeout by probing Protocol V2 Ping.
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

  private v2FrameQueue: Uint8Array[] = [];

  private v2FramePromise: Deferred<Uint8Array> | null = null;

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
    const { uuid, forceCleanRunPromise, expectedProtocol } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    if (forceCleanRunPromise && this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectProtocolV2Frame(error);
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

      const protocolType = await this.detectProtocol(uuid, expectedProtocol);

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
      try {
        if (window.desktopApi?.nobleBle && this.connectedDevices.has(uuid)) {
          await window.desktopApi.nobleBle.unsubscribe(uuid);
          await window.desktopApi.nobleBle.disconnect(uuid);
        }
      } catch (cleanupError) {
        this.Log?.debug('[Auto BLE] acquire cleanup failed:', cleanupError);
      }
      this.cleanupDeviceState(uuid);
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

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private async detectProtocol(
    uuid: string,
    expectedProtocol?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(uuid)) {
        this.deviceProtocol.set(uuid, 'V1');
        this.Log?.debug(`[Auto BLE] detectProtocol: uuid=${uuid} -> V1 (expected)`);
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2ByPing(uuid)) {
        this.deviceProtocol.set(uuid, 'V2');
        this.Log?.debug(`[Auto BLE] detectProtocol: uuid=${uuid} -> V2 (expected)`);
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (this.deviceProtocol.get(uuid) === 'V2' && (await this.probeProtocolV2ByPing(uuid))) {
      this.deviceProtocol.set(uuid, 'V2');
      this.Log?.debug(`[Auto BLE] detectProtocol: uuid=${uuid} -> V2 (cached)`);
      return 'V2';
    }

    let protocol: ProtocolType = 'V1';
    if (!(await this.probeProtocolV1(uuid)) && (await this.probeProtocolV2ByPing(uuid))) {
      protocol = 'V2';
    }
    this.deviceProtocol.set(uuid, protocol);
    this.Log?.debug(`[Auto BLE] detectProtocol: uuid=${uuid} -> ${protocol}`);
    return protocol;
  }

  private async probeProtocolV1(uuid: string) {
    if (!this._messages) {
      return false;
    }

    try {
      this.deviceProtocol.set(uuid, 'V1');
      await this.callProtocolV1(uuid, 'Initialize', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS });
      return true;
    } catch (error) {
      this.Log?.debug('[Auto BLE] Protocol V1 Initialize probe failed:', error);
      return false;
    }
  }

  private async probeProtocolV2ByPing(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    try {
      this.deviceProtocol.set(uuid, 'V2');
      this.v2Assemblers.get(uuid)?.reset();
      await this.callProtocolV2(
        uuid,
        'Ping',
        { message: 'probe' },
        { timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS }
      );
      return true;
    } catch (error) {
      this.v2Assemblers.get(uuid)?.reset();
      this.resetProtocolV2Frames();
      this.Log?.debug('[Auto BLE] Protocol V2 Ping probe failed:', error);
      return false;
    }
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
        const error = ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled);
        this.runPromise.reject(error);
        this.rejectProtocolV2Frame(error);
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
      if (!this.runPromise) {
        this.v2Assemblers.get(deviceId)?.reset();
        this.resetProtocolV2Frames();
        return;
      }

      const bytes = hexToBytes(hexData);
      if (bytes.length === 0) return;

      const assembler = this.v2Assemblers.get(deviceId);
      if (!assembler) return;

      let frameData = assembler.push(bytes);
      while (frameData) {
        this.resolveProtocolV2Frame(frameData);
        frameData = assembler.push(new Uint8Array(0));
      }
    } catch (error) {
      this.Log?.error('[Auto BLE] Protocol V2 notification error:', error);
      if (this.runPromise) {
        const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
        this.runPromise.reject(notifyError);
        this.rejectProtocolV2Frame(notifyError);
      }
    }
  }

  private resolveProtocolV2Frame(frame: Uint8Array) {
    if (this.v2FramePromise) {
      this.v2FramePromise.resolve(frame);
      this.v2FramePromise = null;
      return;
    }
    this.v2FrameQueue.push(frame);
  }

  private rejectProtocolV2Frame(error: Error) {
    this.v2FrameQueue = [];
    if (this.v2FramePromise) {
      this.v2FramePromise.reject(error);
      this.v2FramePromise = null;
    }
  }

  private resetProtocolV2Frames() {
    this.v2FrameQueue = [];
    this.v2FramePromise = null;
  }

  private async readProtocolV2Frame() {
    const queuedFrame = this.v2FrameQueue.shift();
    if (queuedFrame) {
      return queuedFrame;
    }

    const framePromise = createDeferred<Uint8Array>();
    this.v2FramePromise = framePromise;
    try {
      return await framePromise.promise;
    } finally {
      if (this.v2FramePromise === framePromise) {
        this.v2FramePromise = null;
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

  async call(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
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
      return this.callProtocolV2(uuid, name, data, options);
    }
    return this.callProtocolV1(uuid, name, data, options);
  }

  private async callProtocolV1(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const runPromise = createDeferred<Uint8Array | string>();
    runPromise.promise.catch(() => undefined);
    this.runPromise = runPromise;
    const messages = this._messages;
    const buffers = ProtocolV1.encodeTransportPackets(messages, name, data);
    let timeout: ReturnType<typeof setTimeout> | undefined;

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

      const response = await Promise.race([
        runPromise.promise,
        new Promise<never>((_, reject) => {
          if (options?.timeoutMs) {
            timeout = setTimeout(() => {
              const error = ERRORS.TypedError(
                HardwareErrorCode.BleTimeoutError,
                `BLE response timeout after ${options.timeoutMs}ms for ${name}`
              );
              runPromise.reject(error);
              reject(error);
            }, options.timeoutMs);
          }
        }),
      ]);
      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      const jsonData = ProtocolV1.decodeMessage(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.error('[Auto BLE] Protocol V1 call error:', e);
      throw e;
    } finally {
      if (timeout) clearTimeout(timeout);
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
    }
  }

  private async callProtocolV2(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages || !this._messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel' || name === 'GetProtoVersion';
    if (this.runPromise) {
      if (!forceRun) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
      }
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectProtocolV2Frame(error);
      this.runPromise = null;
    }

    const runPromise = createDeferred<Uint8Array | string>();
    runPromise.promise.catch(() => undefined);
    this.runPromise = runPromise;
    this.v2Assemblers.get(uuid)?.reset();
    this.resetProtocolV2Frames();
    let completed = false;
    const callOptions = {
      ...options,
      timeoutMs: options?.timeoutMs ?? BLE_RESPONSE_TIMEOUT_MS,
    };

    try {
      const session = new ProtocolV2Session({
        schemas: {
          protocolV1: this._messages,
          protocolV2: this._messagesV2,
        },
        router: PROTOCOL_V2_CHANNEL_BLE_UART,
        writeFrame: (frame: Uint8Array) => this.writeWithChunking(uuid, bytesToHex(frame)),
        readFrame: async () => {
          const rxFrame = await this.readProtocolV2Frame();
          if (!(rxFrame instanceof Uint8Array)) {
            throw new Error('Response is not Uint8Array');
          }
          return rxFrame;
        },
        logger: this.Log,
        logPrefix: 'ProtocolV2 BLE',
        createTimeoutError: (_messageName: string, timeout: number) =>
          ERRORS.TypedError(
            HardwareErrorCode.BleTimeoutError,
            `BLE response timeout after ${timeout}ms for ${name}`
          ),
      });

      const result = await session.call(name, data, callOptions);
      completed = true;
      return result;
    } catch (e) {
      this.v2Assemblers.get(uuid)?.reset();
      this.resetProtocolV2Frames();
      this.Log?.error('[Auto BLE] Protocol V2 call error:', e);
      throw e;
    } finally {
      if (!completed) {
        this.v2Assemblers.get(uuid)?.reset();
      }
      this.resetProtocolV2Frames();
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
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

      if (
        bufferState.buffer.length - PROTOCOL_V1_MESSAGE_HEADER_SIZE >=
        bufferState.bufferLength
      ) {
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
