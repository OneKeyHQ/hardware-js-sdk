import { EventEmitter } from 'events';

import { NobleBleHandler } from '../NobleBleHandler';
import { initThirdPartyBleSupport } from '../main';
import { THIRD_PARTY_BLE_CHANNELS } from '../constants';

import type { NoblePeripheralLike } from '../NobleBleHandler';

/* eslint-disable @typescript-eslint/no-explicit-any */

// A stand-in vendor. The handler holds no vendor knowledge, so these tests
// supply the same shape a real connector would send over IPC.
const TREZOR_BLE_UUIDS = {
  service: '8c000001-a59b-4d58-a9ad-073df69fa1b1',
  write: '8c000002-a59b-4d58-a9ad-073df69fa1b1',
  notify: '8c000003-a59b-4d58-a9ad-073df69fa1b1',
};

const PADDED_VENDOR = {
  vendor: 'padded-vendor',
  match: {
    serviceUuids: [TREZOR_BLE_UUIDS.service],
    namePatterns: ['\\bTrezor\\b', '\\bSafe\\s*7\\b|\\bT3W1\\b'],
  },
};

const PADDED_PROFILE = {
  vendor: PADDED_VENDOR.vendor,
  serviceUuid: TREZOR_BLE_UUIDS.service,
  writeUuid: TREZOR_BLE_UUIDS.write,
  notifyUuid: TREZOR_BLE_UUIDS.notify,
  write: { mode: 'padded' as const, chunkSize: 244, chunkDelayMs: 5 },
};

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

  constructor(
    public readonly id: string,
    public readonly advertisement: { localName?: string; serviceUuids?: string[] }
  ) {
    super();
  }
}

class FakeNoble extends EventEmitter {
  state = 'poweredOn';

  private readonly peripherals: FakePeripheral[];

  scanning = false;

  startScanningAsync = jest.fn(async () => {
    this.scanning = true;
    // Simulate discovery synchronously.
    for (const p of this.peripherals) this.emit('discover', p);
  });

  stopScanningAsync = jest.fn(async () => {
    this.scanning = false;
  });

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

async function connectedHandler() {
  const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
  const handler = new NobleBleHandler({ nobleFactory: () => new FakeNoble([peripheral]) });
  await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
  await handler.connect('id-1', PADDED_PROFILE);
  return { peripheral, handler };
}

describe('NobleBleHandler', () => {
  test('keeps one vendor GATT and unpadded frames separate from another padded profile', async () => {
    const serviceUuid = '13d63400-2c97-0004-0000-4c6564676572';
    const writeUuid = '13d63400-2c97-0004-0002-4c6564676572';
    const notifyUuid = '13d63400-2c97-0004-0001-4c6564676572';
    const ledger = new FakePeripheral('ledger-fixture', {
      localName: 'Ledger fixture',
      serviceUuids: [serviceUuid],
    });
    ledger.writeChar = new FakeCharacteristic(writeUuid);
    ledger.notifyChar = new FakeCharacteristic(notifyUuid);
    const trezor = new FakePeripheral('trezor-fixture', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([ledger, trezor]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    expect((await handler.scan(PADDED_VENDOR)).map(device => device.id)).toEqual([
      'trezor-fixture',
    ]);
    expect(
      (await handler.scan({ vendor: 'ledger', match: { serviceUuids: [serviceUuid] } })).map(
        device => device.id
      )
    ).toEqual(['ledger-fixture']);
    await handler.connect(ledger.id, {
      vendor: 'ledger',
      serviceUuid,
      writeUuid,
      notifyUuid,
      write: { mode: 'raw', maxLength: 255 },
    });
    await handler.write(ledger.id, '0800000000');
    expect(ledger.writeChar.writeAsync).toHaveBeenCalledWith(
      Buffer.from('0800000000', 'hex'),
      false
    );
    // The renderer negotiates the frame size per connection, so anything the
    // single-byte MTU field can express has to get through unpadded.
    await handler.write(ledger.id, '00'.repeat(21));
    expect(ledger.writeChar.writeAsync).toHaveBeenLastCalledWith(
      Buffer.from('00'.repeat(21), 'hex'),
      false
    );
    await expect(handler.write(ledger.id, '00'.repeat(256))).rejects.toThrow(
      'Invalid BLE frame for ledger'
    );
    await expect(handler.write(ledger.id, '0')).rejects.toThrow('Invalid BLE frame for ledger');
    await handler.dispose();
  });

  test('scan starts a continuous scan and returns the current snapshot', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });

    const devices = await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    expect(devices).toEqual([
      expect.objectContaining({ id: 'id-1', name: 'Trezor Safe 7', rssi: -55 }),
    ]);
    // Unfiltered: noble's Windows backend drops ADV packets that carry only a name.
    expect(noble.startScanningAsync).toHaveBeenCalledWith([], true);

    // A second poll reuses the running scan rather than restarting it.
    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);

    await handler.stopScan();
  });

