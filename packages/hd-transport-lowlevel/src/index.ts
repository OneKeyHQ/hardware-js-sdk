import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import transport, {
  LogBlockCommand,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  bytesToHex,
  concatUint8Arrays,
  hexToBytes,
  probeProtocolV2 as probeProtocolV2Helper,
  withProtocolTimeout,
} from '@onekeyfe/hd-transport';

import type EventEmitter from 'events';
import type {
  LowLevelDevice,
  LowlevelTransportSharedPlugin,
  ProtocolType,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';
import type { LowLevelAcquireInput } from './types';

const { check, ProtocolV1, parseConfigure } = transport;

const PROTOCOL_PROBE_TIMEOUT_MS = 1000;
const PROTOCOL_V2_PROBE_TIMEOUT_MS = 5000;
const LOWLEVEL_PROTOCOL_TIMEOUT_MS = 30_000;
const LOWLEVEL_PROTOCOL_V2_PACKET_LENGTH = 64;

function inferProtocolHintFromDeviceName(name?: string | null): ProtocolType | undefined {
  return /\bpro\s*2\b/i.test(name ?? '') ? 'V2' : undefined;
}

function isProtocolV1TransportChunk(data: Uint8Array) {
  return data.length >= 9 && data[0] === 0x3f && data[1] === 0x23 && data[2] === 0x23;
}

function readProtocolV1PayloadLength(data: Uint8Array) {
  return data[5] * 0x1000000 + data[6] * 0x10000 + data[7] * 0x100 + data[8];
}

export default class LowlevelTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  Log?: any;

  emitter?: EventEmitter;

  plugin: LowlevelTransportSharedPlugin = {} as LowlevelTransportSharedPlugin;

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

  private protocolV2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }

  init(logger: any, emitter: EventEmitter, plugin: LowlevelTransportSharedPlugin) {
    this.Log = logger;
    this.emitter = emitter;
    this.plugin = plugin;
    this.plugin.init();
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  configureProtocolV2(signedData: any) {
    this._messagesV2 = parseConfigure(signedData);
  }

  listen() {
    // empty
  }

  async enumerate() {
    const devices = await this.plugin.enumerate();
    return devices.map((device: LowLevelDevice) => {
      const protocolHint = inferProtocolHintFromDeviceName(device.name);
      if (protocolHint) {
        this.deviceProtocolHints.set(device.id, protocolHint);
      }
      return device;
    });
  }

  async acquire(input: LowLevelAcquireInput) {
    try {
      await this.plugin.connect(input.uuid);
    } catch (error) {
      this.Log.debug('lowlelvel transport connect error: ', error);
      throw ERRORS.TypedError(
        HardwareErrorCode.LowlevelTrasnportConnectError,
        error.message ?? error
      );
    }

    this.protocolV2Assemblers.set(input.uuid, new ProtocolV2FrameAssembler());
    const protocolHint = input.expectedProtocol
      ? undefined
      : this.deviceProtocolHints.get(input.uuid);
    const protocolType = await this.detectProtocol(
      input.uuid,
      input.expectedProtocol,
      protocolHint
    );
    return { uuid: input.uuid, protocolType };
  }

  async release(uuid: string) {
    try {
      await this.plugin.disconnect(uuid);
      this.deviceProtocol.delete(uuid);
      this.deviceProtocolHints.delete(uuid);
      this.protocolV2Assemblers.delete(uuid);
      return true;
    } catch (error) {
      this.Log.debug('lowlelvel transport disconnect error: ', error);
      return false;
    }
  }

  async call(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (this._messages === null || !this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const protocol = this.getProtocolType(uuid);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${uuid}`
      );
    }
    if (LogBlockCommand.has(name)) {
      this.Log.debug('lowlevel-transport', 'call-', ' name: ', name, ' protocol: ', protocol);
    } else {
      this.Log.debug(
        'lowlevel-transport',
        'call-',
        ' name: ',
        name,
        ' data: ',
        data,
        ' protocol: ',
        protocol
      );
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

    const messages = this._messages;
    const buffers = ProtocolV1.encodeTransportPackets(messages, name, data);
    for (const o of buffers) {
      const outData = o.toString('hex');
      // Upload resources on low-end phones may OOM
      this.Log.debug('send hex strting: ', outData);
      try {
        await this.plugin.send(uuid, outData);
      } catch (e) {
        this.Log.debug('lowlevel transport send error: ', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, e.reason);
      }
    }

    try {
      const response = await this.readProtocolV1Message(options?.timeoutMs);
      this.Log.debug('receive data: ', response);
      const jsonData = ProtocolV1.decodeMessage(messages, response);
      return check.call(jsonData);
    } catch (e) {
      if (name === 'Initialize' && options?.timeoutMs === PROTOCOL_PROBE_TIMEOUT_MS) {
        this.Log.debug('[LowlevelTransport] Protocol V1 Initialize probe call failed:', e);
      } else {
        this.Log.error('lowlevel call error: ', e);
      }
      throw e;
    }
  }

  private createProtocolTimeoutError(name: string, timeout: number) {
    return ERRORS.TypedError(
      HardwareErrorCode.BleTimeoutError,
      `Lowlevel response timeout after ${timeout}ms for ${name}`
    );
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
    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(uuid)) {
        this.deviceProtocol.set(uuid, 'V2');
        this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V2 (expected)`);
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(uuid)) {
        this.deviceProtocol.set(uuid, 'V1');
        this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V1 (expected)`);
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (protocolHint === 'V2' && (await this.probeProtocolV2(uuid))) {
      this.deviceProtocol.set(uuid, 'V2');
      this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V2 (hint)`);
      return 'V2';
    }

    const cachedProtocol = this.deviceProtocol.get(uuid);
    if (cachedProtocol === 'V2' && (await this.probeProtocolV2(uuid))) {
      this.deviceProtocol.set(uuid, 'V2');
      this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V2 (cached)`);
      return 'V2';
    }

    const protocolV1Detected = await this.probeProtocolV1(uuid);
    if (protocolV1Detected) {
      this.deviceProtocol.set(uuid, 'V1');
      this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V1`);
      return 'V1';
    }

    await this.resetConnectionAfterProbe(uuid, 'V1');
    if (await this.probeProtocolV2(uuid)) {
      this.deviceProtocol.set(uuid, 'V2');
      this.Log?.debug(`[LowlevelTransport] detectProtocol: uuid=${uuid} -> V2`);
      return 'V2';
    }

    this.deviceProtocol.delete(uuid);
    throw this.createProtocolDetectionError();
  }

  private async resetConnectionAfterProbe(uuid: string, protocol: ProtocolType) {
    this.protocolV2Assemblers.get(uuid)?.reset();

    try {
      await this.plugin.disconnect(uuid);
    } catch (error) {
      this.Log?.debug(
        `[LowlevelTransport] disconnect after Protocol ${protocol} probe failed:`,
        error
      );
    }

    try {
      await this.plugin.connect(uuid);
    } catch (error) {
      this.Log?.debug(
        `[LowlevelTransport] reconnect after Protocol ${protocol} probe failed:`,
        error
      );
      throw ERRORS.TypedError(
        HardwareErrorCode.LowlevelTrasnportConnectError,
        error.message ?? error
      );
    }
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
      this.Log?.debug('[LowlevelTransport] Protocol V1 Initialize probe failed:', error);
      return false;
    }
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    this.deviceProtocol.set(uuid, 'V2');
    this.protocolV2Assemblers.get(uuid)?.reset();
    try {
      const detected = await probeProtocolV2Helper({
        call: (name: string, data: Record<string, unknown>, options?: TransportCallOptions) =>
          this.callProtocolV2(uuid, name, data, options),
        timeoutMs: PROTOCOL_V2_PROBE_TIMEOUT_MS,
        logger: this.Log,
        logPrefix: 'ProtocolV2 Lowlevel-BLE',
        onProbeFailed: async () => {
          this.protocolV2Assemblers.get(uuid)?.reset();
          await this.resetConnectionAfterProbe(uuid, 'V2');
        },
      });
      if (!detected) {
        this.clearProbeProtocol(uuid, 'V2');
      }
      return detected;
    } catch (error) {
      this.clearProbeProtocol(uuid, 'V2');
      throw error;
    }
  }

  private async receiveHex(timeoutMs: number | undefined, commandName: string) {
    const response = await withProtocolTimeout(this.plugin.receive(), timeoutMs, () =>
      this.createProtocolTimeoutError(commandName, timeoutMs ?? 0)
    );
    if (typeof response !== 'string') {
      throw new Error('Returning data is not string');
    }
    return response;
  }

  private async readProtocolV1Message(timeoutMs?: number) {
    const first = await this.receiveHex(timeoutMs, 'ProtocolV1');
    const firstData = hexToBytes(first);
    if (!isProtocolV1TransportChunk(firstData)) {
      return first;
    }

    const payloadLength = readProtocolV1PayloadLength(firstData);
    let buffer = firstData.slice(3);
    const expectedLength = PROTOCOL_V1_MESSAGE_HEADER_SIZE + payloadLength;

    while (buffer.length < expectedLength) {
      const next = await this.receiveHex(timeoutMs, 'ProtocolV1');
      buffer = concatUint8Arrays([buffer, hexToBytes(next)]);
    }

    return bytesToHex(buffer.slice(0, expectedLength));
  }

  private async readProtocolV2Frame(uuid: string, timeoutMs?: number) {
    let assembler = this.protocolV2Assemblers.get(uuid);
    if (!assembler) {
      assembler = new ProtocolV2FrameAssembler();
      this.protocolV2Assemblers.set(uuid, assembler);
    }

    const queuedFrame = assembler.push(new Uint8Array(0));
    if (queuedFrame) return queuedFrame;

    let frame: Uint8Array | undefined;
    while (!frame) {
      const response = await this.receiveHex(timeoutMs, 'ProtocolV2');
      const chunk = hexToBytes(response);
      if (chunk.length > 0) {
        frame = assembler.push(chunk);
      }
    }
    return frame;
  }

  private async writeProtocolV2Frame(uuid: string, frame: Uint8Array) {
    for (let offset = 0; offset < frame.length; offset += LOWLEVEL_PROTOCOL_V2_PACKET_LENGTH) {
      const chunk = frame.slice(offset, offset + LOWLEVEL_PROTOCOL_V2_PACKET_LENGTH);
      await this.plugin.send(uuid, bytesToHex(chunk));
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

    const timeoutMs = options?.timeoutMs ?? LOWLEVEL_PROTOCOL_TIMEOUT_MS;
    this.protocolV2Assemblers.get(uuid)?.reset();
    const session = new ProtocolV2Session({
      schemas: {
        protocolV1: this._messages,
        protocolV2: this._messagesV2,
      },
      router: PROTOCOL_V2_CHANNEL_BLE_UART,
      maxFrameBytes: PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
      writeFrame: (frame: Uint8Array) => this.writeProtocolV2Frame(uuid, frame),
      readFrame: () => this.readProtocolV2Frame(uuid, timeoutMs),
      logger: this.Log,
      logPrefix: 'ProtocolV2 Lowlevel-BLE',
      createTimeoutError: (_messageName: string, timeout: number) =>
        this.createProtocolTimeoutError(name, timeout),
    });

    try {
      return await session.call(name, data, {
        ...options,
        timeoutMs,
      });
    } catch (e) {
      this.protocolV2Assemblers.get(uuid)?.reset();
      this.Log.error('lowlevel Protocol V2 call error: ', e);
      throw e;
    }
  }

  cancel() {
    this.Log.debug('lowlevel-transport', 'cancel');
  }
}
