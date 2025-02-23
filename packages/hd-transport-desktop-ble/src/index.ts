import noble from '@abandonware/noble';
import { EventEmitter } from 'events';
import {
  Transport,
  OneKeyDeviceInfo,
  AcquireInput,
  MessageFromOneKey,
  LowlevelTransportSharedPlugin,
} from '@onekeyfe/hd-transport';
import { BleError, BleErrorCode } from './errors';

const ONEKEY_SERVICE_UUID = '0000FD00-0000-1000-8000-00805F9B34FB';
const ONEKEY_WRITE_CHARACTERISTIC = '0000FD01-0000-1000-8000-00805F9B34FB';
const ONEKEY_NOTIFY_CHARACTERISTIC = '0000FD02-0000-1000-8000-00805F9B34FB';

export class DesktopBleTransport implements Transport {
  private devices: Map<string, noble.Peripheral> = new Map();

  private sessions: Map<
    string,
    {
      device: noble.Peripheral;
      service?: noble.Service;
      writeCharacteristic?: noble.Characteristic;
      notifyCharacteristic?: noble.Characteristic;
    }
  > = new Map();

  private isScanning = false;

  private mtuSize = 20;

  private logger?: Console;

  private emitter?: EventEmitter;

  private plugin?: LowlevelTransportSharedPlugin;

