import { TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { RNBlePlxTrezorTransport } from '../RNBlePlxTrezorTransport';

type NotifyListener = (error: unknown, characteristic: { value?: string | null } | null) => void;

describe('RNBlePlxTrezorTransport', () => {
  function createCharacteristic(uuid: string) {
    return {
      uuid,
      deviceID: 'safe-7',
      writeWithResponse: jest.fn().mockResolvedValue({}),
      writeWithoutResponse: jest.fn().mockResolvedValue({}),
      monitor: jest.fn((_listener: NotifyListener) => ({ remove: jest.fn() })),
    };
  }

  function createConnectedDevice(
    id: string,
    characteristics = [
      createCharacteristic(TREZOR_BLE_UUIDS.write),
      createCharacteristic(TREZOR_BLE_UUIDS.notify),
      createCharacteristic(TREZOR_BLE_UUIDS.push),
    ]
  ) {
    return {
      id,
      name: 'Trezor Safe 7',
      connect: jest.fn(),
      cancelConnection: jest.fn(),
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(undefined),
      characteristicsForService: jest.fn().mockResolvedValue(characteristics),
      requestMTU: jest.fn().mockResolvedValue({
        id,
        name: 'Trezor Safe 7',
        discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(undefined),
        characteristicsForService: jest.fn().mockResolvedValue(characteristics),
      }),
    };
  }

  it('uses discovered characteristic objects for proof, write, and notify like Trezor native bluetooth transport', async () => {
    let notifyListener: NotifyListener | undefined;
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const writeCharacteristic = createCharacteristic(TREZOR_BLE_UUIDS.write);
    const notifyCharacteristic = {
      ...createCharacteristic(TREZOR_BLE_UUIDS.notify),
      monitor: jest.fn((listener: NotifyListener) => {
        notifyListener = listener;
        return { remove: jest.fn() };
      }),
    };
    const pushCharacteristic = createCharacteristic(TREZOR_BLE_UUIDS.push);
    const device = createConnectedDevice('safe-7', [
      writeCharacteristic,
      notifyCharacteristic,
      pushCharacteristic,
    ]);
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(device),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({
      manager,
      logger: entry => logs.push({ event: entry.event, data: entry.data }),
    });
    await transport.connect('safe-7');

    const exchange = transport.exchange('safe-7', Uint8Array.from([1, 2, 3]));
    notifyListener?.(null, { value: 'BAUG' });

    await expect(exchange).resolves.toEqual(Uint8Array.from([4, 5, 6]));
    expect(manager.connectToDevice).toHaveBeenCalledWith('safe-7', {
      requestMTU: 247,
      timeout: 5000,
    });
    expect(device.discoverAllServicesAndCharacteristics).toHaveBeenCalled();
    expect(device.characteristicsForService).toHaveBeenCalledWith(TREZOR_BLE_UUIDS.service);
    expect(writeCharacteristic.writeWithResponse).toHaveBeenCalledWith(
      'UHJvb2Ygb2YgY29ubmVjdGlvbg=='
    );
    expect(manager.writeCharacteristicWithResponseForDevice).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledWith(expect.any(String));
    const writtenBase64 = writeCharacteristic.writeWithoutResponse.mock.calls[0][0];
    const writtenBytes = Buffer.from(writtenBase64, 'base64');
    expect(writtenBytes).toHaveLength(244);
    expect(Array.from(writtenBytes.slice(0, 3))).toEqual([1, 2, 3]);
    expect(logs.map(log => log.event)).not.toEqual(
      expect.arrayContaining(['ble.write.chunk', 'ble.notify.data'])
    );
    expect(JSON.stringify(logs)).not.toContain('packetHex');
    expect(notifyCharacteristic.monitor).toHaveBeenCalledWith(expect.any(Function));
    expect(manager.monitorCharacteristicForDevice).not.toHaveBeenCalled();
  });

  it('waits for the BLE manager to reach PoweredOn before scanning', async () => {
    let scanned = false;
    const remove = jest.fn();
    const manager = {
      // ble-plx emits the current state asynchronously; simulate a fresh iOS
      // manager that starts Unknown then settles to PoweredOn.
      onStateChange: jest.fn((listener: (state: string) => void, _emitCurrentState?: boolean) => {
        void Promise.resolve().then(() => listener('Unknown'));
        void Promise.resolve().then(() => listener('PoweredOn'));
        return { remove };
      }),
      startDeviceScan: jest.fn((_services, _options, listener) => {
        scanned = true;
        listener(null, {
          id: 'safe-7',
          name: 'Trezor Safe 7',
          localName: 'Trezor Safe 7',
          serviceUUIDs: [TREZOR_BLE_UUIDS.service],
        });
      }),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn(),
      monitorCharacteristicForDevice: jest.fn(),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    const result = await transport.scan();

    expect(manager.onStateChange).toHaveBeenCalledWith(expect.any(Function), true);
    expect(scanned).toBe(true);
    expect(remove).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 'safe-7',
        path: 'safe-7',
        name: 'Trezor Safe 7',
        serviceUUIDs: [TREZOR_BLE_UUIDS.service],
      },
    ]);
  });

  it('prefers fresh advertisement localName and keeps the latest duplicate scan result', async () => {
    const manager = {
      startDeviceScan: jest.fn((_services, _options, listener) => {
        listener(null, {
          id: 'safe-7',
          name: 'Trezor Safe 7 (9R2)',
          localName: 'Trezor Safe 7 (9R2)',
          serviceUUIDs: [TREZOR_BLE_UUIDS.service],
        });
        listener(null, {
          id: 'safe-7',
          name: 'Trezor Safe 7 (9R2)',
          localName: 'Trezor Safe 7 (5S4)',
          serviceUUIDs: [TREZOR_BLE_UUIDS.service],
        });
      }),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn(),
      monitorCharacteristicForDevice: jest.fn(),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.scan()).resolves.toEqual([
      {
        id: 'safe-7',
        path: 'safe-7',
        name: 'Trezor Safe 7 (5S4)',
        serviceUUIDs: [TREZOR_BLE_UUIDS.service],
      },
    ]);
    expect(manager.startDeviceScan).toHaveBeenCalledWith(
      null,
      { allowDuplicates: true },
      expect.any(Function)
    );
  });

  it('scans without an OS UUID filter and keeps only devices advertising the Trezor service UUID', async () => {
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const manager = {
      startDeviceScan: jest.fn((_services, _options, listener) => {
        // A nearby non-Trezor device: must be filtered out.
        listener(null, {
          id: 'headphones',
          name: 'Buds',
          serviceUUIDs: ['0000180f-0000-1000-8000-00805f9b34fb'],
        });
        // No advertised service UUIDs: must be filtered out.
        listener(null, { id: 'unknown', name: 'whatever' });
        // A Trezor advertising the UUID in upper-case (iOS): must be kept.
        listener(null, {
          id: 'safe-7',
          localName: 'Trezor Safe 7 (9R2)',
          serviceUUIDs: [TREZOR_BLE_UUIDS.service.replace(/-/g, '').toUpperCase()],
        });
      }),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn(),
      monitorCharacteristicForDevice: jest.fn(),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({
      manager,
      logger: entry => logs.push({ event: entry.event, data: entry.data }),
    });

    await expect(transport.scan()).resolves.toEqual([
      {
        id: 'safe-7',
        path: 'safe-7',
        name: 'Trezor Safe 7 (9R2)',
        serviceUUIDs: [TREZOR_BLE_UUIDS.service.replace(/-/g, '').toUpperCase()],
      },
    ]);
    expect(manager.startDeviceScan).toHaveBeenCalledWith(
      null,
      { allowDuplicates: true },
      expect.any(Function)
    );
  });

  it('preserves the Trezor service UUID when advertising omits local name', async () => {
    const manager = {
      startDeviceScan: jest.fn((_services, _options, listener) => {
        listener(null, {
          id: 'safe-7',
          serviceUUIDs: [TREZOR_BLE_UUIDS.service],
        });
      }),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn(),
      monitorCharacteristicForDevice: jest.fn(),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.scan()).resolves.toEqual([
      {
        id: 'safe-7',
        path: 'safe-7',
        serviceUUIDs: [TREZOR_BLE_UUIDS.service],
      },
    ]);
  });

  it('connects using ble-plx cached device like Trezor native bluetooth transport', async () => {
    const scannedDevice = {
      ...createConnectedDevice('safe-7'),
      name: 'Trezor Safe 7 (9R2)',
      localName: 'Trezor Safe 7 (4I4)',
      isConnected: jest.fn().mockResolvedValue(false),
      connect: jest.fn().mockResolvedValue(createConnectedDevice('safe-7')),
    };
    const staleDevice = {
      ...createConnectedDevice('safe-7'),
      name: 'Trezor Safe 7 (9R2)',
      localName: 'Trezor Safe 7 (9R2)',
      isConnected: jest.fn().mockResolvedValue(false),
      connect: jest.fn(),
    };
    const manager = {
      startDeviceScan: jest.fn((_services, _options, listener) => {
        listener(null, scannedDevice);
      }),
      stopDeviceScan: jest.fn(),
      devices: jest.fn().mockResolvedValue([staleDevice]),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await transport.scan();
    await transport.connect('safe-7');

    expect(scannedDevice.connect).not.toHaveBeenCalled();
    expect(staleDevice.connect).toHaveBeenCalledWith({
      requestMTU: 247,
      timeout: 5000,
    });
    expect(manager.connectToDevice).not.toHaveBeenCalled();
  });

  it('uses connectedDevices before direct connectToDevice when no cached device exists', async () => {
    const connectedDevice = {
      ...createConnectedDevice('safe-7'),
      isConnected: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      devices: jest.fn().mockResolvedValue([]),
      connectedDevices: jest.fn().mockResolvedValue([connectedDevice]),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await transport.connect('safe-7');

    expect(manager.connectedDevices).toHaveBeenCalledWith([TREZOR_BLE_UUIDS.service]);
    expect(manager.connectToDevice).not.toHaveBeenCalled();
  });

  it('reports missing BLE write characteristic as standard TransportError', async () => {
    const device = createConnectedDevice('safe-7', [
      createCharacteristic(TREZOR_BLE_UUIDS.notify),
      createCharacteristic(TREZOR_BLE_UUIDS.push),
    ]);
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(device),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.connect('safe-7')).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'Trezor BLE write characteristic not found.',
    });
  });

  it('reports a stale OS bond (GATT_INSUF_AUTHENTICATION) as BleBondInvalid', async () => {
    const bondError = Object.assign(new Error('Device safe-7 was disconnected'), {
      errorCode: 201,
      attErrorCode: 5,
      reason: "Disconnected from MAC='XX' with status 5 (GATT_INSUF_AUTHENTICATION)",
    });
    const writeCharacteristic = {
      ...createCharacteristic(TREZOR_BLE_UUIDS.write),
      writeWithResponse: jest.fn().mockRejectedValue(bondError),
    };
    const device = createConnectedDevice('safe-7', [
      writeCharacteristic,
      createCharacteristic(TREZOR_BLE_UUIDS.notify),
      createCharacteristic(TREZOR_BLE_UUIDS.push),
    ]);
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(device),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.connect('safe-7')).rejects.toMatchObject({
      code: HardwareErrorCode.BleBondInvalid,
    });
  });

  it('reports unsupported BLE push monitor as standard TransportError', async () => {
    const writeCharacteristic = createCharacteristic(TREZOR_BLE_UUIDS.write);
    const notifyCharacteristic = createCharacteristic(TREZOR_BLE_UUIDS.notify);
    const pushCharacteristic = {
      uuid: TREZOR_BLE_UUIDS.push,
      writeWithResponse: jest.fn().mockResolvedValue({}),
      writeWithoutResponse: jest.fn().mockResolvedValue({}),
    };
    const device = createConnectedDevice('safe-7', [
      writeCharacteristic,
      notifyCharacteristic,
      pushCharacteristic,
    ]);
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(device),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.connect('safe-7')).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'Trezor BLE push characteristic does not support monitor.',
    });
  });

  it('rejects pending BLE reads on reset with standard DeviceDisconnected', async () => {
    const device = createConnectedDevice('safe-7');
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(device),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });
    await transport.connect('safe-7');

    const pendingRead = transport.read('safe-7');
    transport.reset();

    await expect(pendingRead).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceDisconnected,
      message: 'Trezor BLE transport reset',
    });
  });

  it('cleans stale GATT state and reconnects without MTU when Android cancels MTU connect', async () => {
    const operationCancelled = Object.assign(new Error('Operation was cancelled'), {
      errorCode: 2,
    });
    const freshDevice = createConnectedDevice('safe-7');
    const cachedDevice = {
      ...createConnectedDevice('safe-7'),
      isConnected: jest.fn().mockResolvedValue(false),
      connect: jest.fn().mockRejectedValueOnce(operationCancelled),
    };
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      devices: jest.fn().mockResolvedValue([cachedDevice]),
      connectToDevice: jest.fn().mockResolvedValue(freshDevice),
      cancelDeviceConnection: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await transport.connect('safe-7');

    expect(cachedDevice.connect).toHaveBeenNthCalledWith(1, {
      requestMTU: 247,
      timeout: 5000,
    });
    expect(manager.cancelDeviceConnection).toHaveBeenCalledWith('safe-7');
    expect(manager.connectToDevice).toHaveBeenCalledWith('safe-7');
    expect(cachedDevice.connect).toHaveBeenCalledTimes(1);
  });

  it('reports cached device GATT disconnect during no-MTU fallback as DeviceDisconnected', async () => {
    const operationCancelled = Object.assign(new Error('Operation was cancelled'), {
      errorCode: 2,
    });
    const gattDisconnected = Object.assign(new Error('Device safe-7 was disconnected'), {
      errorCode: 201,
      androidErrorCode: 133,
      reason: "Disconnected from MAC='XX:XX:XX:XX:XX:XX' with status 133 (GATT_ERROR)",
    });
    const cachedDevice = {
      ...createConnectedDevice('safe-7'),
      isConnected: jest.fn().mockResolvedValue(false),
      connect: jest.fn().mockRejectedValueOnce(operationCancelled),
    };
    const manager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      devices: jest.fn().mockResolvedValue([cachedDevice]),
      connectToDevice: jest.fn().mockRejectedValue(gattDisconnected),
      cancelDeviceConnection: jest.fn(),
      writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({}),
      writeCharacteristicWithoutResponseForDevice: jest.fn().mockResolvedValue({}),
      monitorCharacteristicForDevice: jest.fn(() => ({ remove: jest.fn() })),
      destroy: jest.fn(),
    };
    const transport = new RNBlePlxTrezorTransport({ manager });

    await expect(transport.connect('safe-7')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceDisconnected,
      message: 'Trezor BLE device disconnected during connect: safe-7',
    });
  });
});