  test('scan is unfiltered, so non-Trezor devices are filtered out here', async () => {
    const trezor = new FakePeripheral('id-trezor', { localName: 'Trezor Safe 7 (8S9)' });
    const other = new FakePeripheral('id-other', { localName: 'Some Headphones' });
    const noble = new FakeNoble([trezor, other]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });

    const devices = await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    expect(devices.map(d => d.id)).toEqual(['id-trezor']);

    await handler.stopScan();
  });

  test('a connected device that stopped advertising still appears in scan results', async () => {
    // A Safe 7 stops advertising while it holds a link.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });

    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    await handler.connect('id-1', PADDED_PROFILE);

    // The link is up: the device no longer advertises...
    (noble as any).peripherals.length = 0;
    // ...and the discovery cache from the earlier scan is gone.
    await handler.stopScan();

    const devices = await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    expect(devices.map(d => ({ id: d.id, state: d.state }))).toEqual([
      { id: 'id-1', state: 'connected' },
    ]);

    await handler.disconnect('id-1');
    await handler.stopScan();
  });

  test('a legacy serviceUuids-only scan still matches on the advertised uuid', async () => {
    // Older renderers send `serviceUuids` with no `match`. They keep working,
    // but only for devices that actually advertise the uuid.
    const peripheral = new FakePeripheral('id-1', {
      localName: 'anything',
      serviceUuids: [TREZOR_BLE_UUIDS.service],
    });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });

    const devices = await handler.scan({
      serviceUuids: [TREZOR_BLE_UUIDS.service],
      durationMs: 0,
    });

    expect(devices.map(d => d.id)).toEqual(['id-1']);
    await handler.stopScan();
  });

  test('connect falls back to connect-by-id when the device is not discoverable', async () => {
    // Regression: a bonded Safe 7 stops advertising, so connect must reach it by id.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    // Empty: the device is not advertising, so no scan will ever surface it.
    const noble = new FakeNoble([]);
    (noble as any).connectAsync = jest.fn(async (id: string) => {
      expect(id).toBe('id-1');
      return peripheral;
    });
    const handler = new NobleBleHandler({ nobleFactory: () => noble });

    const result = await handler.connect('id-1', PADDED_PROFILE);

    expect(result).toEqual({ id: 'id-1', name: 'Trezor Safe 7' });
    expect((noble as any).connectAsync).toHaveBeenCalledWith('id-1');
    expect(peripheral.discoverSomeServicesAndCharacteristicsAsync).toHaveBeenCalled();

    await handler.disconnect('id-1');
  }, 15_000);

  test('scoped scan release leaves another vendor discovery running', async () => {
    const noble = new FakeNoble([]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    await handler.scan({ vendor: 'first' });
    await handler.scan({ vendor: 'second' });
    await handler.stopScan('first');
    expect(noble.stopScanningAsync).not.toHaveBeenCalled();
    await handler.stopScan('second');
    expect(noble.stopScanningAsync).toHaveBeenCalledTimes(1);
  });

  test('targeted pairing cancellation preserves other vendors and same-vendor devices', async () => {
    const first = new FakePeripheral('first', { localName: 'Trezor Safe 7' });
    const second = new FakePeripheral('second', { localName: 'Trezor Safe 7' });
    const ledger = new FakePeripheral('ledger', { localName: 'Ledger' });
    const noble = new FakeNoble([first, second, ledger]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    await handler.scan({ ...PADDED_VENDOR });
    await handler.connect('first', PADDED_PROFILE);
    await handler.connect('second', PADDED_PROFILE);
    await handler.connect('ledger', { ...PADDED_PROFILE, vendor: 'ledger' });
    await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor, id: 'first' });
    expect(first.disconnectAsync).toHaveBeenCalled();
    expect(second.disconnectAsync).not.toHaveBeenCalled();
    expect(ledger.disconnectAsync).not.toHaveBeenCalled();
    await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor });
    expect(second.disconnectAsync).toHaveBeenCalled();
    expect(ledger.disconnectAsync).not.toHaveBeenCalled();
    await handler.disconnect('ledger');
  });

  test('cancelPairing ends a connect still waiting on the OS pairing window', async () => {
    // Pairing happens inside connectAsync, so the device is not in _connected yet.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    peripheral.connectAsync = jest.fn(
      () =>
        new Promise<void>(() => {
          // Never settles: the OS pairing dialog is still open.
        })
    );
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({
      nobleFactory: () => noble,
      connectTimeoutMs: 60_000,
    });
    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });

    const pending = handler.connect('id-1', PADDED_PROFILE);
    const settled = pending.then(
      () => 'resolved',
      (error: Error) => error.message
    );
    // Let _connectInner get past its settle delay and into connectAsync.
    await new Promise(resolve => {
      setTimeout(resolve, 350);
    });

    await handler.cancelPairing({ vendor: 'another-vendor' });
    expect(peripheral.disconnectAsync).not.toHaveBeenCalled();
    await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor, id: 'id-1' });
    await expect(settled).resolves.toMatch(/connect cancelled/);
  });

  test('a connect that outlives its timeout is torn down, not committed', async () => {
    // Promise.race only rejects the caller; noble's connectAsync keeps running.
    // If its late success were committed to _connected, the handler would hold
    // a GATT link nobody owns — and a linked Safe 7 stops advertising, so every
    // retry would dead-end until app restart.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    peripheral.connectAsync = jest.fn(async () => {
      // Resolves well after the caller's timeout below.
      await new Promise(resolve => {
        setTimeout(resolve, 400);
      });
      peripheral.state = 'connected';
    });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({
      nobleFactory: () => noble,
      // Fires while connectAsync is in flight: _connectInner spends 300ms in
      // the settle delay first, and connectAsync itself takes 400ms more.
      connectTimeoutMs: 400,
    });
    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 }); // put the peripheral in the cache

    await expect(handler.connect('id-1', PADDED_PROFILE)).rejects.toThrow(/timed out/);

    // Let the late connectAsync success and the abandoned-path teardown settle.
    await new Promise(resolve => {
      setTimeout(resolve, 700);
    });

    // The late success must not have been committed,
    await expect(handler.subscribe('id-1')).rejects.toThrow(/not connected/i);
    // and the link it opened must have been torn down again.
    expect(peripheral.disconnectAsync).toHaveBeenCalled();
    expect(peripheral.state).toBe('disconnected');

    await handler.stopScan();
  }, 10_000);

  test('connect discovers chars and write splits into chunks', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });

    // chunkSize travels with the connect profile, not the handler.
    await handler.connect('id-1', {
      ...PADDED_PROFILE,
      write: { ...PADDED_PROFILE.write, chunkSize: 100 },
    });
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
    const { peripheral, handler } = await connectedHandler();

    const received: Array<[string, string]> = [];
    handler.setNotificationListener((id, hex) => received.push([id, hex]));
    await handler.subscribe('id-1');

    peripheral.notifyChar.emit('data', Buffer.from([0xde, 0xad, 0xbe, 0xef]), true);
    expect(received).toEqual([['id-1', 'deadbeef']]);
  });

  test('explicit disconnect does NOT fire unexpected-disconnect event', async () => {
    const { peripheral, handler } = await connectedHandler();

    const onDisc = jest.fn();
    handler.setDisconnectedListener(onDisc);

    await handler.disconnect('id-1');
    expect(onDisc).not.toHaveBeenCalled();
  });

  test('unexpected peripheral disconnect fires the listener', async () => {
    const { peripheral, handler } = await connectedHandler();

    const onDisc = jest.fn();
    handler.setDisconnectedListener(onDisc);

    // Simulate physical disconnect (peripheral emits 'disconnect' without an
    // explicit disconnect() call).
    peripheral.emit('disconnect');
    expect(onDisc).toHaveBeenCalledWith('id-1');
  });

  test('a disconnect that returns after a reconnect leaves the new link alone', async () => {
    const { peripheral, handler } = await connectedHandler();

    // Hold the explicit disconnect open so a reconnect can commit a new entry
    // for the same id while the old flow is still awaiting.
    let releaseDisconnect: () => void = () => undefined;
    peripheral.disconnectAsync.mockImplementationOnce(
      () =>
        new Promise<undefined>(resolve => {
          releaseDisconnect = () => {
            peripheral.state = 'disconnected';
            resolve(undefined);
          };
        })
    );
    const staleDisconnect = handler.disconnect('id-1');

    await handler.connect('id-1', PADDED_PROFILE);
    const received: Array<[string, string]> = [];
    handler.setNotificationListener((id, hex) => received.push([id, hex]));
    await handler.subscribe('id-1');
    const onDisc = jest.fn();
    handler.setDisconnectedListener(onDisc);

    releaseDisconnect();
    await staleDisconnect;

    peripheral.notifyChar.emit('data', Buffer.from([0x01, 0x02]), true);
    expect(received).toEqual([['id-1', '0102']]);
    peripheral.emit('disconnect');
    expect(onDisc).toHaveBeenCalledWith('id-1');
  });
});

