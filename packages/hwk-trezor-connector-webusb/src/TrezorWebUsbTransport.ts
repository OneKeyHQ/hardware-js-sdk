import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import {
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import {
  TREZOR_USB_CONFIGURATION_ID,
  TREZOR_USB_ENDPOINT_ID,
  TREZOR_USB_INTERFACE_ID,
  TREZOR_USB_PACKET_SIZE,
  TREZOR_WEBUSB_BOOTLOADER_PRODUCT,
  TREZOR_WEBUSB_FILTERS,
  TREZOR_WEBUSB_FIRMWARE_PRODUCT,
  TREZOR_WEBUSB_VENDOR_ID,
} from './constants';

/**
 * Descriptor returned by scan(). Lightweight — the actual USBDevice is held
 * internally until connect() is called.
 */
export interface TrezorWebUsbDescriptor {
  /** Stable id used as connectId. Prefers serialNumber; falls back to a synthesized id. */
  connectId: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  isBootloader: boolean;

  /** USB spec version this device implements (Window USBDevice fields). */
  usbVersionMajor?: number;
  usbVersionMinor?: number;
  usbVersionSubminor?: number;

  /** Device-class triple from the USB descriptor. */
  deviceClass?: number;
  deviceSubclass?: number;
  deviceProtocol?: number;

  /** Firmware-reported device version (DIFFERENT from THP-handshake firmware version). */
  deviceVersionMajor?: number;
  deviceVersionMinor?: number;
  deviceVersionSubminor?: number;

  /** Whether the host has previously opened this device handle. */
  opened?: boolean;

  /**
   * Catch-all blob for fields we haven't promoted to the typed surface yet.
   * Currently includes:
   *   - configurations: minimal summary of USBConfiguration[] (number + alt count)
   * Treat as informational only — anything actually used should be promoted
   * to a typed field above.
   */
  raw?: Record<string, unknown>;
}

export interface TrezorWebUsbTransportOptions {
  /** Override navigator.usb (mainly for tests). */
  usb?: USB;
  logger?: TrezorDebugLogger;
}

const disconnectError = (message: string): Error =>
  createHwkError({ code: HardwareErrorCode.DeviceDisconnected, message });

const transportError = (message: string): Error =>
  createHwkError({ code: HardwareErrorCode.TransportError, message });

const isStandardHwkError = (error: unknown): error is Error & { code: number } =>
  error instanceof Error && typeof (error as { code?: unknown })?.code === 'number';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const webUsbRequestDeviceError = (error: unknown): Error => {
  if (isStandardHwkError(error)) return error;
  const name = (error as { name?: unknown })?.name;
  const message = errorMessage(error);
  if (name === 'NotFoundError') {
    return createHwkError({
      code: HardwareErrorCode.UserAborted,
      message,
    });
  }
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return createHwkError({
      code: HardwareErrorCode.DevicePermissionDenied,
      message,
    });
  }
  return transportError(message);
};

const webUsbRuntimeError = (error: unknown): Error => {
  if (isStandardHwkError(error)) return error;
  const name = (error as { name?: unknown })?.name;
  const message = errorMessage(error);
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return createHwkError({
      code: HardwareErrorCode.DevicePermissionDenied,
      message,
    });
  }
  if (name === 'NotFoundError' || name === 'NetworkError') {
    return disconnectError(message);
  }
  return transportError(message);
};

const notConnectedError = (connectId: string): Error =>
  disconnectError(`Trezor WebUSB device is not connected: ${connectId}`);

const resolveConnectId = (device: USBDevice, index: number): string => {
  if (device.serialNumber && device.serialNumber.length > 0) return device.serialNumber;
  return `trezor-webusb-${device.vendorId.toString(16)}-${device.productId.toString(16)}-${index}`;
};

const isTrezorDevice = (device: USBDevice): boolean =>
  device.vendorId === TREZOR_WEBUSB_VENDOR_ID &&
  (device.productId === TREZOR_WEBUSB_FIRMWARE_PRODUCT ||
    device.productId === TREZOR_WEBUSB_BOOTLOADER_PRODUCT);

/**
 * Thin wrapper around `navigator.usb` providing the same scan/connect/read/
 * write/onDisconnect surface that TrezorRnBleConnector's transport exposes,
 * so TrezorWebUsbConnector can be a one-page subclass of TrezorConnectorBase.
 *
 * NOT responsible for the WebUSB permission prompt — that needs a user
 * gesture, which callers must trigger themselves via `requestDevice()`.
 */
export class TrezorWebUsbTransport {
  private readonly _usb: USB;

  private readonly _logger?: NonNullable<TrezorWebUsbTransportOptions['logger']>;

  private readonly _connected = new Map<string, USBDevice>();

