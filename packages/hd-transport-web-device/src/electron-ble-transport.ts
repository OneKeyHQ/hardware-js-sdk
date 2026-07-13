import transport, {
  LogBlockCommand,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkManager,
  bytesToHex,
  hexToBytes,
  probeProtocolV2 as probeProtocolV2Helper,
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

const FILE_WRITE_LOG_BLOCK_PATTERN = /(?:^|[^a-z])(?:raw)?(?:filesystem|emmc)?filewrite$/i;

function shouldSuppressHighVolumeCallLog(name: string) {
  const normalized = name.replace(/[_\s-]/g, '');
  return FILE_WRITE_LOG_BLOCK_PATTERN.test(normalized);
}

function isLogBlockCommand(name: string) {
  return (LogBlockCommand as Set<string> | undefined)?.has?.(name) ?? false;
}

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

function inferProtocolHintFromDeviceName(name?: string | null): ProtocolType | undefined {
  return /\bpro\s*2\b/i.test(name ?? '') ? 'V2' : undefined;
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
const BLE_RESPONSE_TIMEOUT_MS = 30_000;
const PROTOCOL_PROBE_TIMEOUT_MS = 1000;
const PROTOCOL_V2_PROBE_TIMEOUT_MS = 5000;

/**
 * Desktop Electron BLE transport with automatic Protocol V1/V2 detection.
 *
 * Protocol V1 devices continue using chunked packets. Protocol V2 is detected
 * after a Protocol V1 Initialize timeout by probing Protocol V2 Ping.
 */
export default class ElectronBleTransport {
  private _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  private _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronBleTransport';

  configured = false;

  runPromise: Deferred<Uint8Array | string> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  private connectedDevices: Set<string> = new Set();

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

  private v1Buffers: Map<string, { buffer: number[]; bufferLength: number }> = new Map();

  private v2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  private v2FrameQueues: Map<string, Uint8Array[]> = new Map();

  private v2FramePromises: Map<string, Deferred<Uint8Array>> = new Map();

  private protocolV2Links = new ProtocolV2LinkManager<string>({
    getSchemas: () => {
      if (!this._messages || !this._messagesV2) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
      }
      return {
        protocolV1: this._messages,
        protocolV2: this._messagesV2,
      };
    },
    classifyError: () => 'link-fatal',
    onLinkInvalidated: async (uuid, reason) => {
      this.v2Assemblers.get(uuid)?.reset();
      this.rejectProtocolV2Frames(uuid, new Error(reason));
      this.Log?.debug('[Electron BLE] Protocol V2 link invalidated:', uuid, reason);
      if (reason.startsWith('Protocol V2 link-fatal error:')) {
        await this.release(uuid);
      }
    },
  });

  private notificationCleanups: Map<string, () => void> = new Map();

  private disconnectCleanups: Map<string, () => void> = new Map();

  private notificationTokens: Map<string, number> = new Map();

  private nextNotificationToken = 1;

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
    this.protocolV2Links
      .invalidateLink(deviceId, 'Electron BLE device state cleaned')
      .catch(error => this.Log?.debug('[Electron BLE] link cleanup failed:', error));
    this.connectedDevices.delete(deviceId);
    this.deviceProtocol.delete(deviceId);
    // Keep deviceProtocolHints — it's inferred from device name (e.g. "Pro 2" → V2)
    // and doesn't depend on connection state. Preserving it avoids redundant V1 probe on reconnect.
    this.v1Buffers.delete(deviceId);
    this.v2Assemblers.delete(deviceId);
    this.resetProtocolV2Frames(deviceId);
    this.notificationTokens.delete(deviceId);

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

    this.Log?.debug('[Electron BLE] Transport initialized');
  }

  configure(signedData: any) {
    this._messages = parseConfigure(signedData);
    this.configured = true;
  }

  configureProtocolV2(signedData: any) {
    this._messagesV2 = parseConfigure(signedData);
    this.protocolV2Links
      .invalidateAllLinks('Protocol V2 schema reconfigured')
      .catch(error => this.Log?.debug('[Electron BLE] schema link cleanup failed:', error));
    this.Log?.debug('[Electron BLE] Protocol V2 schema configured');
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
      this.Log?.debug(`[Electron BLE] enumerate found ${devices.length} device(s):`);
      for (const dev of devices) {
        this.Log?.debug(`[Electron BLE]   id="${dev.id}" name="${dev.name}"`);
        const protocolHint = inferProtocolHintFromDeviceName(dev.name);
        if (protocolHint) {
          this.deviceProtocolHints.set(dev.id, protocolHint);
        }
      }
      return devices.map(device => toBleDescriptor(device));
    } catch (error) {
      this.Log?.error('[Electron BLE] enumerate failed:', error);
      this.handleBluetoothError(error);
    }
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise, expectedProtocol } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    if (this.connectedDevices.has(uuid)) {
      await this.release(uuid);
    }

    if (forceCleanRunPromise && this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectAllProtocolV2Frames(error);
      this.runPromise = null;
    }

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      const device = await window.desktopApi.nobleBle.getDevice(uuid);
      if (!device) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device ${uuid} not found`);
      }
      const protocolHint = expectedProtocol
        ? undefined
        : this.deviceProtocolHints.get(uuid) ?? inferProtocolHintFromDeviceName(device.name);
      if (protocolHint) {
        this.deviceProtocolHints.set(uuid, protocolHint);
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

      const cleanup = this.createNotificationSubscription(uuid);
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

      const protocolType = await this.detectProtocol(uuid, expectedProtocol, protocolHint);

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
      this.Log?.error('[Electron BLE] acquire failed:', error);
      try {
        if (window.desktopApi?.nobleBle && this.connectedDevices.has(uuid)) {
          await window.desktopApi.nobleBle.unsubscribe(uuid);
          await window.desktopApi.nobleBle.disconnect(uuid);
        }
      } catch (cleanupError) {
        this.Log?.debug('[Electron BLE] acquire cleanup failed:', cleanupError);
      }
      this.cleanupDeviceState(uuid);
      throw error;
    }
  }

  async release(id: string) {
    try {
      await this.protocolV2Links.invalidateLink(id, 'Electron BLE transport released');
      if (this.connectedDevices.has(id)) {
        if (window.desktopApi?.nobleBle) {
          await window.desktopApi.nobleBle.unsubscribe(id);
          await window.desktopApi.nobleBle.disconnect(id);
        }
        this.cleanupDeviceState(id);
      }
    } catch (error) {
      this.Log?.error('[Electron BLE] release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.BleTimeoutError,
      'Unable to detect BLE protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
    );
  }

  private clearProbeProtocol(uuid: string, protocol: ProtocolType) {
    if (this.deviceProtocol.get(uuid) === protocol) {
      this.deviceProtocol.delete(uuid);
    }
  }

  private async detectProtocol(
    uuid: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(uuid)) {
        this.deviceProtocol.set(uuid, 'V1');
        this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> V1 (expected)`);
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      // 免探测路径：调用方显式承诺该设备是 V2（例如固件升级重启后的重连场景，
      // 上层已经探测过协议并通过 expectedProtocol 传回），这里不再重复探测。
      this.deviceProtocol.set(uuid, 'V2');
      this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> V2 (expected)`);
      return 'V2';
    }

    // 项目约束：协议判断必须在连接后主动探测，不能依赖设备名/PID/descriptor。
    // 设备名 hint（如 "Pro 2"）只用于调整探测顺序：hint=V2 时先探 V2、失败回落 V1，
    // 不能作为最终结论。
    const probeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(uuid) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];

    for (let i = 0; i < probeOrder.length; i += 1) {
      const protocol = probeOrder[i];
      if (i > 0) {
        // 上一个协议探测失败后，重置订阅与缓冲，避免残留数据干扰下一个协议的探测。
        await this.resetProbeStateAfterProtocolProbe(uuid, probeOrder[i - 1]);
      }
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(uuid) : await this.probeProtocolV2(uuid);
      if (detected) {
        this.deviceProtocol.set(uuid, protocol);
        this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> ${protocol}`);
        return protocol;
      }
    }

    this.deviceProtocol.delete(uuid);
    throw this.createProtocolDetectionError();
  }

  private createNotificationSubscription(uuid: string) {
    if (!window.desktopApi?.nobleBle) {
      throw new Error('Noble BLE API not available');
    }

    const notificationToken = this.nextNotificationToken;
    this.nextNotificationToken += 1;
    this.notificationTokens.set(uuid, notificationToken);

    return window.desktopApi.nobleBle.onNotification((deviceId: string, data: string) => {
      if (deviceId === uuid && this.notificationTokens.get(uuid) === notificationToken) {
        this.handleNotification(uuid, data);
      }
    });
  }

  private async resetProbeStateAfterProtocolProbe(uuid: string, protocol: ProtocolType) {
    await this.protocolV2Links.invalidateLink(
      uuid,
      `Reset notify state after Protocol ${protocol} probe`
    );
    this.v1Buffers.set(uuid, { buffer: [], bufferLength: 0 });
    this.v2Assemblers.get(uuid)?.reset();
    this.resetProtocolV2Frames(uuid);
    if (this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
    }

    const notifyCleanup = this.notificationCleanups.get(uuid);
    if (notifyCleanup) {
      notifyCleanup();
      this.notificationCleanups.delete(uuid);
    }
    this.notificationTokens.delete(uuid);

    try {
      await window.desktopApi?.nobleBle?.unsubscribe(uuid);
    } catch (error) {
      this.Log?.debug(`[Electron BLE] unsubscribe after Protocol ${protocol} probe failed:`, error);
    }
    try {
      await window.desktopApi?.nobleBle?.subscribe(uuid);
    } catch (error) {
      this.Log?.debug(`[Electron BLE] resubscribe after Protocol ${protocol} probe failed:`, error);
      throw error;
    }

    const cleanup = this.createNotificationSubscription(uuid);
    this.notificationCleanups.set(uuid, cleanup);
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
      this.clearProbeProtocol(uuid, 'V1');
      this.Log?.debug('[Electron BLE] Protocol V1 Initialize probe failed:', error);
      return false;
    }
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    this.deviceProtocol.set(uuid, 'V2');
    this.v2Assemblers.get(uuid)?.reset();
    const detected = await probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(uuid, name, data, options),
      timeoutMs: PROTOCOL_V2_PROBE_TIMEOUT_MS,
      logger: this.Log,
      logPrefix: 'ProtocolV2 BLE',
      onProbeFailed: () => {
        this.v2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
    });
    if (!detected) {
      this.clearProbeProtocol(uuid, 'V2');
    }
    return detected;
  }

  private async writeWithChunking(uuid: string, hexData: string): Promise<void> {
    const totalBytes = hexData.length / 2;

    if (totalBytes <= BLE_PACKET_SIZE) {
      await wait(BLE_WRITE_DELAY_MS);
      await this.writeOnce(uuid, hexData);
      return;
    }

    for (let offset = 0; offset < hexData.length; ) {
      const chunkHexLen = Math.min(BLE_PACKET_SIZE * 2, hexData.length - offset);
      const chunkHex = hexData.substring(offset, offset + chunkHexLen);
      offset += chunkHexLen;

      await this.writeOnce(uuid, chunkHex);

      if (offset < hexData.length) {
        await wait(BLE_WRITE_DELAY_MS);
      }
    }
  }

  private async writeOnce(uuid: string, hexData: string): Promise<void> {
    const nobleBle = window.desktopApi?.nobleBle;
    if (!nobleBle) {
      throw new Error('Noble BLE API not available');
    }

    await nobleBle.write(uuid, hexData);
  }

  private handleNotification(deviceId: string, hexData: string): void {
    if (hexData === 'PAIRING_REJECTED') {
      this.Log?.debug('[Electron BLE] Pairing rejection detected for device:', deviceId);
      const error = ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled);
      if (this.deviceProtocol.get(deviceId) === 'V2') {
        this.rejectProtocolV2Frames(deviceId, error);
      } else if (this.runPromise) {
        this.runPromise.reject(error);
      }
      return;
    }

    const protocol = this.deviceProtocol.get(deviceId);
    if (!protocol) {
      this.Log?.debug('[Electron BLE] Ignore notification before protocol detection:', deviceId);
      return;
    }
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

      for (const frameData of assembler.drain(bytes)) {
        this.resolveProtocolV2Frame(deviceId, frameData);
      }
    } catch (error) {
      this.Log?.error('[Electron BLE] Protocol V2 notification error:', error);
      const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
      this.rejectProtocolV2Frames(deviceId, notifyError);
    }
  }

  private getProtocolV2FrameQueue(uuid: string) {
    let queue = this.v2FrameQueues.get(uuid);
    if (!queue) {
      queue = [];
      this.v2FrameQueues.set(uuid, queue);
    }
    return queue;
  }

  private resolveProtocolV2Frame(uuid: string, frame: Uint8Array) {
    const framePromise = this.v2FramePromises.get(uuid);
    if (framePromise) {
      framePromise.resolve(frame);
      this.v2FramePromises.delete(uuid);
      return;
    }
    this.getProtocolV2FrameQueue(uuid).push(frame);
  }

  private rejectAllProtocolV2Frames(error: Error) {
    this.v2FrameQueues.clear();
    for (const framePromise of this.v2FramePromises.values()) {
      framePromise.reject(error);
    }
    this.v2FramePromises.clear();
  }

  private resetProtocolV2Frames(uuid: string) {
    this.v2FrameQueues.delete(uuid);
    this.v2FramePromises.delete(uuid);
  }

  private rejectProtocolV2Frames(uuid: string, error: Error) {
    this.v2FrameQueues.delete(uuid);
    const framePromise = this.v2FramePromises.get(uuid);
    if (framePromise) {
      this.v2FramePromises.delete(uuid);
      framePromise.reject(error);
    }
  }

  private async readProtocolV2Frame(uuid: string) {
    const queuedFrame = this.getProtocolV2FrameQueue(uuid).shift();
    if (queuedFrame) {
      return queuedFrame;
    }

    const framePromise = createDeferred<Uint8Array>();
    this.v2FramePromises.set(uuid, framePromise);
    try {
      return await framePromise.promise;
    } finally {
      if (this.v2FramePromises.get(uuid) === framePromise) {
        this.v2FramePromises.delete(uuid);
      }
    }
  }

  private handleProtocolV1Notification(deviceId: string, hexData: string): void {
    const result = this.processProtocolV1Notification(deviceId, hexData);

    if (result.error) {
      this.Log?.error('[Electron BLE] Protocol V1 packet processing error:', result.error);
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

    const protocol = this.deviceProtocol.get(uuid);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${uuid}`
      );
    }
    if (shouldSuppressHighVolumeCallLog(name)) {
      // 高频文件写入不要逐包发 debug 事件，否则调试日志会反向拖慢传输。
    } else if (isLogBlockCommand(name)) {
      this.Log?.debug('[Electron BLE] call', 'name:', name, 'protocol:', protocol);
    } else {
      this.Log?.debug('[Electron BLE] call', 'name:', name, 'data:', data, 'protocol:', protocol);
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
      this.Log?.error('[Electron BLE] Protocol V1 call error:', e);
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

    const callOptions = {
      ...options,
      timeoutMs: options?.timeoutMs ?? BLE_RESPONSE_TIMEOUT_MS,
    };

    try {
      return await this.protocolV2Links.call(
        uuid,
        () => this.createProtocolV2Adapter(uuid),
        name,
        data,
        callOptions
      );
    } catch (e) {
      this.Log?.error('[Electron BLE] Protocol V2 call error:', e);
      throw e;
    }
  }

  private createProtocolV2Adapter(uuid: string) {
    const generation = this.notificationTokens.get(uuid) ?? 0;
    const assertCurrentGeneration = () => {
      if (this.notificationTokens.get(uuid) !== generation) {
        throw new Error(`Protocol V2 notification generation changed for ${uuid}`);
      }
    };

    return {
      router: PROTOCOL_V2_CHANNEL_BLE_UART,
      generation,
      prepareCall: () => {
        assertCurrentGeneration();
        this.v2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
      writeFrame: (frame: Uint8Array) => {
        assertCurrentGeneration();
        return this.writeWithChunking(uuid, bytesToHex(frame));
      },
      readFrame: async () => {
        assertCurrentGeneration();
        const rxFrame = await this.readProtocolV2Frame(uuid);
        if (!(rxFrame instanceof Uint8Array)) {
          throw new Error('Response is not Uint8Array');
        }
        return rxFrame;
      },
      reset: (reason: string) => {
        this.v2Assemblers.get(uuid)?.reset();
        this.rejectProtocolV2Frames(uuid, new Error(reason));
      },
      logger: this.Log,
      logPrefix: 'ProtocolV2 BLE',
      createTimeoutError: (messageName: string, timeout: number) =>
        ERRORS.TypedError(
          HardwareErrorCode.BleTimeoutError,
          `BLE response timeout after ${timeout}ms for ${messageName}`
        ),
    };
  }

  private processProtocolV1Notification(deviceId: string, hexData: string): PacketProcessResult {
    try {
      if (typeof hexData !== 'string') {
        return { isComplete: false, error: 'Invalid hexData type' };
      }

      const data = hexToBytes(hexData);
      if (data.length === 0) {
        return { isComplete: false, error: 'Empty or invalid hex data' };
      }

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

      if (bufferState.buffer.length - PROTOCOL_V1_MESSAGE_HEADER_SIZE >= bufferState.bufferLength) {
        const completeBuffer = new Uint8Array(bufferState.buffer);
        bufferState.bufferLength = 0;
        bufferState.buffer = [];

        return { isComplete: true, completePacket: bytesToHex(completeBuffer) };
      }

      return { isComplete: false };
    } catch (error) {
      return { isComplete: false, error: `Packet processing error: ${error}` };
    }
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }
}
