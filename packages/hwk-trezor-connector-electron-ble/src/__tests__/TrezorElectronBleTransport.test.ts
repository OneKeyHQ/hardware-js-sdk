import { Buffer } from 'buffer';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';
import { TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';

import { TrezorElectronBleConnector } from '../TrezorElectronBleConnector';
import { TrezorElectronBleTransport } from '../TrezorElectronBleTransport';

import type { TrezorBleApi } from '../types/desktop-api';

type NotificationHandler = (id: string, hex: string) => void;
type DisconnectHandler = (id: string) => void;

/** Fake `window.desktopApi.trezorBle` for unit tests. */
class FakeBridge implements TrezorBleApi {
  scan = jest.fn(async (_durationMs?: number) => [
    {
      id: 'BLE-1',
      name: 'Trezor Safe 7',
      rssi: -50,
      advertisedServiceUuids: [TREZOR_BLE_UUIDS.service],
    },
  ]);

  stopScan = jest.fn(async () => undefined);

  connect = jest.fn(async (id: string) => ({ id, name: 'Trezor Safe 7' }));

  disconnect = jest.fn(async (_id: string) => undefined);

  subscribe = jest.fn(async (_id: string) => undefined);

  unsubscribe = jest.fn(async (_id: string) => undefined);

  write = jest.fn(async (_id: string, _hex: string) => undefined);

  checkAvailability = jest.fn(async () => ({
    available: true,
    state: 'poweredOn',
    initialized: true,
  }));

  private readonly notif = new Set<NotificationHandler>();

  private readonly disc = new Set<DisconnectHandler>();

  onNotification = (handler: NotificationHandler): (() => void) => {
    this.notif.add(handler);
    return () => this.notif.delete(handler);
  };

  onDeviceDisconnected = (handler: DisconnectHandler): (() => void) => {
    this.disc.add(handler);
    return () => this.disc.delete(handler);
  };

  emitNotification(id: string, hex: string): void {
    for (const h of this.notif) h(id, hex);
  }

  emitDisconnect(id: string): void {
    for (const h of this.disc) h(id);
  }
}

describe('TrezorElectronBleTransport', () => {
  test('constructor reports missing Electron BLE bridge as standard BridgeNotFound', () => {
    try {
      new TrezorElectronBleTransport();
      throw new Error('expected constructor to throw');
    } catch (error) {
      expect(error).toMatchObject({
        code: HardwareErrorCode.BridgeNotFound,
        message:
          'TrezorElectronBleTransport: no bridge found — pass `bridge` or expose `window.desktopApi.trezorBle` from your Electron preload script',
      });
    }
  });

  test('connect subscribes and disconnect unsubscribes', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });

    await transport.connect('BLE-1');
    expect(bridge.connect).toHaveBeenCalledWith('BLE-1');
    expect(bridge.subscribe).toHaveBeenCalledWith('BLE-1');

    await transport.disconnect('BLE-1');
    expect(bridge.unsubscribe).toHaveBeenCalledWith('BLE-1');
    expect(bridge.disconnect).toHaveBeenCalledWith('BLE-1');
  });

  test('write forwards as hex', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    await transport.write('BLE-1', new Uint8Array([0x3f, 0x23, 0xaa]));
    expect(bridge.write).toHaveBeenCalledWith('BLE-1', '3f23aa');
  });

  test('read resolves with the next notification when one is already queued', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    bridge.emitNotification('BLE-1', 'deadbeef');
    const out = await transport.read('BLE-1');
    expect(Buffer.from(out).toString('hex')).toBe('deadbeef');
  });

  test('read awaits notification when queue empty', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    const pending = transport.read('BLE-1');
    bridge.emitNotification('BLE-1', 'cafe');
    const out = await pending;
    expect(Buffer.from(out).toString('hex')).toBe('cafe');
  });

  test('onDisconnect fires when bridge reports unexpected disconnect', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    const fired = jest.fn();
    transport.onDisconnect('BLE-1', fired);
    bridge.emitDisconnect('BLE-1');
    expect(fired).toHaveBeenCalledTimes(1);
  });

  test('disconnect failure path rejects pending reads with DeviceDisconnected', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    const pending = transport.read('BLE-1');
    bridge.emitDisconnect('BLE-1');
    await expect(pending).rejects.toMatchObject({ code: HardwareErrorCode.DeviceDisconnected });
  });

  test('reset tears down listeners and clears state', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    transport.reset();

    // After reset, reading without a connect should reject with not-connected
    await expect(transport.read('BLE-1')).rejects.toThrow(/not connected/);
  });
});