  private readonly _disconnectHandlers = new Map<string, Set<() => void>>();

  private readonly _globalDisconnectListener: (event: USBConnectionEvent) => void;

  constructor(options: TrezorWebUsbTransportOptions = {}) {
    if (!options.usb && typeof navigator === 'undefined') {
      throw createHwkError({
        code: HardwareErrorCode.TransportNotAvailable,
        message:
          'TrezorWebUsbTransport: navigator.usb is not available — pass `usb` explicitly or run in a WebUSB-capable environment',
      });
    }
    this._usb = options.usb ?? navigator.usb;
    this._logger = options.logger;

    this._globalDisconnectListener = (event: USBConnectionEvent) => {
      this._handlePhysicalDisconnect(event.device);
    };
    this._usb.addEventListener?.('disconnect', this._globalDisconnectListener);
  }

  /**
   * Trigger the browser's WebUSB permission picker. Must be called from a
   * user gesture (click handler). Adds the picked device to the
   * authorized list so subsequent scan() calls include it.
   */
  async requestDevice(): Promise<TrezorWebUsbDescriptor> {
    const startedAt = Date.now();
    this._log('info', 'webusb.requestDevice.start', {
      filters: TREZOR_WEBUSB_FILTERS,
    });
    try {
      const device = await this._usb.requestDevice({ filters: TREZOR_WEBUSB_FILTERS });
      // Index within the filtered (Trezor-only) list so the synthesized connectId
      // for serial-less devices matches scan()/connect() (which also filter).
      const trezorDevices = (await this._usb.getDevices()).filter(isTrezorDevice);
      const index = trezorDevices.indexOf(device);
      const descriptor = this._toDescriptor(device, index >= 0 ? index : 0);
      this._log('info', 'webusb.requestDevice.done', {
        durationMs: Date.now() - startedAt,
        descriptor,
      });
      return descriptor;
    } catch (error) {
      this._log('warn', 'webusb.requestDevice.error', {
        durationMs: Date.now() - startedAt,
        error: String(error),
      });
      throw webUsbRequestDeviceError(error);
    }
  }

  /** List previously-authorized Trezor devices (no permission prompt). */
  async scan(): Promise<TrezorWebUsbDescriptor[]> {
    const startedAt = Date.now();
    const devices = await this._usb.getDevices();
    const trezorDevices = devices.filter(isTrezorDevice);
    if (trezorDevices.length !== devices.length) {
      this._log('info', 'webusb.scan.filtered', {
        transport: 'webusb',
        durationMs: Date.now() - startedAt,
        rawCount: devices.length,
        trezorVidPidCount: trezorDevices.length,
        dropped: devices
          .map((device, index) => ({
            ...this._summarizeDevice(device, index),
            matchesTrezorVidPidFilter: isTrezorDevice(device),
          }))
          .filter(device => !device.matchesTrezorVidPidFilter),
        kept: trezorDevices.map((device, index) => ({
          ...this._summarizeDevice(device, index),
          matchesTrezorVidPidFilter: true,
        })),
      });
    }
    return trezorDevices.map((device, index) => this._toDescriptor(device, index));
  }

  async connect(connectId: string): Promise<USBDevice> {
    const existing = this._connected.get(connectId);
    if (existing) {
      return existing;
    }

    const trezorDevices = (await this._usb.getDevices()).filter(isTrezorDevice);
    const device = trezorDevices.find((d, index) => resolveConnectId(d, index) === connectId);
    if (!device) {
      throw Object.assign(new Error(`Trezor WebUSB device not found: ${connectId}`), {
        code: HardwareErrorCode.DeviceNotFound,
      });
    }

    const wasOpened = device.opened;
    if (!device.opened) {
      try {
        await device.open();
      } catch (error) {
        this._log('error', 'webusb.connect.open.error', {
          connectId,
          error: String(error),
        });
        throw webUsbRuntimeError(error);
      }
    }
    if (device.configuration?.configurationValue !== TREZOR_USB_CONFIGURATION_ID) {
      try {
        await device.selectConfiguration(TREZOR_USB_CONFIGURATION_ID);
      } catch (error) {
        this._log('error', 'webusb.connect.selectConfiguration.error', {
          connectId,
          configurationId: TREZOR_USB_CONFIGURATION_ID,
          error: String(error),
        });
        if (!wasOpened) await this._safeReleaseAndClose(connectId, device);
        throw webUsbRuntimeError(error);
      }
    }
    // No device.reset() anywhere (open → selectConfiguration → claimInterface):
    // on macOS device.reset() re-enumerates the device and orphans this handle,
    // so every later transfer hangs.
    if (!this._isInterfaceClaimed(device, TREZOR_USB_INTERFACE_ID)) {
      try {
        await device.claimInterface(TREZOR_USB_INTERFACE_ID);
      } catch (error) {
        this._log('error', 'webusb.connect.claimInterface.error', {
          connectId,
          interfaceId: TREZOR_USB_INTERFACE_ID,
          error: String(error),
        });
        if (!wasOpened) await this._safeReleaseAndClose(connectId, device);
        throw webUsbRuntimeError(error);
      }
    }

    this._connected.set(connectId, device);
    return device;
  }