  // Used by the transport manager to access plugin functionality
  getPlugin(): LowlevelTransportSharedPlugin | undefined {
    return this.plugin;
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.logger) {
      this.logger.debug(`[DesktopBle] ${message}`, ...args);
    }
  }

  private logError(message: string, error?: Error): void {
    if (this.logger) {
      this.logger.error(`[DesktopBle] ${message}`, error);
    }
  }

  configured = false;

  version = '1.0.0';

  name = 'DesktopBle';

  activeName = 'DesktopBle';

  requestNeeded = false;

  isOutdated = false;

  constructor() {
    noble.on('stateChange', state => {
      if (state === 'poweredOn' && this.isScanning) {
        this.startScan();
      }
    });
  }

  private startScan(): void {
    noble.startScanning([ONEKEY_SERVICE_UUID], false);
  }

  private stopScan(): void {
    noble.stopScanning();
  }

  async init(
    logger?: Console,
    emitter?: EventEmitter,
    plugin?: LowlevelTransportSharedPlugin
  ): Promise<string> {
    this.logger = logger;
    this.emitter = emitter;
    this.plugin = plugin;
    this.logDebug('Initialized');
    await Promise.resolve(); // Ensure async context
    return 'Success';
  }

  async enumerate(): Promise<Array<OneKeyDeviceInfo>> {
    this.isScanning = true;
    this.startScan();
    this.logDebug('Starting device enumeration');

    return new Promise(resolve => {
      const devices: OneKeyDeviceInfo[] = [];
      const onDiscover = (peripheral: noble.Peripheral) => {
        if (!this.devices.has(peripheral.id)) {
          this.devices.set(peripheral.id, peripheral);
          const device = {
            id: peripheral.id,
            name: peripheral.advertisement.localName || null,
            path: peripheral.id,
            session: null,
            debugSession: null,
            debug: false,
          };
          devices.push(device);
          this.logDebug('Device discovered', device);
          if (this.emitter) {
            this.emitter.emit('device-found', device);
          }
        }
      };

      noble.on('discover', onDiscover);

      setTimeout(() => {
        noble.removeListener('discover', onDiscover);
        this.stopScan();
        this.isScanning = false;
        this.logDebug('Device enumeration completed', devices);
        resolve(devices);
      }, 3000);
    });
  }

  async listen(_old?: Array<OneKeyDeviceInfo>): Promise<Array<OneKeyDeviceInfo>> {
    return this.enumerate();
  }

  async acquire(input: AcquireInput): Promise<string> {
    const device = this.devices.get(input.path || '');
    if (!device) {
      throw new BleError('Device not found', BleErrorCode.DeviceNotFound);
    }

    return new Promise((resolve, reject) => {
      device.connect(error => {
        if (error) {
          reject(new BleError('Connection failed', BleErrorCode.ConnectionFailed));
          return;
        }

        device.discoverServices([ONEKEY_SERVICE_UUID], (error, services) => {
          if (error || !services?.length) {
            reject(new BleError('Service not found', BleErrorCode.ServiceNotFound));
            return;
          }

          const service = services[0];
          service.discoverCharacteristics(
            [ONEKEY_WRITE_CHARACTERISTIC, ONEKEY_NOTIFY_CHARACTERISTIC],
            (error, characteristics) => {
              if (error || characteristics.length < 2) {
                reject(
                  new BleError('Characteristics not found', BleErrorCode.CharacteristicNotFound)
                );
                return;
              }

              const writeChar = characteristics.find(c => c.uuid === ONEKEY_WRITE_CHARACTERISTIC);
              const notifyChar = characteristics.find(c => c.uuid === ONEKEY_NOTIFY_CHARACTERISTIC);

              if (!writeChar || !notifyChar) {
                reject(
                  new BleError(
                    'Required characteristics not found',
                    BleErrorCode.CharacteristicNotFound
                  )
                );
                return;
              }

              const sessionId = `${device.id}-${Date.now()}`;
              this.sessions.set(sessionId, {
                device,
                service,
                writeCharacteristic: writeChar,
                notifyCharacteristic: notifyChar,
              });
              resolve(sessionId);
            }
          );
        });
      });
    });
  }

  async release(session: string, _onclose: boolean): Promise<void> {
    const sessionData = this.sessions.get(session);
    if (sessionData?.device) {
      await new Promise<void>(resolve => {
        sessionData.device.disconnect();
        resolve();
      });
      this.sessions.delete(session);
    }
  }

  async configure(_signedData: JSON | string): Promise<void> {
    await Promise.resolve();
    this.configured = true;
  }

  private async writeChunked(session: string, data: string): Promise<void> {
    const sessionData = this.sessions.get(session);
    if (!sessionData?.writeCharacteristic) {
      throw new BleError('Write characteristic not found', BleErrorCode.CharacteristicNotFound);
    }

    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += this.mtuSize) {
      chunks.push(data.slice(i, i + this.mtuSize));
    }

    for (const chunk of chunks) {
      await new Promise<void>((resolve, reject) => {
        if (!sessionData.writeCharacteristic) {
          reject(new BleError('Write characteristic lost', BleErrorCode.CharacteristicNotFound));
          return;
        }

        sessionData.writeCharacteristic.write(Buffer.from(chunk, 'hex'), true, error => {
          if (error) {
            reject(new BleError('Write failed', BleErrorCode.WriteError));
          } else {
            resolve();
          }
        });
      });
    }
  }

  private async readMessage(session: string): Promise<MessageFromOneKey> {
    const sessionData = this.sessions.get(session);
    if (!sessionData?.device || !sessionData?.notifyCharacteristic) {
      throw new BleError('Notify characteristic not found', BleErrorCode.CharacteristicNotFound);
    }

    return new Promise((resolve, reject) => {
      let message = '';
      const notificationTimeout = setTimeout(() => {
        sessionData.device.removeListener('notification', onNotification);
        this.logError('Read timeout');
        reject(new BleError('Read timeout', BleErrorCode.ReadError));
      }, 30000);
      const onNotification = (serviceUuid: string, characteristicUuid: string, data: Buffer) => {
        if (
          serviceUuid === ONEKEY_SERVICE_UUID &&
          characteristicUuid === ONEKEY_NOTIFY_CHARACTERISTIC
        ) {
          message += data.toString('hex');
          try {
            const parsed = JSON.parse(message);
            sessionData.device.removeListener('notification', onNotification);
            clearTimeout(notificationTimeout);
            this.logDebug('Message received', parsed);
            resolve({ type: parsed.type || 'response', message: parsed });
          } catch (e) {
            // Not a complete message yet, continue collecting
          }
        }
      };

      sessionData.device.on('notification', onNotification);

      // Set up notification handling
      if (!sessionData.notifyCharacteristic) {
        sessionData.device.removeListener('notification', onNotification);
        this.logError('Notify characteristic lost');
        reject(new BleError('Notify characteristic lost', BleErrorCode.CharacteristicNotFound));
        return;
      }

      sessionData.notifyCharacteristic.notify(true, error => {
        if (error) {
          sessionData.device.removeListener('notification', onNotification);
          this.logError('Read failed', error);
          reject(new BleError('Read failed', BleErrorCode.ReadError));
        }
      });

      // Timeout already set above
    });
  }

  async call(session: string, name: string, data: Record<string, any>): Promise<MessageFromOneKey> {
    if (!this.sessions.has(session)) {
      throw new BleError('Session not found', BleErrorCode.DeviceNotFound);
    }

    const message = JSON.stringify({ type: name, ...data });
    await this.writeChunked(session, message);
    return this.readMessage(session);
  }

  async post(session: string, name: string, data: Record<string, any>): Promise<void> {
    if (!this.sessions.has(session)) {
      throw new BleError('Session not found', BleErrorCode.DeviceNotFound);
    }

    const message = JSON.stringify({ type: name, ...data });
    await this.writeChunked(session, message);
  }

  async read(session: string): Promise<MessageFromOneKey> {
    if (!this.sessions.has(session)) {
      throw new BleError('Session not found', BleErrorCode.DeviceNotFound);
    }

    return this.readMessage(session);
  }

  async cancel(): Promise<void> {
    // Cancel ongoing operations
  }

  stop(): void {
    this.logDebug('Stopping BLE transport');
    this.stopScan();
    this.isScanning = false;
    for (const sessionData of this.sessions.values()) {
      if (sessionData.device) {
        try {
          sessionData.device.disconnect();
        } catch (error) {
          this.logError('Error disconnecting device', error as Error);
        }
      }
    }
    this.sessions.clear();
    this.devices.clear();
    this.logDebug('BLE transport stopped');
  }

  async requestDevice(): Promise<void> {
    // Not needed for desktop BLE
  }
}

export default DesktopBleTransport;
