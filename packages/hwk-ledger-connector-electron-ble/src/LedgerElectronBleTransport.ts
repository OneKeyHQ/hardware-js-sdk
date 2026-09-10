import {
  DisconnectError,
  GeneralDmkError,
  OpeningConnectionError,
  SendApduConcurrencyError,
  SendApduTimeoutError,
  TransportConnectedDevice,
  UnknownDeviceError,
} from '@ledgerhq/device-management-kit';
import { Left, Right } from 'purify-ts';
import { defer, from, mergeMap } from 'rxjs';
import { hexToBytes } from '@onekeyfe/hwk-adapter-core';

import type {
  BleDeviceInfos,
  SendApduResult,
  Transport,
  TransportArgs,
  TransportDiscoveredDevice,
} from '@ledgerhq/device-management-kit';
import type { ElectronBleApi, ElectronBleDeviceInfo } from '@onekeyfe/hwk-adapter-core';

const TRANSPORT_ID = 'ELECTRON_BLE';
// The ATT default is safe on both native backends; never split a Ledger frame in main.
const FRAME_SIZE = 20;
const normalizeUuid = (uuid: string) => uuid.replace(/-/g, '').toLowerCase();
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

export class LedgerElectronBleTransport implements Transport {
  private readonly devices = new Map<
    string,
    { device: TransportDiscoveredDevice; profile: BleDeviceInfos }
  >();

  private readonly connections = new Map<
    string,
    {
      close: () => boolean;
      connectedDevice?: TransportConnectedDevice;
    }
  >();

  private scanPromise: Promise<TransportDiscoveredDevice[]> | undefined;

  private readonly bridge: ElectronBleApi;

  private readonly args: Pick<
    TransportArgs,
    'deviceModelDataSource' | 'apduSenderServiceFactory' | 'apduReceiverServiceFactory'
  >;

  constructor(bridge: ElectronBleApi, args: LedgerElectronBleTransport['args']) {
    this.bridge = bridge;
    this.args = args;
  }

  getIdentifier() {
    return TRANSPORT_ID;
  }

  isSupported() {
    return true;
  }

  private remember(info: ElectronBleDeviceInfo): TransportDiscoveredDevice | undefined {
    const profiles = this.args.deviceModelDataSource.getBluetoothServicesInfos();
    const profile = Object.values(profiles).find(candidate =>
      info.advertisedServiceUuids?.some(
        uuid => normalizeUuid(uuid) === normalizeUuid(candidate.serviceUuid)
      )
    );
    if (!profile) return undefined;
    const device: TransportDiscoveredDevice = {
      id: info.id,
      name: info.name,
      rssi: info.rssi,
      deviceModel: profile.deviceModel,
      transport: TRANSPORT_ID,
    };
    this.devices.set(info.id, { device, profile });
    return device;
  }

  private discover(): Promise<TransportDiscoveredDevice[]> {
    if (this.scanPromise) return this.scanPromise;
    const scan = (async () => {
      const availability = await this.bridge.checkAvailability();
      if (!availability.available) throw new Error(`Bluetooth unavailable: ${availability.state}`);
      const infos = await this.bridge.scan({
        vendor: 'ledger',
        serviceUuids: this.args.deviceModelDataSource.getBluetoothServices(),
      });
      const devices: TransportDiscoveredDevice[] = [];
      for (const info of infos) {
        const device = this.remember(info);
        if (device) devices.push(device);
      }
      return devices;
    })();
    this.scanPromise = scan;
    void scan
      .finally(() => {
        if (this.scanPromise === scan) this.scanPromise = undefined;
      })
      .catch(() => undefined);
    return scan;
  }

  startDiscovering() {
    return defer(() => this.discover()).pipe(mergeMap(devices => from(devices)));
  }

  listenToAvailableDevices() {
    return defer(() => this.discover());
  }

  async stopDiscovering(): Promise<void> {
    await this.scanPromise?.catch(() => undefined);
    await this.bridge.stopScan();
  }