describe('initThirdPartyBleSupport', () => {
  test('registers all request/response IPC channels and forwards push events', async () => {
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const ipcMain = new FakeIpcMain();
    const sent: Array<[string, unknown[]]> = [];
    const webContents = {
      send: (channel: string, ...args: unknown[]) => sent.push([channel, args]),
    };

    const handle = initThirdPartyBleSupport(webContents, {
      ipcMain,
      nobleFactory: () => noble,
    });

    for (const ch of [
      THIRD_PARTY_BLE_CHANNELS.scan,
      THIRD_PARTY_BLE_CHANNELS.stopScan,
      THIRD_PARTY_BLE_CHANNELS.connect,
      THIRD_PARTY_BLE_CHANNELS.disconnect,
      THIRD_PARTY_BLE_CHANNELS.write,
      THIRD_PARTY_BLE_CHANNELS.subscribe,
      THIRD_PARTY_BLE_CHANNELS.unsubscribe,
      THIRD_PARTY_BLE_CHANNELS.availability,
    ]) {
      expect(ipcMain.handlers.has(ch)).toBe(true);
    }

    // The IPC seam must forward the scope rather than silently cancelling globally.
    const cancel = jest.spyOn(NobleBleHandler.prototype, 'cancelPairing').mockResolvedValueOnce();
    await ipcMain.invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, { vendor: 'trezor', id: 'id-1' });
    expect(cancel).toHaveBeenCalledWith({ vendor: 'trezor', id: 'id-1' });
    cancel.mockRestore();

    await ipcMain.invoke(THIRD_PARTY_BLE_CHANNELS.scan, { durationMs: 0 });
    await ipcMain.invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'id-1', PADDED_PROFILE);
    await ipcMain.invoke(THIRD_PARTY_BLE_CHANNELS.subscribe, 'id-1');

    peripheral.notifyChar.emit('data', Buffer.from([0x01]), true);
    expect(sent).toContainEqual([THIRD_PARTY_BLE_CHANNELS.notification, ['id-1', '01']]);

    peripheral.emit('disconnect');
    expect(sent).toContainEqual([THIRD_PARTY_BLE_CHANNELS.disconnected, ['id-1']]);

    await handle.dispose();
    expect(ipcMain.handlers.size).toBe(0);
  });
});