  async disconnect(connectId: string): Promise<void> {
    const device = this._connected.get(connectId);
    this._connected.delete(connectId);
    if (!device) return;
    // No device.reset() before close: on WebUSB (Chromium/macOS) reset
    // re-enumerates the device and orphans the handle, wedging a THP device
    // (Safe 7) so the next connect's first transferOut hangs. Suite resets here
    // but over node-usb (a clean libusb port reset). releaseInterface + close
    // is the clean WebUSB teardown.
    if (device.opened && this._isInterfaceClaimed(device, TREZOR_USB_INTERFACE_ID)) {
      try {
        await device.releaseInterface(TREZOR_USB_INTERFACE_ID);
      } catch (error) {
        this._log('warn', 'webusb.disconnect.releaseInterface.error', {
          connectId,
          error: String(error),
        });
      }
    }
    try {
      if (device.opened) {
        await device.close();
      }
    } catch (error) {
      this._log('warn', 'webusb.disconnect.close.error', { connectId, error: String(error) });
    }
  }

  async write(connectId: string, data: Uint8Array, signal?: AbortSignal): Promise<void> {
    const device = this._ensureConnected(connectId);
    for (let offset = 0; offset < data.length; offset += TREZOR_USB_PACKET_SIZE) {
      const chunk = data.slice(offset, offset + TREZOR_USB_PACKET_SIZE);
      // Trezor expects fixed 64-byte frames; pad with zeros if the last chunk is short.
      const frame =
        chunk.length === TREZOR_USB_PACKET_SIZE
          ? chunk
          : (() => {
              const padded = new Uint8Array(TREZOR_USB_PACKET_SIZE);
              padded.set(chunk);
              return padded;
            })();
      // No mid-write device.reset() watchdog: resetting wedges a THP device
      // (Safe 7). Let the transfer complete or be cancelled by abort only.
      try {
        const result = await this._abortableTransfer({
          signal,
          transfer: () => device.transferOut(TREZOR_USB_ENDPOINT_ID, frame),
        });
        if (result.status !== 'ok') {
          throw transportError(`Trezor WebUSB transferOut failed: ${result.status}`);
        }
      } catch (error) {
        throw webUsbRuntimeError(error);
      }
    }
  }

  async read(connectId: string, signal?: AbortSignal): Promise<Uint8Array> {
    const device = this._ensureConnected(connectId);
    let result: USBInTransferResult;
    try {
      result = await this._abortableTransfer({
        signal,
        transfer: () => device.transferIn(TREZOR_USB_ENDPOINT_ID, TREZOR_USB_PACKET_SIZE),
      });
      if (result.status !== 'ok') {
        throw transportError(`Trezor WebUSB transferIn failed: ${result.status}`);
      }
      if (!result.data) {
        throw transportError('Trezor WebUSB transferIn returned no data');
      }
    } catch (error) {
      throw webUsbRuntimeError(error);
    }
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }

  onDisconnect(connectId: string, handler: () => void): () => void {
    const handlers = this._disconnectHandlers.get(connectId) ?? new Set<() => void>();
    handlers.add(handler);
    this._disconnectHandlers.set(connectId, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._disconnectHandlers.delete(connectId);
      }
    };
  }

  reset(): void {
    this._usb.removeEventListener?.('disconnect', this._globalDisconnectListener);
    // Release/close still-open devices so we don't leak USB handles / leave
    // interface 0 claimed (e.g. dispose() while connected); disconnect() runs
    // the full release+close and removes from _connected synchronously.
    for (const connectId of [...this._connected.keys()]) {
      void this.disconnect(connectId).catch(() => undefined);
    }
    this._connected.clear();
    this._disconnectHandlers.clear();
  }

  private _ensureConnected(connectId: string): USBDevice {
    const device = this._connected.get(connectId);
    if (!device) throw notConnectedError(connectId);
    return device;
  }

  // Release+close a device we opened but never registered in `_connected`
  // (e.g. connect() failing after open()), which disconnect() can't clean up.
  private async _safeReleaseAndClose(connectId: string, device: USBDevice): Promise<void> {
    try {
      if (device.opened && this._isInterfaceClaimed(device, TREZOR_USB_INTERFACE_ID)) {
        await device.releaseInterface(TREZOR_USB_INTERFACE_ID);
      }
    } catch (error) {
      this._log('warn', 'webusb.connect.cleanup.releaseInterface.error', {
        connectId,
        error: String(error),
      });
    }
    try {
      if (device.opened) await device.close();
    } catch (error) {
      this._log('warn', 'webusb.connect.cleanup.close.error', { connectId, error: String(error) });
    }
  }

  private _toDescriptor(device: USBDevice, index: number): TrezorWebUsbDescriptor {
    // Summarize USBConfiguration[] without dragging in DataView refs etc.
    // The full live USBDevice is held internally — this is only the
    // serializable shadow the connector / UI sees.
    const configurations = device.configurations?.map(config => ({
      configurationValue: config.configurationValue,
      configurationName: config.configurationName,
      interfaceCount: config.interfaces?.length ?? 0,
    }));
    return {
      connectId: resolveConnectId(device, index),
      serialNumber: device.serialNumber || undefined,
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName || undefined,
      manufacturerName: device.manufacturerName || undefined,
      isBootloader: device.productId === TREZOR_WEBUSB_BOOTLOADER_PRODUCT,
      usbVersionMajor: device.usbVersionMajor,
      usbVersionMinor: device.usbVersionMinor,
      usbVersionSubminor: device.usbVersionSubminor,
      deviceClass: device.deviceClass,
      deviceSubclass: device.deviceSubclass,
      deviceProtocol: device.deviceProtocol,
      deviceVersionMajor: device.deviceVersionMajor,
      deviceVersionMinor: device.deviceVersionMinor,
      deviceVersionSubminor: device.deviceVersionSubminor,
      opened: device.opened,
      raw: {
        configurations,
      },
    };
  }

  private async _abortableTransfer<T>({
    signal,
    transfer,
  }: {
    signal?: AbortSignal;
    transfer: () => Promise<T>;
  }): Promise<T> {
    if (!signal) return transfer();
    if (signal.aborted) throw this._abortReason(signal);

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        fn();
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        // No device.reset() on abort: WebUSB has no per-transfer cancel, and
        // resetting wedges a THP device (Safe 7). Reject and let the stale
        // transfer settle in the background.
        reject(this._abortReason(signal));
      };

      signal.addEventListener('abort', onAbort);
      transfer().then(
        value => finish(() => resolve(value)),
        error => finish(() => reject(error))
      );
    });
  }

  private _abortReason(signal: AbortSignal): Error {
    if (isStandardHwkError(signal.reason)) return signal.reason;
    const message =
      signal.reason instanceof Error
        ? signal.reason.message
        : String(signal.reason || 'Aborted by signal');
    return createHwkError({
      code: HardwareErrorCode.UserAborted,
      message,
    });
  }

  private _isInterfaceClaimed(device: USBDevice, interfaceId: number): boolean {
    return Boolean(
      device.configuration?.interfaces?.find(item => item.interfaceNumber === interfaceId)?.claimed
    );
  }

  private _summarizeDevice(device: USBDevice, index?: number): Record<string, unknown> {
    const interfaces = device.configuration?.interfaces?.map(item => ({
      interfaceNumber: item.interfaceNumber,
      claimed: item.claimed,
      alternateCount: item.alternates?.length ?? 0,
      endpoints: item.alternate?.endpoints?.map(ep => ({
        endpointNumber: ep.endpointNumber,
        direction: ep.direction,
        type: ep.type,
        packetSize: ep.packetSize,
      })),
    }));
    return {
      index,
      connectId: typeof index === 'number' ? resolveConnectId(device, index) : undefined,
      opened: device.opened,
      vendorId: device.vendorId,
      productId: device.productId,
      serial: device.serialNumber,
      productName: device.productName,
      manufacturerName: device.manufacturerName,
      configurationValue: device.configuration?.configurationValue,
      interfaces,
    };
  }

  private _handlePhysicalDisconnect(device: USBDevice): void {
    // Find which connectId this corresponds to.
    for (const [connectId, connected] of this._connected) {
      if (connected === device) {
        this._connected.delete(connectId);
        this._log('warn', 'webusb.disconnect.event', { connectId });
        this._disconnectHandlers.get(connectId)?.forEach(handler => {
          try {
            handler();
          } catch (error) {
            this._log('error', 'webusb.disconnect.handler.threw', {
              connectId,
              error: String(error),
            });
          }
        });
        return;
      }
    }
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-webusb', event, data });
    if (!entry) return;

    this._logger?.(entry);
  }
}

export async function createTrezorWebUsbTransport(
  options?: TrezorWebUsbTransportOptions
): Promise<TrezorWebUsbTransport> {
  return new TrezorWebUsbTransport(options);
}
