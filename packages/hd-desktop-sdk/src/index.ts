import { EventEmitter } from 'events';
import {
  Transport,
  OneKeyDeviceInfo,
  AcquireInput,
  MessageFromOneKey,
} from '@onekeyfe/hd-transport';
import HttpTransport from '@onekeyfe/hd-transport-http';
import { DesktopBleTransport } from '@onekeyfe/hd-transport-desktop-ble';
import { TransportType, DeviceTransportConfig } from './types';
import { TransportError, TransportErrorCode, TransportRecovery } from './errors';

export class DesktopTransportManager implements Transport {
  private usbTransport: HttpTransport;

  private bleTransport: DesktopBleTransport;

  private activeTransport: HttpTransport | DesktopBleTransport;

  private transportConfigs: Map<string, DeviceTransportConfig> = new Map();

  private logger?: Console;

  private emitter?: EventEmitter;

  private recovery: TransportRecovery;

  // Required by Transport interface
  public configured = false;

  public readonly version = '1.0.0';

  public readonly name = 'DesktopTransportManager';

  public readonly activeName = 'DesktopTransportManager';

  public readonly requestNeeded = false;

  public readonly isOutdated = false;

  private logDebug(message: string, ...args: any[]): void {
    if (this.logger) {
      this.logger.debug(`[DesktopTransport] ${message}`, ...args);
    }
  }

  private logError(message: string, error?: Error): void {
    if (this.logger) {
      this.logger.error(`[DesktopTransport] ${message}`, error);
    }
  }

  constructor() {
    this.usbTransport = new HttpTransport();
    this.bleTransport = new DesktopBleTransport();
    this.activeTransport = this.usbTransport; // Default to USB
    this.recovery = new TransportRecovery(this);
  }

  // Transport interface properties initialized in constructor

  private async getTransportForDevice(
    deviceId: string
  ): Promise<HttpTransport | DesktopBleTransport> {
    await Promise.resolve(); // Ensure async context
    const config = this.transportConfigs.get(deviceId);
    if (!config) {
      throw new TransportError(
        'Device not found',
        'usb', // Default to USB when device type is unknown
        false,
        deviceId,
        TransportErrorCode.DeviceNotFound
      );
    }
    return config.type === 'ble' ? this.bleTransport : this.usbTransport;
  }

  async init(logger?: any, emitter?: EventEmitter): Promise<string> {
    this.logger = logger;
    this.emitter = emitter;

    try {
      // Initialize both transports with logger
      await Promise.all([this.usbTransport.init(logger), this.bleTransport.init(logger)]);

      // Set up event listeners if emitter is provided
      if (this.emitter) {
        this.emitter.on('transport-error', async (error: TransportError) => {
          if (error.recoverable) {
            await this.recovery.recover(error);
          }
        });

        // Forward device events
        this.emitter.on('device-found', device => {
          this.logDebug('Device found:', device);
        });
      }

      this.logDebug('Transport manager initialized');
      return this.version;
    } catch (error) {
      this.logError('Failed to initialize transport manager', error as Error);
      throw error;
    }
  }

  async enumerate(): Promise<Array<OneKeyDeviceInfo>> {
    const [usbDevices, bleDevices] = await Promise.all([
      this.usbTransport.enumerate(),
      this.bleTransport.enumerate(),
    ]);

    // Store transport type for each device and convert to OneKeyDeviceInfo
    const usbInfo = usbDevices.map(device => ({
      ...device,
      id: device.path,
      name: `USB Device ${device.path}`,
    }));
    const bleInfo = bleDevices.map(device => ({
      ...device,
      id: device.path,
      name: `BLE Device ${device.path}`,
    }));

    // Store transport configs
    for (const device of usbInfo) {
      this.transportConfigs.set(device.path, { type: 'usb', deviceId: device.path });
    }
    for (const device of bleInfo) {
      this.transportConfigs.set(device.path, { type: 'ble', deviceId: device.path });
    }

    return [...usbInfo, ...bleInfo];
  }

  async listen(old?: Array<OneKeyDeviceInfo>): Promise<Array<OneKeyDeviceInfo>> {
    const [usbDevices, bleDevices] = await Promise.all([
      this.usbTransport.listen(old),
      this.bleTransport.listen(old),
    ]);

    // Convert to OneKeyDeviceInfo and update transport configs
    const usbInfo = usbDevices.map(device => ({
      ...device,
      id: device.path,
      name: `USB Device ${device.path}`,
    }));
    const bleInfo = bleDevices.map(device => ({
      ...device,
      id: device.path,
      name: `BLE Device ${device.path}`,
    }));

    // Update transport configs
    for (const device of usbInfo) {
      this.transportConfigs.set(device.path, { type: 'usb', deviceId: device.path });
    }
    for (const device of bleInfo) {
      this.transportConfigs.set(device.path, { type: 'ble', deviceId: device.path });
    }

    return [...usbInfo, ...bleInfo];
  }

  async acquire(input: AcquireInput): Promise<string> {
    try {
      const transport = await this.getTransportForDevice(input.path || '');
      const session = await transport.acquire(input);
      this.activeTransport = transport;
      return session;
    } catch (error) {
      if (error instanceof TransportError && error.recoverable) {
        await this.recovery.recover(error);
        // Retry with the new transport
        const transport = await this.getTransportForDevice(input.path || '');
        const session = await transport.acquire(input);
        this.activeTransport = transport;
        return session;
      }
      throw error;
    }
  }

  async release(session: string, onclose: boolean): Promise<void> {
    await this.activeTransport.release(session, onclose);
  }

  async configure(signedData: JSON | string): Promise<void> {
    await Promise.all([
      this.usbTransport.configure(signedData),
      this.bleTransport.configure(signedData),
    ]);
    this.configured = true;
  }

  async call(session: string, name: string, data: Record<string, any>): Promise<MessageFromOneKey> {
    return this.activeTransport.call(session, name, data);
  }

  async post(session: string, name: string, data: Record<string, any>): Promise<void> {
    await this.activeTransport.post(session, name, data);
  }

  async read(session: string): Promise<MessageFromOneKey> {
    return this.activeTransport.read(session);
  }

  async cancel(): Promise<void> {
    await this.activeTransport.cancel();
  }

  stop(): void {
    this.usbTransport.stop();
    this.bleTransport.stop();
  }

  async requestDevice(): Promise<void> {
    await this.activeTransport.requestDevice();
  }

  // Additional methods for transport management
  async switchTransport(deviceId: string, type: TransportType): Promise<void> {
    await Promise.resolve(); // Ensure async context
    try {
      const transport = type === 'ble' ? this.bleTransport : this.usbTransport;
      if (!transport) {
        throw new TransportError(
          `Transport ${type} not available`,
          type,
          true,
          deviceId,
          TransportErrorCode.TransportNotFound
        );
      }
      this.transportConfigs.set(deviceId, { type, deviceId });
      this.activeTransport = transport;
    } catch (error) {
      if (error instanceof TransportError) {
        throw error;
      }
      throw new TransportError(
        `Failed to switch transport: ${error.message}`,
        type,
        true,
        deviceId,
        TransportErrorCode.TransportSwitchFailed
      );
    }
  }

  getTransportType(deviceId: string): TransportType | undefined {
    return this.transportConfigs.get(deviceId)?.type;
  }
}

export default DesktopTransportManager;
