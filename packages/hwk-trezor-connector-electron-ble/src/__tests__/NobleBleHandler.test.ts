import { EventEmitter } from 'events';
import { TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';

import { NobleBleHandler, type NobleBleHandlerOptions } from '../NobleBleHandler';
import { initTrezorBleSupport } from '../main';
import { TREZOR_BLE_CHANNELS } from '../constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

class FakeCharacteristic extends EventEmitter {
  subscribeAsync = jest.fn(async () => undefined);

  unsubscribeAsync = jest.fn(async () => undefined);

  writeAsync = jest.fn(async (_data: Buffer, _withoutResponse: boolean) => undefined);

  constructor(public readonly uuid: string) {
    super();
  }
}

class FakePeripheral extends EventEmitter {
  state = 'disconnected';

  rssi = -55;

  connectAsync = jest.fn(async () => {
    this.state = 'connected';
  });

  disconnectAsync = jest.fn(async () => {
    this.state = 'disconnected';
    this.emit('disconnect');
  });

  writeChar = new FakeCharacteristic(TREZOR_BLE_UUIDS.write);

  notifyChar = new FakeCharacteristic(TREZOR_BLE_UUIDS.notify);

  discoverSomeServicesAndCharacteristicsAsync = jest.fn(async () => ({
    characteristics: [this.writeChar, this.notifyChar],
  }));

  constructor(public readonly id: string, public readonly advertisement: { localName?: string }) {
    super();
  }
}

class FakeNoble extends EventEmitter {
  state = 'poweredOn';

  private readonly peripherals: FakePeripheral[];

  startScanningAsync = jest.fn(async () => {
    // Simulate discovery synchronously.
    for (const p of this.peripherals) this.emit('discover', p);
  });

  stopScanningAsync = jest.fn(async () => undefined);

  constructor(peripherals: FakePeripheral[] = []) {
    super();
    this.peripherals = peripherals;
  }
}

class FakeIpcMain {
  readonly handlers = new Map<string, (...args: any[]) => Promise<unknown> | unknown>();

  handle(
    channel: string,
    listener: (event: unknown, ...args: any[]) => Promise<unknown> | unknown
  ): void {
    this.handlers.set(channel, listener);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  invoke(channel: string, ...args: any[]): Promise<unknown> {
    const h = this.handlers.get(channel);
    if (!h) throw new Error(`No handler registered for ${channel}`);
    return Promise.resolve(h({} as unknown, ...args));
  }
}

describe('NobleBleHandler', () => {
  test('scan starts a continuous scan and returns the current snapshot', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });

    const devices = await handler.scan({ durationMs: 0 });
    expect(devices).toEqual([
      expect.objectContaining({ id: 'id-1', name: 'Trezor Safe 7', rssi: -55 }),
    ]);
    // Continuous scan uses allowDuplicates=true to keep liveness fresh.
    expect(noble.startScanningAsync).toHaveBeenCalledWith([TREZOR_BLE_UUIDS.service], true);

    // A second poll reuses the running scan rather than restarting it.
    await handler.scan({ durationMs: 0 });
    expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);

    // Clear the idle-stop timer so it doesn't outlive the test.
    await handler.stopScan();
  });

  test('connect discovers chars and write splits into chunks', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any, chunkSize: 100 });
    await handler.scan({ durationMs: 0 });

    await handler.connect('id-1');
    expect(peripheral.connectAsync).toHaveBeenCalled();
    expect(peripheral.discoverSomeServicesAndCharacteristicsAsync).toHaveBeenCalled();

    const hex = 'ab'.repeat(250); // 250 bytes → 3 packets at chunkSize 100
    await handler.write('id-1', hex);
    expect(peripheral.writeChar.writeAsync).toHaveBeenCalledTimes(3);
    // Every packet is padded to the full chunkSize — Trezor BLE firmware
    // expects fixed-size packets; a short final packet is dropped.
    const { calls } = peripheral.writeChar.writeAsync.mock;
    expect(calls[0][0].length).toBe(100);
    expect(calls[2][0].length).toBe(100);
    // last packet = 50 bytes of data (0xab) + 50 bytes of zero padding
    const last = calls[2][0];
    expect(last.subarray(0, 50).equals(Buffer.alloc(50, 0xab))).toBe(true);
    expect(last.subarray(50).equals(Buffer.alloc(50, 0x00))).toBe(true);
  });

  test('subscribe wires notification forwarding', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });
    await handler.scan({ durationMs: 0 });
    await handler.connect('id-1');

    const received: Array<[string, string]> = [];
    handler.setNotificationListener((id, hex) => received.push([id, hex]));
    await handler.subscribe('id-1');

    peripheral.notifyChar.emit('data', Buffer.from([0xde, 0xad, 0xbe, 0xef]), true);
    expect(received).toEqual([['id-1', 'deadbeef']]);
  });

  test('explicit disconnect does NOT fire unexpected-disconnect event', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });
    await handler.scan({ durationMs: 0 });
    await handler.connect('id-1');

    const onDisc = jest.fn();
    handler.setDisconnectedListener(onDisc);

    await handler.disconnect('id-1');
    expect(onDisc).not.toHaveBeenCalled();
  });

  test('unexpected peripheral disconnect fires the listener', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });
    await handler.scan({ durationMs: 0 });
    await handler.connect('id-1');

    const onDisc = jest.fn();
    handler.setDisconnectedListener(onDisc);

    // Simulate physical disconnect (peripheral emits 'disconnect' without an
    // explicit disconnect() call).
    peripheral.emit('disconnect');
    expect(onDisc).toHaveBeenCalledWith('id-1');
  });

  // Shared setup: a connected + subscribed handler on the Windows bonding path.
  async function windowsHandler(overrides: Partial<NobleBleHandlerOptions> = {}) {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({
      nobleFactory: () => noble as any,
      isWindows: true,
      ...overrides,
    });
    await handler.scan({ durationMs: 0 });
    await handler.connect('id-1');
    await handler.subscribe('id-1');
    return { handler, peripheral };
  }

  test('Windows: first write establishes the bond, then writes go direct', async () => {
    const { handler, peripheral } = await windowsHandler({ chunkSize: 100 });

    // A write-with-response that acks proves the bond is up → one call, no retry.
    await handler.write('id-1', 'ab'.repeat(10));
    expect(peripheral.writeChar.writeAsync).toHaveBeenCalledTimes(1);

    // Now paired: a 2-chunk follow-up takes the direct path (one call per chunk).
    peripheral.writeChar.writeAsync.mockClear();
    await handler.write('id-1', 'cd'.repeat(120));
    expect(peripheral.writeChar.writeAsync).toHaveBeenCalledTimes(2);
  });

  test('Windows: user-cancelled pairing (status: 3) aborts without retrying', async () => {
    const events: string[] = [];
    const { handler, peripheral } = await windowsHandler({ logger: e => events.push(e.event) });
    peripheral.writeChar.writeAsync.mockRejectedValue(new Error('GATT write failed, status: 3'));

    await expect(handler.write('id-1', 'abcd')).rejects.toThrow(/status: 3/);
    expect(peripheral.writeChar.writeAsync).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining(['win.pairing.begin', 'win.pairing.retry']));
  });

  test('Windows: retries transient write failures until the bond lands', async () => {
    const { handler, peripheral } = await windowsHandler({ windowsPairingAttemptTimeoutMs: 1 });
    let attempts = 0;
    peripheral.writeChar.writeAsync.mockImplementation(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('GATT write not ready, status: 7');
    });

    await handler.write('id-1', 'abcd');
    expect(attempts).toBe(3);
  });
});

