/* eslint-disable no-undef */
import transport, {
  LogBlockCommand,
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V1_REPORT_ID,
  PROTOCOL_V1_USB_PACKET_SIZE,
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER, wait } from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';

import type {
  AcquireInput,
  OneKeyDeviceInfoBase,
  ProtocolType,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

const { parseConfigure, check, ProtocolV1 } = transport;

const CONFIGURATION_ID = 1;
const INTERFACE_ID = 0;
const ENDPOINT_ID = 1;
const PACKET_SIZE = PROTOCOL_V1_USB_PACKET_SIZE;
const PAYLOAD_SIZE = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE;
const REPORT_ID = PROTOCOL_V1_REPORT_ID;
const HEADER_LENGTH = PROTOCOL_V1_MESSAGE_HEADER_SIZE;
const PACKET_IO_MAX_RETRIES = 3;
const PACKET_IO_RETRY_DELAY = 300;
const PROTOCOL_PROBE_TIMEOUT = 1000;
const WEBUSB_FILE_WRITE_LOG_BLOCK_PATTERN = /(?:^|[^a-z])(?:raw)?(?:filesystem|emmc)?filewrite$/i;

function shouldSuppressWebUsbCallLog(name: string) {
  const normalized = name.replace(/[_\s-]/g, '');
  return WEBUSB_FILE_WRITE_LOG_BLOCK_PATTERN.test(normalized);
}

function shouldBlockWebUsbCallDataLog(name: string) {
  const normalized = name.replace(/[_\s-]/g, '');
  return LogBlockCommand.has(name) || WEBUSB_FILE_WRITE_LOG_BLOCK_PATTERN.test(normalized);
}

function inferProtocolHintFromDeviceName(name?: string | null): ProtocolType | undefined {
  return /\bpro\s*2\b/i.test(name ?? '') ? 'V2' : undefined;
}

/**
 * Device information with path and WebUSB device instance
 */
export interface DeviceInfo extends OneKeyDeviceInfoBase {
  path: string;
  device: USBDevice;
  protocolType?: ProtocolType;
}

/** USB endpoint pair discovered at connect time */
interface DeviceEndpoints {
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

interface TransferCancelToken {
  cancelled: boolean;
}

export default class WebUsbTransport {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protobuf schema for Protocol V2 transports. */
  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Per-path protocol type detected by active wire-level probe. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

  /** 按设备缓存 Protocol V2 frame assembler，保留同一次读取里多出来的后续 frame。 */
  private protocolV2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  /** Per-path USB endpoint / interface numbers (discovered from USB descriptors) */
  private deviceEndpoints: Map<string, DeviceEndpoints> = new Map();

  name = 'WebUsbTransport';

  stopped = false;

  configured = false;

  Log?: any;

  usb?: USB;

  /**
   * Cached list of connected devices
   * This is essential for maintaining device references between operations
   */
  deviceList: Array<DeviceInfo> = [];

  configurationId = CONFIGURATION_ID;

  endpointId = ENDPOINT_ID;

  interfaceId = INTERFACE_ID;

  /**
   * Initialize WebUSB transport
   */
  init(logger: any) {
    this.Log = logger;

    const { usb } = navigator;
    if (!usb) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'WebUSB is not supported by current browsers'
      );
    }
    this.usb = usb;
  }

  /**
   * Configure Protocol V1 protobuf schema (legacy chunked 0x3F framing).
   */
  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this.messages = messages;
  }

  /**
   * Cache the Protocol V2 protobuf schema.
   */
  configureProtocolV2(signedData: any) {
    this.messagesV2 = parseConfigure(signedData);
    this.Log?.debug('[WebUsbTransport] Protocol V2 schema configured');
  }

  /**
   * Request user to select a device
   * This method must be called in response to a user action
   * to comply with WebUSB security requirements
   */
  async promptDeviceAccess() {
    if (!this.usb) return null;
    try {
      const device = await this.usb.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
      return device;
    } catch (e) {
      this.Log.debug(
        'requestDevice error: ',
        e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      );
      return null;
    }
  }

  /**
   * Enumerate already connected devices
   * This method only returns devices that are already authorized by the browser
   * It does NOT prompt the user to select a device
   */
  async enumerate() {
    await this.getConnectedDevices();
    return this.deviceList;
  }

  /**
   * Get list of connected devices
   */
  async getConnectedDevices() {
    if (!this.usb) return [];

    const devices = await this.usb.getDevices();
    const onekeyDevices = devices.filter(dev => {
      const isOneKey = ONEKEY_WEBUSB_FILTER.some(
        desc => dev.vendorId === desc.vendorId && dev.productId === desc.productId
      );
      const hasSerialNumber = typeof dev.serialNumber === 'string' && dev.serialNumber.length > 0;
      return isOneKey && hasSerialNumber;
    });

    this.deviceList = onekeyDevices.map(device => {
      const path = device.serialNumber as string;
      const protocolHint = inferProtocolHintFromDeviceName(device.productName);
      if (protocolHint) {
        this.deviceProtocolHints.set(path, protocolHint);
      }

      return {
        path,
        device,
        commType: 'webusb',
      };
    });

    // Debug: log all discovered devices. Protocol is detected after acquire via wire probe.
    for (const dev of onekeyDevices) {
      this.Log.debug(
        `[WebUSB] Device: name="${dev.productName}" serial="${dev.serialNumber}" ` +
          `VID=0x${dev.vendorId.toString(16)} PID=0x${dev.productId.toString(16)}`
      );
    }

    return this.deviceList;
  }

  /**
   * Acquire device control
   */
  async acquire(input: AcquireInput) {
    if (!input.path) return;
    try {
      await this.connect(input.path ?? '', true);
      const deviceName = this.deviceList.find(device => device.path === input.path)?.device
        .productName;
      const protocolHint = input.expectedProtocol
        ? undefined
        : this.deviceProtocolHints.get(input.path) ?? inferProtocolHintFromDeviceName(deviceName);
      if (protocolHint) {
        this.deviceProtocolHints.set(input.path, protocolHint);
      }
      await this.detectProtocol(input.path, input.expectedProtocol, protocolHint);
      return await Promise.resolve(input.path);
    } catch (e) {
      this.Log.debug('acquire error: ', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      throw e;
    }
  }

  /**
   * Determine protocol type after connect.
   * Probe Protocol V1 first with Initialize. If it does not answer in time,
   * fall back to a Protocol V2 Ping probe.
   */
  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private async detectProtocol(
    path: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(path)) {
        this.deviceProtocol.set(path, 'V1');
        this.Log.debug(`[WebUsbTransport] detectProtocol: path=${path} -> V1 (expected)`);
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(path)) {
        this.deviceProtocol.set(path, 'V2');
        this.Log.debug(`[WebUsbTransport] detectProtocol: path=${path} -> V2 (expected)`);
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (protocolHint === 'V2' && (await this.probeProtocolV2(path))) {
      this.deviceProtocol.set(path, 'V2');
      this.Log.debug(`[WebUsbTransport] detectProtocol: path=${path} -> V2 (hint)`);
      return 'V2';
    }

    if (this.deviceProtocol.get(path) === 'V2' && (await this.probeProtocolV2(path))) {
      this.deviceProtocol.set(path, 'V2');
      this.Log.debug(`[WebUsbTransport] detectProtocol: path=${path} -> V2 (cached)`);
      return 'V2';
    }

    let protocol: ProtocolType = 'V1';
    if (!(await this.probeProtocolV1(path)) && (await this.probeProtocolV2(path))) {
      protocol = 'V2';
    }
    this.deviceProtocol.set(path, protocol);
    this.Log.debug(`[WebUsbTransport] detectProtocol: path=${path} -> ${protocol}`);
    return protocol;
  }

  /**
   * Find device by path
   */
  async findDevice(path: string) {
    // If device list is empty, refresh it first
    if (this.deviceList.length === 0) {
      await this.getConnectedDevices();
    }

    let device = this.deviceList.find(d => d.path === path);

    // If device not found after first attempt, try refreshing the list once more
    if (device == null) {
      await this.getConnectedDevices();
      device = this.deviceList.find(d => d.path === path);

      if (device == null) {
        throw new Error('Action was interrupted.');
      }
    }

    return device.device;
  }

  /**
   * Connect to device with retry mechanism
   */
  async connect(path: string, first: boolean) {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.connectToDevice(path, first);
      } catch (e) {
        if (i === maxRetries - 1) {
          throw e;
        }
        await wait(i * 200);
      }
    }
  }

  /**
   * Discover vendor-class (0xFF) interface and its IN/OUT endpoint numbers from USB descriptors.
   * Falls back to legacy hardcoded values if no vendor interface is found.
   */
  private discoverEndpoints(device: USBDevice): DeviceEndpoints {
    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 0xff) {
            let endpointIn = this.endpointId;
            let endpointOut = this.endpointId;
            for (const ep of alt.endpoints) {
              if (ep.direction === 'in') endpointIn = ep.endpointNumber;
              else endpointOut = ep.endpointNumber;
            }
            this.Log?.debug(
              `[WebUsbTransport] discovered vendor interface ${iface.interfaceNumber}, ` +
                `endpointIn=${endpointIn}, endpointOut=${endpointOut}`
            );
            return { interfaceNumber: iface.interfaceNumber, endpointIn, endpointOut };
          }
        }
      }
    }
    // Fallback: legacy hardcoded values
    this.Log?.debug('[WebUsbTransport] no vendor interface found, using defaults');
    return {
      interfaceNumber: this.interfaceId,
      endpointIn: this.endpointId,
      endpointOut: this.endpointId,
    };
  }

  /**
   * Connect to specific device.
   * Discovers interface/endpoint numbers from USB descriptors on first connection.
   */
  async connectToDevice(path: string, first: boolean) {
    const device: USBDevice = await this.findDevice(path);
    this.Log.debug(
      '[WebUsbTransport] connecting to device:',
      device.productName,
      'PID:',
      device.productId
    );

    await device.open();

    if (
      first ||
      !device.configuration ||
      device.configuration.configurationValue !== this.configurationId
    ) {
      await device.selectConfiguration(this.configurationId);
    }

    // Discover endpoints from USB descriptors; descriptors are not used for protocol selection.
    const endpoints = this.discoverEndpoints(device);
    this.deviceEndpoints.set(path, endpoints);
    if (!this.protocolV2Assemblers.has(path)) {
      this.protocolV2Assemblers.set(
        path,
        new ProtocolV2FrameAssembler(PROTOCOL_V2_FRAME_MAX_BYTES)
      );
    }

    await device.claimInterface(endpoints.interfaceNumber);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    await this.call(session, name, data);
  }

  private getErrorMessage(error: unknown) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && 'message' in error) {
      const { message } = error as { message?: unknown };
      return typeof message === 'string' ? message : String(message ?? '');
    }
    return String(error);
  }

  private isRetryablePacketIoError(error: unknown) {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes('transferout') ||
      message.includes('transferin') ||
      message.includes('usbdevice') ||
      message.includes('disconnected') ||
      message.includes('device not found') ||
      message.includes('action was interrupted') ||
      message.includes('networkerror')
    );
  }

  private async reconnectForPacketIoRetry(
    path: string,
    direction: 'in' | 'out',
    attempt: number,
    error: unknown
  ) {
    this.Log.debug(
      `[WebUsbTransport] transfer${direction} failed, retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
        error
      )}`
    );
    await wait(attempt * PACKET_IO_RETRY_DELAY);

    try {
      const currentDevice = await this.findDevice(path);
      if (currentDevice.opened) {
        const endpoints = this.deviceEndpoints.get(path);
        const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
        try {
          await currentDevice.releaseInterface(ifaceNum);
        } catch (releaseError) {
          this.Log.debug('[WebUsbTransport] releaseInterface before retry error:', releaseError);
        }
        await currentDevice.close();
      }
    } catch (closeError) {
      this.Log.debug('[WebUsbTransport] close device before retry error:', closeError);
    }

    await this.getConnectedDevices();
    await this.connect(path, false);
  }

  private getTransferInData(result: USBInTransferResult): DataView {
    if (result.status !== 'ok') {
      throw new Error(`transferIn status: ${String(result.status)}`);
    }
    if (!result.data || result.data.byteLength === 0) {
      throw new Error('transferIn no data');
    }
    return result.data;
  }

  private toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    const copied = new Uint8Array(buffer.byteLength);
    copied.set(new Uint8Array(buffer));
    return copied.buffer;
  }

  private async transferOutWithRetry(path: string, packet: Uint8Array) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt += 1) {
      try {
        const device = await this.findDevice(path);
        if (!device.opened) {
          await this.connect(path, false);
        }
        const endpoints = this.deviceEndpoints.get(path);
        const endpointOut = endpoints?.endpointOut ?? this.endpointId;
        const transferBuffer = this.toArrayBuffer(
          packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength)
        );
        await device.transferOut(endpointOut, transferBuffer);
        return;
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryablePacketIoError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForPacketIoRetry(path, 'out', attempt, error);
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log.debug(
            `[WebUsbTransport] transferout reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
        }
      }
    }
    throw lastError;
  }

  private async transferInWithRetry(
    path: string,
    length: number,
    cancelToken?: TransferCancelToken
  ): Promise<DataView> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt += 1) {
      if (cancelToken?.cancelled) {
        throw new Error('transferIn cancelled');
      }
      try {
        const device = await this.findDevice(path);
        if (!device.opened) {
          await this.connect(path, false);
        }
        const endpoints = this.deviceEndpoints.get(path);
        const endpointIn = endpoints?.endpointIn ?? this.endpointId;
        const result = await device.transferIn(endpointIn, length);
        return this.getTransferInData(result);
      } catch (error) {
        lastError = error;
        if (cancelToken?.cancelled) {
          throw error;
        }
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryablePacketIoError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForPacketIoRetry(path, 'in', attempt, error);
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log.debug(
            `[WebUsbTransport] transferin reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
        }
      }
    }
    throw lastError;
  }

  private async resetConnectionAfterProbe(path: string) {
    this.protocolV2Assemblers.get(path)?.reset();

    try {
      const device = await this.findDevice(path);
      if (device.opened) {
        const endpoints = this.deviceEndpoints.get(path);
        const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
        try {
          await device.releaseInterface(ifaceNum);
        } catch (error) {
          this.Log.debug('[WebUsbTransport] releaseInterface after protocol probe error:', error);
        }
        await device.close();
      }
    } catch (error) {
      this.Log.debug('[WebUsbTransport] close after protocol probe error:', error);
    }

    await this.getConnectedDevices();
    await this.connect(path, false);
  }

  private async withProtocolReadTimeout<T>(
    path: string,
    promise: Promise<T>,
    timeoutMs: number,
    protocol: ProtocolType,
    onTimeout?: () => void
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const waitForeverAfterTimeout = () => new Promise<never>(() => {});
    const guardedPromise = promise.then(
      value => (timedOut ? waitForeverAfterTimeout() : value),
      error => {
        if (timedOut) {
          return waitForeverAfterTimeout();
        }
        throw error;
      }
    );
    try {
      return await Promise.race([
        guardedPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(async () => {
            timedOut = true;
            onTimeout?.();
            try {
              await this.resetConnectionAfterProbe(path);
            } catch (error) {
              this.Log.debug(
                `[WebUsbTransport] reset after Protocol ${protocol} timeout failed:`,
                error
              );
            } finally {
              reject(new Error(`Protocol ${protocol} read timeout after ${timeoutMs}ms`));
            }
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async probeProtocolV1(path: string) {
    if (!this.messages) {
      return false;
    }

    try {
      await this.callProtocolV1(path, 'Initialize', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT });
      return true;
    } catch (error) {
      this.Log.debug('[WebUsbTransport] Protocol V1 Initialize probe failed:', error);
      return false;
    }
  }

  private async probeProtocolV2(path: string) {
    if (!this.messages || !this.messagesV2) {
      return false;
    }

    return probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(path, name, data, options),
      timeoutMs: PROTOCOL_PROBE_TIMEOUT,
      logger: this.Log,
      logPrefix: 'ProtocolV2 WebUSB',
      onProbeFailed: () => this.resetConnectionAfterProbe(path),
    });
  }

  /**
   * Call device method — branches to Protocol V1 or Protocol V2 based on active probe.
   */
  async call(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (this.messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const device = await this.findDevice(path);
    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    const protocol = this.deviceProtocol.get(path) ?? 'V1';

    if (shouldSuppressWebUsbCallLog(name)) {
      // 高频文件写入不要逐包发 debug 事件，否则浏览器侧会被日志处理拖慢。
    } else if (shouldBlockWebUsbCallDataLog(name)) {
      this.Log.debug('call-', ' name: ', name, ' protocol: ', protocol);
    } else {
      this.Log.debug('call-', ' name: ', name, ' data: ', data, ' protocol: ', protocol);
    }

    if (protocol === 'V2') {
      return this.callProtocolV2(path, name, data, options);
    }

    return this.callProtocolV1(path, name, data, options);
  }

  private async callProtocolV1(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    const { messages } = this;
    if (!messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const encodeBuffers = ProtocolV1.encodeMessageChunks(messages, name, data);

    for (const buffer of encodeBuffers) {
      const newArray: Uint8Array = new Uint8Array(PACKET_SIZE);
      newArray[0] = REPORT_ID;
      newArray.set(new Uint8Array(buffer), 1);
      await this.transferOutWithRetry(path, newArray);
    }

    const resData = await this.receiveData(path, options?.timeoutMs);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decodeMessage(messages, resData);
    return check.call(jsonData);
  }

  /**
   * Send/receive a single call over Protocol V2 (0x5A framing).
   *
   * Encoding:  protobuf message → 2-byte LE messageTypeId + pb bytes → Protocol V2 frame
   * Decoding:  Protocol V2 frame → messageTypeId + pb bytes → protobuf message
   */
  private async callProtocolV2(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    const protocolV1Messages = this.messages;
    if (!this.messagesV2) {
      throw ERRORS.TypedError(
        HardwareErrorCode.TransportNotConfigured,
        'Protocol V2 schema not configured'
      );
    }
    if (!protocolV1Messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const session = new ProtocolV2Session({
      schemas: {
        protocolV1: protocolV1Messages,
        protocolV2: this.messagesV2,
      },
      router: PROTOCOL_V2_CHANNEL_USB,
      writeFrame: (frame: Uint8Array) => this.transferOutWithRetry(path, frame),
      readFrame: () => this.receiveProtocolV2Frame(path, options?.timeoutMs),
      logger: this.Log,
      logPrefix: 'ProtocolV2 WebUSB',
      createTimeoutError: (_messageName: string, timeoutMs: number) =>
        new Error(`Protocol V2 response timeout after ${timeoutMs}ms for ${name}`),
    });

    this.protocolV2Assemblers.get(path)?.reset();
    return session.call(name, data, options);
  }

  private async receiveProtocolV2Frame(path: string, timeoutMs?: number): Promise<Uint8Array> {
    let assembler = this.protocolV2Assemblers.get(path);
    if (!assembler) {
      assembler = new ProtocolV2FrameAssembler(PROTOCOL_V2_FRAME_MAX_BYTES);
      this.protocolV2Assemblers.set(path, assembler);
    }

    let frame: Uint8Array | undefined = assembler.push(new Uint8Array(0));
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;

    while (!frame) {
      const cancelToken = { cancelled: false };
      const transferIn = this.transferInWithRetry(path, PROTOCOL_V2_FRAME_MAX_BYTES, cancelToken);
      const dataView = deadline
        ? await this.withProtocolReadTimeout(
            path,
            transferIn,
            Math.max(deadline - Date.now(), 1),
            'V2',
            () => {
              cancelToken.cancelled = true;
            }
          )
        : await transferIn;
      const bytes = new Uint8Array(
        this.toArrayBuffer(
          dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength)
        )
      );
      try {
        frame = assembler.push(bytes);
      } catch (error) {
        throw ERRORS.TypedError(
          HardwareErrorCode.NetworkError,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    return frame;
  }

  /**
   * Receive data from device
   */
  async receiveData(path: string, timeoutMs?: number) {
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;
    const readPacket = async () => {
      const cancelToken = { cancelled: false };
      const transferIn = this.transferInWithRetry(path, PACKET_SIZE, cancelToken);
      return deadline
        ? this.withProtocolReadTimeout(
            path,
            transferIn,
            Math.max(deadline - Date.now(), 1),
            'V1',
            () => {
              cancelToken.cancelled = true;
            }
          )
        : transferIn;
    };

    const firstPacketData = await readPacket();
    const firstData = this.toArrayBuffer(firstPacketData.buffer.slice(1));
    const { length, typeId, restBuffer } = ProtocolV1.decodeFirstChunk(firstData);

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const lengthWithHeader = Number(length + HEADER_LENGTH);
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(length);
    if (length) {
      decoded.append(restBuffer);
    }

    while (decoded.offset < lengthWithHeader) {
      const packetData = await readPacket();
      const buffer = this.toArrayBuffer(packetData.buffer.slice(1));
      if (lengthWithHeader - decoded.offset >= PAYLOAD_SIZE) {
        decoded.append(buffer);
      } else {
        decoded.append(buffer.slice(0, lengthWithHeader - decoded.offset));
      }
    }
    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result as unknown as ArrayBuffer).toString('hex');
  }

  /**
   * Release device
   */
  async release(path: string) {
    const device: USBDevice = await this.findDevice(path);
    const endpoints = this.deviceEndpoints.get(path);
    const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
    await device.releaseInterface(ifaceNum);
    await device.close();
    this.deviceProtocol.delete(path);
    this.deviceProtocolHints.delete(path);
    this.protocolV2Assemblers.get(path)?.reset();
    this.protocolV2Assemblers.delete(path);
    this.deviceEndpoints.delete(path);
  }

  /**
   * Expose the detected protocol type for a given device path.
   * Used by upper layers (e.g. TransportManager) to select the correct schema.
   */
  getProtocolType(path: string): ProtocolType {
    return this.deviceProtocol.get(path) ?? 'V1';
  }
}
