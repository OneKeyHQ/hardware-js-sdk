/* eslint-disable no-undef */
import transport, {
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V1_REPORT_ID,
  PROTOCOL_V1_USB_PACKET_SIZE,
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2LinkError,
  ProtocolV2UsbTransportBase,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  ONEKEY_WEBUSB_FILTER,
  isKnownTrezorWebUsbDevice,
  wait,
} from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';

import { createTransportCallLog, shouldSuppressHighVolumeCallLog } from './transportLog';

import type {
  AcquireInput,
  OneKeyDeviceInfoBase,
  ProtocolType,
  ProtocolV2CallContext,
  ProtocolV2Schemas,
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
// Legacy devices can take longer to answer Initialize after a WebUSB reset.
// Keep this aligned with Node USB so a slow Protocol V1 response is not
// misreported as a protocol mismatch during acquire.
const PROTOCOL_V1_PROBE_TIMEOUT = 5000;
const PROTOCOL_V2_PROBE_TIMEOUT = 1000;
const EXPECTED_PROTOCOL_V2_PROBE_ATTEMPTS = 2;
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

export default class WebUsbTransport extends ProtocolV2UsbTransportBase<string> {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protobuf schema for Protocol V2 transports. */
  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  private protocolV2SchemaSource: string | undefined;

  /** Per-path protocol type detected by active wire-level probe. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

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

  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 WebUSB',
    });
  }

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
    const schemaSource =
      typeof signedData === 'string'
        ? signedData
        : JSON.stringify(signedData) ?? String(signedData);
    if (schemaSource === this.protocolV2SchemaSource) return;

    const hadProtocolV2Schema = this.protocolV2SchemaSource !== undefined;
    this.messagesV2 = parseConfigure(signedData);
    this.protocolV2SchemaSource = schemaSource;
    if (!hadProtocolV2Schema) return;

    this.invalidateAllProtocolV2UsbLinks('Protocol V2 schema reconfigured').catch(error =>
      this.Log?.debug('[WebUsbTransport] schema link cleanup failed:', error)
    );
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
        (desc: { vendorId: number; productId: number }) =>
          dev.vendorId === desc.vendorId && dev.productId === desc.productId
      );
      const hasSerialNumber = typeof dev.serialNumber === 'string' && dev.serialNumber.length > 0;
      return isOneKey && hasSerialNumber && !isKnownTrezorWebUsbDevice(dev);
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

    return this.deviceList;
  }

  /**
   * Acquire device control
   */
  async acquire(input: AcquireInput) {
    if (!input.path) return;
    try {
      await this.rotateProtocolV2UsbGeneration(input.path, 'WebUSB transport acquired');
      await this.closeOpenDevice(input.path);
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
      await this.closeOpenDevice(input.path);
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

  private createProtocolProbeTimeoutError(expected: ProtocolType, attempts: number) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol ${expected} probe timeout after ${attempts} attempts`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Unable to detect USB protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
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
        return 'V1';
      }
      await this.closeConnectionAfterProbe(path);
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      for (let attempt = 1; attempt <= EXPECTED_PROTOCOL_V2_PROBE_ATTEMPTS; attempt += 1) {
        if (await this.probeProtocolV2(path)) {
          this.deviceProtocol.set(path, 'V2');
          return 'V2';
        }
        if (attempt < EXPECTED_PROTOCOL_V2_PROBE_ATTEMPTS) {
          await this.resetConnectionAfterProbe(path);
          this.Log?.debug(
            `[WebUsbTransport] Protocol V2 probe timed out, retrying ${
              attempt + 1
            }/${EXPECTED_PROTOCOL_V2_PROBE_ATTEMPTS}`
          );
        } else {
          await this.closeConnectionAfterProbe(path);
        }
      }
      this.deviceProtocol.delete(path);
      throw this.createProtocolProbeTimeoutError(
        expectedProtocol,
        EXPECTED_PROTOCOL_V2_PROBE_ATTEMPTS
      );
    }

    // Protocol must be actively probed after connection. Name, PID, and descriptors only
    // influence probe order; a V2 hint probes V2 first and falls back to V1.
    const probeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(path) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];

    for (const [index, protocol] of probeOrder.entries()) {
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(path) : await this.probeProtocolV2(path);
      if (detected) {
        this.deviceProtocol.set(path, protocol);
        return protocol;
      }
      if (index < probeOrder.length - 1) {
        // A timed-out WebUSB transferIn cannot be cancelled in place. Closing and
        // reopening the device guarantees the next protocol probe cannot consume a
        // late response from the previous protocol generation.
        await this.resetConnectionAfterProbe(path);
      } else {
        await this.closeConnectionAfterProbe(path);
      }
    }

    this.deviceProtocol.delete(path);
    throw this.createProtocolDetectionError();
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
    let device: USBDevice = await this.findDevice(path);
    if (!device.opened) {
      await device.open();
    }
    try {
      await device.reset();
    } catch (error) {
      this.Log?.debug('[WebUsbTransport] reset before claim failed, continuing:', error);
    }
    await this.getConnectedDevices();
    device = await this.findDevice(path);
    if (!device.opened) {
      await device.open();
    }

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
    await device.claimInterface(endpoints.interfaceNumber);
    await this.clearEndpointHalt(device, 'in', endpoints.endpointIn);
    await this.clearEndpointHalt(device, 'out', endpoints.endpointOut);
  }

  private async closeOpenDevice(path: string) {
    const current = this.deviceList.find(device => device.path === path)?.device;
    if (!current?.opened) return;

    const endpoints = this.deviceEndpoints.get(path);
    const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
    try {
      await current.releaseInterface(ifaceNum);
    } catch (error) {
      this.Log?.debug('[WebUsbTransport] releaseInterface before reconnect failed:', error);
    }
    try {
      await current.close();
    } catch (error) {
      this.Log?.debug('[WebUsbTransport] close before reconnect failed:', error);
    }
  }

  private async clearEndpointHalt(
    device: USBDevice,
    direction: USBDirection,
    endpointNumber: number
  ) {
    try {
      await device.clearHalt(direction, endpointNumber);
    } catch (error) {
      this.Log?.debug(
        `[WebUsbTransport] clearHalt ${direction} endpoint ${endpointNumber} failed, continuing:`,
        error
      );
    }
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
        await this.transferOutOnce(path, packet);
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

  private async transferOutOnce(path: string, packet: Uint8Array) {
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

  private async transferInOnce(path: string, length: number): Promise<DataView> {
    const device = await this.findDevice(path);
    if (!device.opened) {
      throw new Error('USBDevice is not open for transferIn');
    }
    const endpoints = this.deviceEndpoints.get(path);
    const endpointIn = endpoints?.endpointIn ?? this.endpointId;
    const result = await device.transferIn(endpointIn, length);
    return this.getTransferInData(result);
  }

  private async closeConnectionAfterProbe(path: string) {
    await this.rotateProtocolV2UsbGeneration(path, 'WebUSB protocol probe reset');
    await this.closeOpenDevice(path);
  }

  private async resetConnectionAfterProbe(path: string) {
    await this.closeConnectionAfterProbe(path);
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
            if (protocol === 'V1') {
              try {
                await this.resetConnectionAfterProbe(path);
              } catch (error) {
                this.Log.debug('[WebUsbTransport] reset after Protocol V1 timeout failed:', error);
              }
            }
            reject(new Error(`Protocol ${protocol} read timeout after ${timeoutMs}ms`));
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
      await this.callProtocolV1(
        path,
        'Initialize',
        {},
        {
          timeoutMs: PROTOCOL_V1_PROBE_TIMEOUT,
        }
      );
      return true;
    } catch (_error) {
      return false;
    }
  }

  private async probeProtocolV2(path: string) {
    if (!this.messages || !this.messagesV2) {
      return false;
    }

    return probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(path, name, data, options),
      timeoutMs: PROTOCOL_V2_PROBE_TIMEOUT,
      logger: this.Log,
      logPrefix: 'ProtocolV2 WebUSB',
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

    const protocol = this.deviceProtocol.get(path);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${path}`
      );
    }

    if (!shouldSuppressHighVolumeCallLog(name)) {
      this.Log.debug('transport call', createTransportCallLog(name, protocol));
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
    return this.callProtocolV2Usb(path, name, data, options);
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
    await this.invalidateProtocolV2UsbLink(path, 'WebUSB transport released');
    await this.closeOpenDevice(path);
    this.deviceProtocol.delete(path);
    this.deviceProtocolHints.delete(path);
    this.deviceEndpoints.delete(path);
  }

  protected getProtocolV2UsbSchemas(): ProtocolV2Schemas {
    if (!this.messages || !this.messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    return {
      protocolV1: this.messages,
      protocolV2: this.messagesV2,
    };
  }

  protected getProtocolV2UsbLogger() {
    return this.Log;
  }

  protected async writeProtocolV2UsbPacket(
    path: string,
    frame: Uint8Array,
    _context: ProtocolV2CallContext
  ): Promise<void> {
    await this.transferOutOnce(path, frame);
  }

  protected async readProtocolV2UsbPacket(
    path: string,
    _context: ProtocolV2CallContext
  ): Promise<Uint8Array> {
    const dataView = await this.transferInOnce(path, PROTOCOL_V2_FRAME_MAX_BYTES);
    return new Uint8Array(
      this.toArrayBuffer(
        dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength)
      )
    );
  }

  protected async resetProtocolV2UsbNativeLink(path: string, _reason: string): Promise<void> {
    await this.closeOpenDevice(path);
  }

  protected onProtocolV2UsbLinkInvalidated(path: string, reason: string) {
    this.deviceProtocol.delete(path);
    this.Log?.debug(`[WebUsbTransport] Protocol V2 link invalidated: ${path}`, reason);
  }

  protected createProtocolV2UsbTimeoutError(name: string, timeoutMs: number): Error {
    return new ProtocolV2LinkError(
      'response-timeout',
      `Protocol V2 response timeout after ${timeoutMs}ms for ${name}`
    );
  }

  /**
   * Expose the detected protocol type for a given device path.
   * Used by upper layers (e.g. TransportManager) to select the correct schema.
   */
  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }
}
