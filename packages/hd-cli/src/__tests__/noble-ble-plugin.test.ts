import { EventEmitter } from 'events';

type MockCharacteristic = EventEmitter & {
  uuid: string;
  unsubscribe: jest.Mock;
  subscribe: jest.Mock;
  write: jest.Mock;
  removeAllListeners: jest.Mock;
};

const createCharacteristic = (uuid: string): MockCharacteristic => {
  const characteristic = new EventEmitter() as MockCharacteristic;
  characteristic.uuid = uuid;
  characteristic.unsubscribe = jest.fn(callback => callback());
  characteristic.subscribe = jest.fn(callback => callback());
  characteristic.write = jest.fn((_buffer, _withoutResponse, callback) => callback());
  characteristic.removeAllListeners = jest.fn(
    characteristic.removeAllListeners.bind(characteristic)
  );
  return characteristic;
};

const createPeripheral = (id: string) => {
  const write = createCharacteristic('0002');
  const notify = createCharacteristic('0003');
  const service = {
    uuid: '0001',
    discoverCharacteristics: jest.fn((_uuids, callback) => callback(null, [write, notify])),
  };
  return {
    peripheral: {
      id,
      state: 'connected',
      advertisement: {
        localName: `OneKey Pro 2 ${id}`,
        serviceUuids: ['fffd'],
      },
      discoverServices: jest.fn((_uuids, callback) => callback(null, [service])),
      connect: jest.fn(callback => callback()),
      disconnect: jest.fn(callback => callback()),
    },
    write,
    notify,
  };
};

describe('Noble BLE plugin notification routing', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('routes notifications to the receiver waiting for the same device', async () => {
    const deviceA = createPeripheral('device-a');
    const deviceB = createPeripheral('device-b');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', deviceA.peripheral);
      noble.emit('discover', deviceB.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');
    await plugin.connect('device-b');

    const receiveA = plugin.receive('device-a');
    const receiveB = plugin.receive('device-b');
    deviceB.notify.emit('data', Buffer.from('bb', 'hex'));
    deviceA.notify.emit('data', Buffer.from('aa', 'hex'));

    await expect(Promise.all([receiveA, receiveB])).resolves.toEqual(['aa', 'bb']);
  });

  test('finishes disconnect cleanup when Noble never calls unsubscribe back', async () => {
    const device = createPeripheral('device-a');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', device.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');
    device.notify.unsubscribe.mockImplementation(() => undefined);

    const result = await Promise.race([
      plugin.disconnect('device-a').then(() => 'completed'),
      new Promise(resolve => {
        setTimeout(() => resolve('blocked'), 300);
      }),
    ]);

    expect(result).toBe('completed');
  });

  test('uses withoutResponse for normal and high-volume writes', async () => {
    const device = createPeripheral('device-a');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', device.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');

    await plugin.send('device-a', 'aa');
    await plugin.send('device-a', 'bb');

    expect(device.write.write.mock.calls.map(([, withoutResponse]) => withoutResponse)).toEqual([
      true,
      true,
    ]);
  });

  test('uses acknowledged writes when requested by firmware upload', async () => {
    const device = createPeripheral('device-a');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', device.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');

    await (plugin.send as any)('device-a', 'aa', { withoutResponse: false });

    expect(device.write.write).toHaveBeenCalledWith(expect.any(Buffer), false, expect.any(Function));
  });

  test('does not add a fixed delay between 192-byte writes', async () => {
    const device = createPeripheral('device-a');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    const wait = jest.fn(() => Promise.resolve());
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', device.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('@onekeyfe/hd-shared', () => ({
      ...jest.requireActual('@onekeyfe/hd-shared'),
      wait,
    }));

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');

    await plugin.send('device-a', 'aa'.repeat(193));

    expect(device.write.write).toHaveBeenCalledTimes(2);
    expect(wait).not.toHaveBeenCalled();
  });

  test('preserves a short final BLE packet without padding', async () => {
    const device = createPeripheral('device-a');
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', device.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    await plugin.connect('device-a');

    await plugin.send('device-a', 'aabb');

    const packet = device.write.write.mock.calls[0][0] as Buffer;
    expect(packet).toEqual(Buffer.from('aabb', 'hex'));
  });
});