describe('initTrezorBleSupport', () => {
  test('registers all request/response IPC channels and forwards push events', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const ipcMain = new FakeIpcMain();
    const sent: Array<[string, unknown[]]> = [];
    const webContents = {
      send: (channel: string, ...args: unknown[]) => sent.push([channel, args]),
    };

    const handle = initTrezorBleSupport(webContents, {
      ipcMain,
      nobleFactory: () => noble as any,
    });

    // All request channels were registered.
    for (const ch of [
      TREZOR_BLE_CHANNELS.scan,
      TREZOR_BLE_CHANNELS.stopScan,
      TREZOR_BLE_CHANNELS.connect,
      TREZOR_BLE_CHANNELS.disconnect,
      TREZOR_BLE_CHANNELS.write,
      TREZOR_BLE_CHANNELS.subscribe,
      TREZOR_BLE_CHANNELS.unsubscribe,
      TREZOR_BLE_CHANNELS.availability,
    ]) {
      expect(ipcMain.handlers.has(ch)).toBe(true);
    }

    // Drive the handlers through IPC.
    await ipcMain.invoke(TREZOR_BLE_CHANNELS.scan, { durationMs: 0 });
    await ipcMain.invoke(TREZOR_BLE_CHANNELS.connect, 'id-1');
    await ipcMain.invoke(TREZOR_BLE_CHANNELS.subscribe, 'id-1');

    peripheral.notifyChar.emit('data', Buffer.from([0x01]), true);
    expect(sent).toContainEqual([TREZOR_BLE_CHANNELS.notification, ['id-1', '01']]);

    peripheral.emit('disconnect');
    expect(sent).toContainEqual([TREZOR_BLE_CHANNELS.disconnected, ['id-1']]);

    await handle.dispose();
    expect(ipcMain.handlers.size).toBe(0);
  });
});