  async connect({
    deviceId,
    onDisconnect,
  }: Parameters<Transport['connect']>[0]): ReturnType<Transport['connect']> {
    if (this.connections.has(deviceId))
      return Left(new OpeningConnectionError('Device is already connected'));
    let removeNotification: (() => void) | undefined;
    let removeDisconnect: (() => void) | undefined;
    let closed = false;
    let rejectPending: ((error: unknown) => void) | undefined;
    let receive: ((bytes: Uint8Array) => void) | undefined;
    const close = () => {
      if (closed) return false;
      closed = true;
      removeNotification?.();
      removeDisconnect?.();
      rejectPending?.(new Error('Bluetooth connection ended'));
      return true;
    };
    const release = () => {
      if (this.connections.get(deviceId)?.close === close) this.connections.delete(deviceId);
    };
    const disconnect = async (notify: boolean) => {
      if (!close()) return;
      await this.bridge.disconnect(deviceId).catch(() => undefined);
      release();
      if (notify) onDisconnect(deviceId);
    };
    // Reserve before the first await so concurrent acquires cannot share native GATT state.
    this.connections.set(deviceId, { close });
    try {
      await this.stopDiscovering();
      if (!this.devices.has(deviceId)) {
        const info = await this.bridge.getDevice(deviceId);
        if (info) this.remember(info);
      }
      const known = this.devices.get(deviceId);
      if (!known) {
        close();
        release();
        return Left(new UnknownDeviceError());
      }
      await this.bridge.connect(deviceId, {
        vendor: 'ledger',
        serviceUuid: known.profile.serviceUuid,
        writeUuid: known.profile.writeUuid,
        notifyUuid: known.profile.notifyUuid,
      });
      removeDisconnect = this.bridge.onDeviceDisconnected(id => {
        if (id !== deviceId) return;
        if (close()) {
          release();
          onDisconnect(deviceId);
        }
      });
      removeNotification = this.bridge.onNotification((id, hex) => {
        if (id !== deviceId || closed) return;
        if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
          rejectPending?.(new Error('Malformed Bluetooth notification'));
          return;
        }
        receive?.(hexToBytes(hex));
      });
      await this.bridge.subscribe(deviceId);

      const exchange = async <T>(
        frames: Uint8Array[],
        accept: (
          bytes: Uint8Array,
          resolve: (value: T) => void,
          reject: (error: unknown) => void
        ) => void,
        timeoutMs: number
      ): Promise<T> => {
        if (closed) throw new Error('Bluetooth connection ended');
        if (receive) throw new Error('Bluetooth exchange is busy');
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await new Promise<T>((resolve, reject) => {
            rejectPending = reject;
            receive = bytes => accept(bytes, resolve, reject);
            timer = setTimeout(
              () => reject(new SendApduTimeoutError('Bluetooth response timed out')),
              timeoutMs
            );
            void (async () => {
              for (const frame of frames) {
                if (closed) throw new Error('Bluetooth connection ended');
                await this.bridge.write(deviceId, toHex(frame));
              }
            })().catch(reject);
          });
        } finally {
          if (timer !== undefined) clearTimeout(timer);
          receive = undefined;
          rejectPending = undefined;
        }
      };

      const frameSize = await exchange<number>(
        [Uint8Array.of(0x08, 0, 0, 0, 0)],
        (bytes, resolve, reject) => {
          if (bytes.length < 6 || bytes[0] !== 0x08 || bytes[5] < 6) {
            reject(new Error('Invalid Ledger BLE MTU response'));
          } else resolve(Math.min(FRAME_SIZE, bytes[5]));
        },
        30_000
      );
      if (closed) throw new Error('Bluetooth connection ended');
      const sender = this.args.apduSenderServiceFactory({ frameSize });
      const connected = new TransportConnectedDevice({
        ...known.device,
        type: 'BLE',
        sendApdu: async (apdu, _triggersDisconnection, abortTimeout): Promise<SendApduResult> => {
          if (closed) return Left(new DisconnectError());
          if (receive) return Left(new SendApduConcurrencyError());
          const receiver = this.args.apduReceiverServiceFactory();
          try {
            const result = await exchange<SendApduResult>(
              sender.getFrames(apdu).map(frame => frame.getRawData()),
              (bytes, resolve) =>
                receiver.handleFrame(bytes).caseOf({
                  Left: error => resolve(Left(error)),
                  Right: response => {
                    response.map(value => resolve(Right(value)));
                  },
                }),
              abortTimeout ?? 120_000
            );
            if (result.isLeft()) {
              await disconnect(true);
            }
            return result;
          } catch (error) {
            await disconnect(true);
            return Left(error instanceof SendApduTimeoutError ? error : new GeneralDmkError(error));
          }
        },
      });
      const connection = this.connections.get(deviceId);
      if (connection?.close === close) connection.connectedDevice = connected;
      return Right(connected);
    } catch (error) {
      await disconnect(false);
      return Left(new OpeningConnectionError(error));
    }
  }

  async disconnect({
    connectedDevice,
  }: Parameters<Transport['disconnect']>[0]): ReturnType<Transport['disconnect']> {
    const connection = this.connections.get(connectedDevice.id);
    if (connection?.connectedDevice !== connectedDevice || !connection.close())
      return Right(undefined);
    try {
      await this.bridge.disconnect(connectedDevice.id);
      return Right(undefined);
    } catch (error) {
      return Left(new DisconnectError(error));
    } finally {
      if (this.connections.get(connectedDevice.id) === connection) {
        this.connections.delete(connectedDevice.id);
      }
    }
  }
}
