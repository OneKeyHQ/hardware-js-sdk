import { EventEmitter } from 'events';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import DataManager from '@onekeyfe/hd-core/src/data-manager/DataManager';
import TransportManager from '@onekeyfe/hd-core/src/data-manager/TransportManager';
import { Device } from '@onekeyfe/hd-core/src/device/Device';
import DeviceConnector from '@onekeyfe/hd-core/src/device/DeviceConnector';

import ReactNativeBleTransport from '../index';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {},
    Platform: { OS: 'android' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleATTErrorCode: { UnlikelyError: 14 },
  BleError: class BleError extends Error {},
  BleErrorCode: {
    DeviceAlreadyConnected: 203,
    DeviceDisconnected: 201,
    DeviceMTUChangeFailed: 206,
    OperationCancelled: 2,
    CharacteristicNotFound: 404,
  },
  BleManager: jest.fn(),
  ConnectionPriority: { Balanced: 0, High: 1, LowPower: 2 },
  ScanMode: { LowLatency: 2 },
}));

jest.mock('../BleManager', () => ({
  getBondedDevices: jest.fn(() => Promise.resolve([])),
  getConnectedDeviceIds: jest.fn(() => Promise.resolve([])),
  onDeviceBondState: jest.fn(() => Promise.resolve()),
  pairDevice: jest.fn(() => Promise.resolve({ bonded: true, bonding: false })),
}));

jest.mock('../subscribeBleOn', () => ({
  subscribeBleOn: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../core/src/data/config', () => ({
  getSDKVersion: () => '1.0.0-test',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const { parseConfigure } = transportPackage;

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    GetFeatures: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 1,
        MessageType_Success: 2,
        MessageType_GetFeatures: 55,
      },
    },
  },
};

const protocolV2Schema = {
  nested: {
    ProtocolInfoRequest: { fields: {} },
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_ProtocolInfoRequest: 60200,
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

const createSimulatedBleDevice = (uuid: string) => {
  let notifyCallback:
    | ((error: Error | null, characteristic: { value: string } | null) => void)
    | undefined;
  let responseSeq = 0;

  const notifyCharacteristic = {
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      return { remove: jest.fn() };
    }),
  };

  const handleWrite = () => {
    responseSeq += 1;
    const response = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
    );
    notifyCallback?.(null, { value: Buffer.from(response).toString('base64') });
    return Promise.resolve();
  };

  const writeCharacteristic = {
    uuid: '0002',
    deviceID: uuid,
    isWritableWithResponse: true,
    isWritableWithoutResponse: true,
    writeWithResponse: jest.fn(handleWrite),
    writeWithoutResponse: jest.fn(handleWrite),
  };

  const device = {
    id: uuid,
    name: 'OneKey Pro 2',
    localName: 'OneKey Pro 2',
    mtu: 247,
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect: jest.fn(),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  } as any;
  device.connect.mockResolvedValue(device);
  device.requestMTU = jest.fn(() => Promise.resolve(device));
  device.requestConnectionPriority = jest.fn(() => Promise.resolve(device));

  return { device, writeCharacteristic, notifyCharacteristic };
};

describe('ReactNativeBleTransport concurrent release and Android bonding', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('normal Device.release() does not abort another device waiting on Android bonding', async () => {
    const uuidA = 'rn-android-release-a';
    const uuidB = 'rn-android-bonding-b';
    const devA = createSimulatedBleDevice(uuidA);
    const devB = createSimulatedBleDevice(uuidB);
    const devicesById = new Map([
      [uuidA, devA],
      [uuidB, devB],
    ]);

    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = {
      devices: jest.fn((ids: string[]) =>
        Promise.resolve(ids.map(id => devicesById.get(id)?.device).filter(Boolean))
      ),
      connectedDevices: jest.fn(() => Promise.resolve([])),
      cancelTransaction: jest.fn(() => Promise.resolve()),
      cancelDeviceConnection: jest.fn(() => Promise.resolve()),
      destroy: jest.fn(),
    } as any;
    transport.resolveCharacteristics = jest.fn((device: { id: string }) => {
      const entry = devicesById.get(device.id);
      if (!entry) throw new Error(`Unknown device ${device.id}`);
      return Promise.resolve({
        writeCharacteristic: entry.writeCharacteristic,
        notifyCharacteristic: entry.notifyCharacteristic,
      });
    });
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
    transport.configure(protocolV1Schema);
    transport.configureProtocolV2(protocolV2Schema);

    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    jest.spyOn(TransportManager, 'load').mockImplementation();
    TransportManager.transport = transport as any;
    const connector = new DeviceConnector();
    const cancelSpy = jest.spyOn(transport, 'cancel');

    const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;
    const onDeviceBondStateMock = jest.requireMock('../BleManager').onDeviceBondState as jest.Mock;
    const bondB = createDeferred<void>();

    pairDeviceMock.mockImplementation((id: string) =>
      id === uuidA
        ? Promise.resolve({ bonded: true, bonding: false })
        : Promise.resolve({ bonded: false, bonding: true, initiated: true })
    );
    onDeviceBondStateMock.mockImplementation((id: string, signal?: AbortSignal) => {
      if (id !== uuidB) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
          return;
        }
        const onAbort = () => reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
        signal?.addEventListener('abort', onAbort, { once: true });
        bondB.promise.then(
          () => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
          },
          err => {
            signal?.removeEventListener('abort', onAbort);
            reject(err);
          }
        );
      });
    });

    const deviceA = Device.fromDescriptor({
      id: uuidA,
      path: uuidA,
      name: 'OneKey Pro 2',
      commType: 'ble',
      protocolType: 'V2',
    } as never);
    deviceA.deviceConnector = connector;

    const deviceB = Device.fromDescriptor({
      id: uuidB,
      path: uuidB,
      name: 'OneKey Pro 2',
      commType: 'ble',
      protocolType: 'V2',
    } as never);
    deviceB.deviceConnector = connector;

    await deviceA.acquire('V2');
    await expect(deviceA.commands.typedCall('Ping', 'Success', { message: 'hi' })).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });

    const acquiringB = deviceB.acquire('V2');
    for (let i = 0; i < 10 && onDeviceBondStateMock.mock.calls.length === 0; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(onDeviceBondStateMock).toHaveBeenCalledWith(
      uuidB,
      expect.any(Object),
      expect.objectContaining({ systemInitiated: false })
    );

    // Normal release goes through Device.release() -> DeviceCommands.dispose(false).
    await deviceA.release();
    expect(cancelSpy).not.toHaveBeenCalled();

    // Device B must still complete Android bonding and acquire cleanly.
    bondB.resolve();
    await expect(acquiringB).resolves.toBeUndefined();
    expect(deviceB.hasDeviceAcquire()).toBe(true);
    expect(deviceB.mainId).toBe(uuidB);

    await deviceB.release();
    await transport.stop();
  });
});
