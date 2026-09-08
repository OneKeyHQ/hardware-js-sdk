import { EventEmitter } from 'events';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

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
  const peripheral = Object.assign(new EventEmitter(), {
    id,
    state: 'connected',
    mtu: null as number | null,
    advertisement: {
      localName: `OneKey Pro 2 ${id}`,
      serviceUuids: ['0001'],
    },
    discoverServices: jest.fn((_uuids, callback) => callback(null, [service])),
    connect: jest.fn(callback => callback()),
    disconnect: jest.fn(callback => callback()),
  });
  return {
    peripheral,
    service,
    write,
    notify,
  };
};

describe('Noble BLE plugin notification routing', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('normalizes the platform-specific Noble MTU to a safe write capacity', async () => {
    const { resolveNobleProtocolV2PacketCapacity } = await import('../transports/nobleBlePlugin');

    expect(resolveNobleProtocolV2PacketCapacity(null, 'darwin')).toBe(192);
    expect(resolveNobleProtocolV2PacketCapacity(244, 'darwin')).toBe(244);
    expect(resolveNobleProtocolV2PacketCapacity(247, 'linux')).toBe(244);
    expect(resolveNobleProtocolV2PacketCapacity(512, 'win32')).toBe(244);
  });

  test('does not enumerate Find My advertisements that expose FFFD', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const oneKey = createPeripheral('onekey-device');
    const findMy = createPeripheral('find-my-device');
    findMy.peripheral.advertisement.localName = 'Find My';
    findMy.peripheral.advertisement.serviceUuids = ['fffd'];
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', findMy.peripheral);
      noble.emit('discover', oneKey.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    const devicesPromise = plugin.enumerate();
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    await expect(devicesPromise).resolves.toEqual([
      expect.objectContaining({ id: 'onekey-device' }),
    ]);
    jest.useRealTimers();
  });

  test('does not enumerate a name-only candidate without the communication service', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const nameOnly = createPeripheral('name-only-device');
    nameOnly.peripheral.advertisement.serviceUuids = [];
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', nameOnly.peripheral);
    });
    noble.stopScanning = jest.fn(callback => callback?.());
    jest.doMock('@stoprocent/noble', () => noble);

    const { createNobleBlePlugin } = await import('../transports/nobleBlePlugin');
    const plugin = createNobleBlePlugin();
    await plugin.init();
    const devicesPromise = plugin.enumerate();
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    await expect(devicesPromise).resolves.toEqual([]);
    jest.useRealTimers();
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

  test('rejects a pending receive when the peripheral disconnects unexpectedly', async () => {
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

    const receive = plugin.receive('device-a');
    device.peripheral.state = 'disconnected';
    device.peripheral.emit('disconnect', 'Remote User Terminated Connection');

    await expect(receive).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceDisconnected,
    });
    await expect(plugin.receive('device-a')).rejects.toMatchObject({
      errorCode: HardwareErrorCode.TransportNotFound,
    });
  });

  test('disconnects an untracked peripheral when service discovery fails', async () => {
    const device = createPeripheral('device-a');
    device.peripheral.discoverServices.mockImplementation((_uuids, callback) =>
      callback(new Error('service discovery failed'))
    );
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

    await expect(plugin.connect('device-a')).rejects.toThrow('service discovery failed');
    expect(device.peripheral.disconnect).toHaveBeenCalledTimes(1);
  });

  test('rejects a vendor-specific service containing the OneKey short UUID', async () => {
    const device = createPeripheral('device-a');
    device.service.uuid = 'abcd0001-1234-5678-9012-abcdefabcdef';
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

    await expect(plugin.connect('device-a')).rejects.toThrow('No BLE service found');
  });

  test('unsubscribes and disconnects an untracked peripheral when notification setup fails', async () => {
    const device = createPeripheral('device-a');
    device.notify.subscribe.mockImplementation(callback =>
      callback(new Error('notification setup failed'))
    );
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

    await expect(plugin.connect('device-a')).rejects.toThrow('notification setup failed');
    expect(device.notify.unsubscribe).toHaveBeenCalled();
    expect(device.peripheral.disconnect).toHaveBeenCalledTimes(1);
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

    expect(device.write.write).toHaveBeenCalledWith(
      expect.any(Buffer),
      false,
      expect.any(Function)
    );
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

  test('uses the connected peripheral write capacity without padding', async () => {
    const device = createPeripheral('device-a');
    device.peripheral.mtu = process.platform === 'linux' ? 247 : 244;
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

    await plugin.send('device-a', 'aa'.repeat(245));

    expect(plugin.getProtocolV2PacketCapacity?.('device-a')).toBe(244);
    expect(device.write.write.mock.calls.map(([packet]) => packet.length)).toEqual([244, 1]);
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