describe('Trezor BLE process shutdown', () => {
  afterEach(() => jest.useRealTimers());
  const flushCallbacks = () =>
    new Promise<void>(resolve => {
      setImmediate(resolve);
    });

  test('awaits native cancellation and caller disconnect before stopping Noble', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    let rejectConnect: (error: Error) => void = () => undefined;
    let finishDisconnect: () => void = () => undefined;
    const peripheral = Object.assign(new FakePeripheral('id-1', { localName: 'Trezor Safe 7' }), {
      cancelConnect: jest.fn(() => rejectConnect(new Error('connection canceled'))),
    });
    peripheral.connectAsync.mockImplementation(
      () =>
        new Promise((_, reject) => {
          peripheral.state = 'connecting';
          rejectConnect = reject;
        })
    );
    peripheral.disconnectAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          finishDisconnect = resolve;
        })
    );
    const native = Object.assign(new FakeNoble([peripheral]), { stop: jest.fn() });
    const handler = new NobleBleHandler({ nobleFactory: () => native });
    await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
    const connecting = handler.connect(peripheral.id, PADDED_PROFILE);
    const rejected = expect(connecting).rejects.toThrow('shutting down');
    await flushCallbacks();
    jest.advanceTimersByTime(300);
    await flushCallbacks();
    expect(peripheral.connectAsync).toHaveBeenCalledTimes(1);
    const disposing = handler.disposeForAppQuit();
    await flushCallbacks();
    expect(peripheral.cancelConnect).toHaveBeenCalledTimes(1);
    expect(peripheral.disconnectAsync).toHaveBeenCalledTimes(1);
    expect(native.stop).not.toHaveBeenCalled();
    finishDisconnect();
    await disposing;
    await rejected;
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['peripheral', 'direct'])(
    'does not touch native after a timed-out %s connect',
    async route => {
      jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
      let finishConnect: () => void = () => undefined;
      const peripheral = Object.assign(new FakePeripheral('id-1', { localName: 'Trezor Safe 7' }), {
        cancelConnect: jest.fn(),
      });
      peripheral.connectAsync.mockImplementation(
        () =>
          new Promise(resolve => {
            peripheral.state = 'connecting';
            finishConnect = resolve;
          })
      );
      const connectAsync = jest.fn(
        () =>
          new Promise<NoblePeripheralLike>(resolve => {
            finishConnect = () => resolve(peripheral);
          })
      );
      const native = Object.assign(new FakeNoble(route === 'direct' ? [] : [peripheral]), {
        stop: jest.fn(),
        cancelConnect: jest.fn(),
        connectAsync,
      });
      const handler = new NobleBleHandler({ nobleFactory: () => native });
      await handler.scan({ ...PADDED_VENDOR, durationMs: 0 });
      const connecting = handler.connect(peripheral.id, PADDED_PROFILE);
      const rejected = expect(connecting).rejects.toThrow('shutting down');
      await flushCallbacks();
      jest.advanceTimersByTime(300);
      await flushCallbacks();
      if (route === 'direct') {
        jest.advanceTimersByTime(5000);
        await flushCallbacks();
      }
      expect(route === 'direct' ? connectAsync : peripheral.connectAsync).toHaveBeenCalledTimes(1);
      const disposing = handler.disposeForAppQuit();
      await flushCallbacks();
      expect(
        route === 'direct' ? native.cancelConnect : peripheral.cancelConnect
      ).toHaveBeenCalledTimes(1);
      expect(native.stop).not.toHaveBeenCalled();
      jest.advanceTimersByTime(3500);
      await disposing;
      const disconnects = peripheral.disconnectAsync.mock.calls.length;
      peripheral.state = 'connected';
      finishConnect();
      await flushCallbacks();
      await rejected;
      expect(peripheral.disconnectAsync).toHaveBeenCalledTimes(disconnects);
      expect(peripheral.discoverSomeServicesAndCharacteristicsAsync).not.toHaveBeenCalled();
      expect(native.stop).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test('does not create Noble on an unused handler and rejects reuse after dispose', async () => {
    const factory = jest.fn(() => new FakeNoble());
    const handler = new NobleBleHandler({ nobleFactory: factory });
    await handler.disposeForAppQuit();
    expect(factory).not.toHaveBeenCalled();
    await expect(handler.scan(PADDED_VENDOR)).rejects.toThrow('shutting down');
  });

  test('keeps native alive on renderer disposal and releases every recovered instance on quit', async () => {
    const original = Object.assign(new FakeNoble(), { stop: jest.fn() });
    const recovered = Object.assign(new FakeNoble(), { stop: jest.fn() });
    const factory = jest.fn().mockReturnValueOnce(original).mockReturnValue(recovered);
    const handler = new NobleBleHandler({ nobleFactory: factory });
    await handler.init();
    original.state = 'unsupported';
    original.startScanningAsync.mockRejectedValueOnce(new Error('adapter unavailable'));
    await handler.scan(PADDED_VENDOR);
    expect(factory).toHaveBeenCalledTimes(2);
    await handler.dispose();
    expect(original.stop).not.toHaveBeenCalled();
    expect(recovered.stop).not.toHaveBeenCalled();
    await handler.disposeForAppQuit();
    await handler.disposeForAppQuit();
    expect(original.stop).toHaveBeenCalledTimes(1);
    expect(recovered.stop).toHaveBeenCalledTimes(1);
    expect(original.listenerCount('discover')).toBe(0);
    expect(recovered.listenerCount('discover')).toBe(0);
  });

  test('cancels power-on waits without leaving a timer or listener', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const native = Object.assign(new FakeNoble(), { state: 'unknown', stop: jest.fn() });
    const handler = new NobleBleHandler({ nobleFactory: () => native });
    const initializing = handler.init();
    const rejected = expect(initializing).rejects.toThrow('shutting down');
    await handler.disposeForAppQuit();
    await rejected;
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(native.listenerCount('stateChange')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('does not recover or rearm scanning after a late scan failure during shutdown', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const native = new FakeNoble();
    let rejectScan: (error: Error) => void = () => undefined;
    native.startScanningAsync.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectScan = reject;
        })
    );
    const factory = jest.fn(() => native);
    const handler = new NobleBleHandler({ nobleFactory: factory });
    await handler.init();
    const scanning = handler.scan(PADDED_VENDOR);
    const rejected = expect(scanning).rejects.toThrow('shutting down');
    await Promise.resolve();
    await handler.disposeForAppQuit();
    native.state = 'unsupported';
    rejectScan(new Error('late failure'));
    await rejected;
    expect(factory).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('bounds a missing native stop-scan callback and lets the host release shared native', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const native = Object.assign(new FakeNoble(), { stop: jest.fn() });
    const ipcMain = new FakeIpcMain();
    const support = initThirdPartyBleSupport(
      { send: jest.fn() },
      { nobleFactory: () => native, ipcMain }
    );
    await support.handler.checkAvailability();
    native.stopScanningAsync.mockImplementation(() => new Promise(() => undefined));
    const releaseNoble = jest.fn();
    const disposing = support.disposeForAppQuit(releaseNoble);
    expect(ipcMain.handlers.size).toBe(0);
    jest.advanceTimersByTime(3500);
    await disposing;
    expect(releaseNoble).toHaveBeenCalledWith(native);
    expect(native.stop).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('reconnect scan ownership', () => {
  const flush = () => new Promise<void>(resolve => setImmediate(resolve));

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a reconnect finishing leaves another vendor discovery running', async () => {
    const peripheral = new FakePeripheral('reconnecting', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble();
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    try {
      const connection = handler.connect(peripheral.id, PADDED_PROFILE);
      await flush();
      jest.advanceTimersByTime(300);
      await flush();
      await handler.scan({ vendor: 'ledger' });
      noble.emit('discover', peripheral);
      await connection;
      expect(noble.scanning).toBe(true);
      expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);
      await handler.scan({ vendor: 'ledger' });
      expect(noble.scanning).toBe(true);
    } finally {
      await handler.dispose();
    }
  });

  test('cancel then reopen discovery cannot be stopped by the old scan timeout', async () => {
    const noble = Object.assign(new FakeNoble(), { connectAsync: jest.fn() });
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    try {
      const connection = handler.connect('offline', PADDED_PROFILE);
      const rejected = expect(connection).rejects.toThrow('connect cancelled');
      await flush();
      jest.advanceTimersByTime(300);
      await flush();
      await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor, id: 'offline' });
      await rejected;
      await handler.scan(PADDED_VENDOR);
      jest.advanceTimersByTime(5200);
      await flush();
      await handler.scan(PADDED_VENDOR);
      expect(noble.scanning).toBe(true);
      expect(noble.connectAsync).not.toHaveBeenCalled();
      expect(noble.listenerCount('discover')).toBe(1);
    } finally {
      await handler.dispose();
    }
  });

  test('a cancelled reconnect cannot start discovery after its settle delay', async () => {
    const noble = Object.assign(new FakeNoble(), { connectAsync: jest.fn() });
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    try {
      const connection = handler.connect('offline', PADDED_PROFILE);
      const rejected = expect(connection).rejects.toThrow('connect cancelled');
      await flush();
      await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor, id: 'offline' });
      await rejected;
      jest.advanceTimersByTime(300);
      await flush();
      expect(noble.startScanningAsync).not.toHaveBeenCalled();
      expect(noble.connectAsync).not.toHaveBeenCalled();
    } finally {
      await handler.dispose();
    }
  });

  test('targeted cancellation leaves another reconnect scan active', async () => {
    const second = new FakePeripheral('second', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble();
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    try {
      const firstConnection = handler.connect('first', PADDED_PROFILE);
      const rejected = expect(firstConnection).rejects.toThrow('connect cancelled');
      const secondConnection = handler.connect(second.id, PADDED_PROFILE);
      await flush();
      jest.advanceTimersByTime(300);
      await flush();
      await handler.cancelPairing({ vendor: PADDED_VENDOR.vendor, id: 'first' });
      await rejected;
      expect(noble.scanning).toBe(true);
      noble.emit('discover', second);
      await secondConnection;
      expect(noble.scanning).toBe(false);
      expect(noble.listenerCount('discover')).toBe(1);
    } finally {
      await handler.dispose();
    }
  });

  test('new discovery waits for an outstanding native stop to complete', async () => {
    const noble = new FakeNoble();
    let finishStop!: () => void;
    noble.stopScanningAsync.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishStop = () => {
            noble.scanning = false;
            resolve();
          };
        })
    );
    const handler = new NobleBleHandler({ nobleFactory: () => noble });
    try {
      await handler.scan(PADDED_VENDOR);
      const stopped = handler.stopScan(PADDED_VENDOR.vendor);
      await flush();
      const restarted = handler.scan({ vendor: 'ledger' });
      await flush();
      expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);
      finishStop();
      await stopped;
      await restarted;
      expect(noble.startScanningAsync).toHaveBeenCalledTimes(2);
      expect(noble.scanning).toBe(true);
    } finally {
      await handler.dispose();
    }
  });
});