describe('TrezorElectronBleConnector', () => {
  test('enumerateDevices maps bridge.scan results to ConnectorDevice', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    const devices = await connector.searchDevices();
    expect(devices).toEqual([
      {
        connectId: 'BLE-1',
        deviceId: '',
        name: 'Trezor Safe 7',
        model: 'T3W1',
        connectionType: 'ble',
        rssi: -50,
        isConnectable: null,
        capabilities: { persistentDeviceIdentity: false },
        raw: {
          transport: 'electron-ble',
          descriptor: {
            id: 'BLE-1',
            name: 'Trezor Safe 7',
            rssi: -50,
            advertisedServiceUuids: [TREZOR_BLE_UUIDS.service],
          },
        },
      },
    ]);
  });

  test('enumerateDevices filters out non-Trezor BLE devices', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([
      {
        id: 'BLE-TREZOR',
        name: 'Unknown',
        rssi: -50,
        advertisedServiceUuids: [TREZOR_BLE_UUIDS.service.replace(/-/g, '')],
      },
      {
        id: 'BLE-ONEKEY',
        name: 'Trezor Safe 7',
        rssi: -45,
        advertisedServiceUuids: ['00000001-0000-1000-8000-00805f9b34fb'],
      },
      { id: 'BLE-LEDGER', name: 'Trezor Safe 7', rssi: -40 },
    ]);
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    const devices = await connector.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['BLE-TREZOR']);
  });

  test('logs filtered descriptor fields only when Electron BLE scan drops devices', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([
      {
        id: 'BLE-UNKNOWN',
        name: 'Unknown',
        localName: 'Unknown',
        rssi: -52,
        isConnectable: true,
      },
    ]);
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({
      transport,
      transportOptions: {
        bridge,
        logger: entry => logs.push({ event: entry.event, data: entry.data }),
      },
    });

    const devices = await connector.searchDevices();

    expect(devices).toEqual([]);
    expect(logs).toContainEqual({
      event: 'ble.connector.enumerate.filtered',
      data: {
        transport: 'electron-ble',
        descriptorCount: 1,
        filteredCount: 0,
        dropped: [
          {
            id: 'BLE-UNKNOWN',
            name: 'Unknown',
            localName: 'Unknown',
            rssi: -52,
            isConnectable: true,
            keys: ['id', 'isConnectable', 'localName', 'name', 'rssi'],
            matchesTrezorService: false,
            serviceUUIDs: undefined,
            serviceUuids: undefined,
            advertisedServiceUuids: undefined,
            serviceSolicitationUuids: undefined,
            txPowerLevel: undefined,
            manufacturerDataHex: undefined,
            serviceData: undefined,
            address: undefined,
            addressType: undefined,
            state: undefined,
          },
        ],
        kept: [],
      },
    });
  });

  test('does not log Electron BLE scan details when no devices are filtered', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([]);
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({
      transport,
      transportOptions: {
        bridge,
        logger: entry => logs.push({ event: entry.event, data: entry.data }),
      },
    });

    await expect(connector.searchDevices()).resolves.toEqual([]);

    expect(logs.some(log => log.event === 'ble.connector.enumerate.filtered')).toBe(false);
  });

  test('createByteTransport.read receives bytes from emitted notifications', async () => {
    const bridge = new FakeBridge();
    const transport = new TrezorElectronBleTransport({ bridge });
    await transport.connect('BLE-1');

    bridge.emitNotification('BLE-1', '01020304');
    const data = await transport.read('BLE-1');
    expect(Buffer.from(data).toString('hex')).toBe('01020304');
  });

  test('connect by stale BLE connectId reports DeviceNotFound', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([]);
    bridge.connect.mockRejectedValueOnce(new Error('remote BLE device not found'));
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    await expect(connector.connect('BLE-STALE')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'Trezor BLE device not found: BLE-STALE',
    });
  });

  // The user stopping the flow is not a connect failure: cancelPairing abandons
  // the in-flight connect, and that must not read as an unreachable device.
  test('a cancelled pairing reports BlePairingCancelled', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([]);
    bridge.connect.mockRejectedValueOnce(new Error('connect cancelled: BLE-1'));
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    await expect(connector.connect('BLE-1')).rejects.toMatchObject({
      code: HardwareErrorCode.BlePairingCancelled,
    });
  });

  // noble drops the real CoreBluetooth reason, so a GATT "connection failed"
  // and a connect timeout both collapse to one generic BleConnectFailed.
  test('connect "connection failed" reports BleConnectFailed', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([]);
    bridge.connect.mockRejectedValueOnce(new Error('connection failed'));
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    await expect(connector.connect('BLE-1')).rejects.toMatchObject({
      code: HardwareErrorCode.BleConnectFailed,
    });
  });

  test('connect timeout reports BleConnectFailed', async () => {
    const bridge = new FakeBridge();
    bridge.scan.mockResolvedValueOnce([]);
    bridge.connect.mockRejectedValueOnce(new Error('connect timed out after 31000ms'));
    const transport = new TrezorElectronBleTransport({ bridge });
    const connector = new TrezorElectronBleConnector({ transport });

    await expect(connector.connect('BLE-2')).rejects.toMatchObject({
      code: HardwareErrorCode.BleConnectFailed,
    });
  });
});
