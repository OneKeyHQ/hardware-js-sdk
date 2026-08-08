import { Buffer } from 'buffer';
import {
  type ConnectorDevice,
  HardwareErrorCode,
  createHwkError,
  isKnownNonTargetHardwareVendor,
} from '@onekeyfe/hwk-adapter-core';
import {
  TrezorConnectorBase,
  type TrezorConnectorBaseOptions,
  type TrezorConnectorByteTransport,
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import { TREZOR_USB_PACKET_SIZE } from './constants';
import {
  type TrezorWebUsbDescriptor,
  TrezorWebUsbTransport,
  type TrezorWebUsbTransportOptions,
} from './TrezorWebUsbTransport';

export interface TrezorWebUsbConnectorOptions {
  /** Pre-built transport (optional). If omitted, one is created lazily on first use. */
  transport?: TrezorWebUsbTransport;
  /** Options forwarded to a lazily-created transport. Ignored if `transport` is supplied. */
  transportOptions?: TrezorWebUsbTransportOptions;
  thp?: TrezorConnectorBaseOptions['thp'];
  deviceSessionFactory?: TrezorConnectorBaseOptions['deviceSessionFactory'];
}

const productLabel = (descriptor: TrezorWebUsbDescriptor): string => {
  if (descriptor.isBootloader) return 'Trezor (bootloader)';
  return descriptor.productName ?? 'Trezor';
};

export class TrezorWebUsbConnector extends TrezorConnectorBase {
  private _transport: TrezorWebUsbTransport | undefined;

  private readonly _transportOptions?: TrezorWebUsbTransportOptions;

  private readonly _logger?: TrezorDebugLogger;

  constructor(options?: TrezorWebUsbConnectorOptions) {
    super({
      connectionType: 'usb',
      chunkSize: TREZOR_USB_PACKET_SIZE,
      thp: options?.thp,
      deviceSessionFactory: options?.deviceSessionFactory,
    });
    this._transport = options?.transport;
    this._transportOptions = options?.transportOptions;
    this._logger = options?.transportOptions?.logger;
  }

  /**
   * Trigger the browser's WebUSB permission picker. Must be called from a
   * user-gesture event handler. Returns the chosen device's descriptor; the
   * connector remembers it so subsequent searchDevices() picks it up.
   */
  async requestDevice(): Promise<ConnectorDevice> {
    const transport = this._ensureTransport();
    const descriptor = await transport.requestDevice();
    rejectKnownNonTrezorDevice(descriptor);
    return descriptorToConnectorDevice(descriptor);
  }

  protected async enumerateDevices(): Promise<ConnectorDevice[]> {
    const transport = this._ensureTransport();
    const descriptors = await transport.scan();
    const filtered = descriptors.filter(
      descriptor => !isKnownNonTargetHardwareVendor(descriptor, 'trezor')
    );
    if (filtered.length !== descriptors.length) {
      this._log('info', 'webusb.connector.enumerate.filtered', {
        transport: 'webusb',
        descriptorCount: descriptors.length,
        filteredCount: filtered.length,
        dropped: descriptors
          .filter(descriptor => isKnownNonTargetHardwareVendor(descriptor, 'trezor'))
          .map(toWebUsbFilterLogSample),
        kept: filtered.map(toWebUsbFilterLogSample),
      });
    }
    return filtered.map(descriptorToConnectorDevice);
  }

  protected async createByteTransport(
    device: ConnectorDevice
  ): Promise<TrezorConnectorByteTransport> {
    const transport = this._ensureTransport();
    await transport.connect(device.connectId);

    return {
      write: async (chunk: Buffer, signal?: AbortSignal) => {
        await transport.write(device.connectId, Uint8Array.from(chunk), signal);
      },
      read: async (signal?: AbortSignal) => {
        const data = await transport.read(device.connectId, signal);
        return Buffer.from(data);
      },
      reconnect: async () => {
        await transport.disconnect(device.connectId);
        await transport.connect(device.connectId);
      },
      close: () => transport.disconnect(device.connectId),
      onDisconnect: (handler: () => void) => transport.onDisconnect(device.connectId, handler),
    };
  }

  reset(): void {
    super.reset();
    this._transport?.reset();
    this._transport = undefined;
  }

  private _ensureTransport(): TrezorWebUsbTransport {
    if (!this._transport) {
      this._transport = new TrezorWebUsbTransport(this._transportOptions);
    }
    return this._transport;
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-webusb', event, data });
    if (!entry) return;

    try {
      this._logger?.(entry);
    } catch {
      // Debug logging must not affect WebUSB connector behavior.
    }
  }
}

function toWebUsbFilterLogSample(descriptor: TrezorWebUsbDescriptor): Record<string, unknown> {
  return {
    connectId: descriptor.connectId,
    serialNumber: descriptor.serialNumber,
    vendorId: descriptor.vendorId,
    productId: descriptor.productId,
    productName: descriptor.productName,
    manufacturerName: descriptor.manufacturerName,
    isBootloader: descriptor.isBootloader,
    usbVersionMajor: descriptor.usbVersionMajor,
    usbVersionMinor: descriptor.usbVersionMinor,
    usbVersionSubminor: descriptor.usbVersionSubminor,
    deviceClass: descriptor.deviceClass,
    deviceSubclass: descriptor.deviceSubclass,
    deviceProtocol: descriptor.deviceProtocol,
    deviceVersionMajor: descriptor.deviceVersionMajor,
    deviceVersionMinor: descriptor.deviceVersionMinor,
    deviceVersionSubminor: descriptor.deviceVersionSubminor,
    opened: descriptor.opened,
    raw: descriptor.raw,
    matchesTrezorUsbFilter: !isKnownNonTargetHardwareVendor(descriptor, 'trezor'),
  };
}

function rejectKnownNonTrezorDevice(descriptor: TrezorWebUsbDescriptor): void {
  if (!isKnownNonTargetHardwareVendor(descriptor, 'trezor')) return;
  throw createHwkError({
    code: HardwareErrorCode.DeviceMismatch,
    message: 'Selected device is not a supported Trezor device.',
    params: {
      vendorId: descriptor.vendorId,
      productId: descriptor.productId,
      productName: descriptor.productName,
      manufacturerName: descriptor.manufacturerName,
    },
  });
}

function descriptorToConnectorDevice(descriptor: TrezorWebUsbDescriptor): ConnectorDevice {
  // The full WebUSB descriptor goes into `raw` so the app layer (search-
  // devices UI / DB / debug logs) can see everything the host kernel
  // exposed. Promote any field we consume by name onto the typed surface.
  return {
    connectId: descriptor.connectId,
    deviceId: descriptor.serialNumber ?? descriptor.connectId,
    name: productLabel(descriptor),
    model: 'unknown',
    serialNumber: descriptor.serialNumber,
    capabilities: { persistentDeviceIdentity: !!descriptor.serialNumber },
    raw: {
      transport: 'webusb',
      descriptor,
    },
  };
}

export function createTrezorWebUsbConnector(
  options?: TrezorWebUsbConnectorOptions
): TrezorWebUsbConnector {
  return new TrezorWebUsbConnector(options);
}
