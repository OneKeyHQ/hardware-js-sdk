import { EventEmitter } from 'events';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2,
  bytesToHex,
} from '@onekeyfe/hd-transport';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport from '../index';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {},
    Platform: { OS: 'ios' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleATTErrorCode: { UnlikelyError: 14 },
  BleError: class BleError extends Error {},
  BleErrorCode: {
    DeviceAlreadyConnected: 203,
    DeviceDisconnected: 205,
    DeviceMTUChangeFailed: 206,
    OperationCancelled: 2,
    CharacteristicNotFound: 404,
  },
  BleManager: jest.fn(),
  ScanMode: { LowLatency: 2 },
}));

jest.mock('../BleManager', () => ({
  getConnectedDeviceIds: jest.fn(() => Promise.resolve([])),
  onDeviceBondState: jest.fn(() => Promise.resolve()),
  pairDevice: jest.fn(() => Promise.resolve({ bonded: true, bonding: false })),
}));

jest.mock('../subscribeBleOn', () => ({
  subscribeBleOn: jest.fn(() => Promise.resolve()),
}));

const { parseConfigure } = transportPackage;

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 1,
        MessageType_Success: 2,
      },
    },
  },
};

const protocolV2Schema = {
  nested: {
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    FileWrite: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_FileWrite: 60805,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const createHarness = () => {
  const uuid = 'rn-pro2-id';
  const sentSeqs: number[] = [];
  let responseSeq = 0;
  let shouldRespond = true;
  let notifyCallback:
    | ((
        error: (Error & { reason?: string }) | null,
        characteristic: { value: string } | null
      ) => void)
    | undefined;
  const notifyCharacteristic = {
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      return { remove: jest.fn() };
    }),
  };
  const handleWrite = (base64: string) => {
    const frame = Buffer.from(base64, 'base64');
    sentSeqs.push(frame[6]);
    if (shouldRespond) {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      notifyCallback?.(null, { value: Buffer.from(response).toString('base64') });
    }
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
    serviceUUIDs: ['fffd'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  transport.blePlxManager = bleManager;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);

  return {
    transport,
    uuid,
    sentSeqs,
    writeCharacteristic,
    setShouldRespond(value: boolean) {
      shouldRespond = value;
    },
    emitMonitorError(error: Error & { reason?: string }) {
      notifyCallback?.(error, null);
    },
  };
};

describe('ReactNativeBleTransport Protocol V2 link lifecycle', () => {
  test('keeps the Protocol V2 sequence across probe and the next call', async () => {
    const { transport, uuid, sentSeqs } = createHarness();

    await transport.acquire({ uuid });
    await transport.call(uuid, 'Ping', { message: 'after-probe' });

    expect(sentSeqs).toEqual([1, 2]);
    expect(bytesToHex(new Uint8Array([sentSeqs[0], sentSeqs[1]]))).toBe('0102');
    await transport.release(uuid, true);
  });

  test('rejects the active Protocol V2 reader when the current monitor errors', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'wait-for-monitor' }, { timeoutMs: 50 });
    while (sentSeqs.length < 2) {
      await Promise.resolve();
    }
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
    harness.emitMonitorError(Object.assign(new Error('monitor failed'), { reason: 'link lost' }));

    await expect(call).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleCharacteristicNotifyError,
    });
  });

  test('retains the sequence cursor when a new monitor generation is acquired', async () => {
    const { transport, uuid, sentSeqs } = createHarness();

    await transport.acquire({ uuid });
    await transport.release(uuid, true);
    await transport.acquire({ uuid });

    expect(sentSeqs).toEqual([1, 2]);
    await transport.release(uuid, true);
  });

  test('uses withoutResponse for normal and high-volume calls', async () => {
    const { transport, uuid, writeCharacteristic } = createHarness();

    await transport.acquire({ uuid });
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();

    await transport.call(uuid, 'Ping', { message: 'normal' });
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(2);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();

    await transport.call(uuid, 'FileWrite', {});
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('rejects an active Protocol V2 reader when disconnect resets the link', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'disconnect' }, { timeoutMs: 50 });
    while (sentSeqs.length < 2) {
      await Promise.resolve();
    }

    const rejection = expect(call).rejects.toThrow('React Native BLE transport disconnected');
    await transport.disconnect(uuid);
    await rejection;
  });
});
