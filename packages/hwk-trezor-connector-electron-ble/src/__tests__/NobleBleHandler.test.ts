import { EventEmitter } from 'events';
import { TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';

import { NobleBleHandler } from '../NobleBleHandler';
import type { NoblePeripheralLike } from '../NobleBleHandler';
import { TrezorElectronBleTransport } from '../TrezorElectronBleTransport';
import { initTrezorBleSupport } from '../main';
import { TREZOR_BLE_CHANNELS } from '../constants';

import type { TrezorBleApi } from '../types/desktop-api';

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
    // Scan is UNFILTERED. noble's Windows backend applies a service-UUID filter
    // per received packet, and a Safe 7's ADV packet carries only its name (the
    // UUID is in the scan response), so a filtered scan drops every ADV packet
    // and the device looks undiscoverable while it is plainly on air.
    // allowDuplicates=true keeps liveness fresh.
    expect(noble.startScanningAsync).toHaveBeenCalledWith([], true);

    // A second poll reuses the running scan rather than restarting it.
    await handler.scan({ durationMs: 0 });
    expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);

    // Clear the idle-stop timer so it doesn't outlive the test.
    await handler.stopScan();
  });

  test('scan is unfiltered, so non-Trezor devices are filtered out here', async () => {
    // The unfiltered scan sees every BLE device in range; only Trezors may reach
    // the caller. Guards the JS-side filter that replaces the noble one.
    const trezor = new FakePeripheral('id-trezor', { localName: 'Trezor Safe 7 (8S9)' });
    const other = new FakePeripheral('id-other', { localName: 'Some Headphones' });
    const noble = new FakeNoble([trezor, other]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });

    const devices = await handler.scan({ durationMs: 0 });
    expect(devices.map(d => d.id)).toEqual(['id-trezor']);

    await handler.stopScan();
  });

  test('a connected device that stopped advertising still appears in scan results', async () => {
    // Field-verified behavior: a Safe 7 stops advertising while it holds a
    // link (bonding alone does not silence it). With keep-alive holding the
    // link for up to minutes, the scan cache ages the device out — so the one
    // device the user is actively using would vanish from the device list
    // unless connected devices are merged into the snapshot.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });

    await handler.scan({ durationMs: 0 });
    await handler.connect('id-1');

    // The link is up: the device no longer advertises...
    (noble as any).peripherals.length = 0;
    // ...and the discovery cache from the earlier scan is gone.
    await handler.stopScan();

    const devices = await handler.scan({ durationMs: 0 });
    expect(devices.map(d => ({ id: d.id, state: d.state }))).toEqual([
      { id: 'id-1', state: 'connected' },
    ]);

    await handler.disconnect('id-1');
    await handler.stopScan();
  });

  test('an explicitly passed serviceUuids filter is ignored, not forwarded to noble', async () => {
    // serviceUuids survives on the IPC options only so an older renderer stays
    // compatible; honouring it would reintroduce the Windows ADV-drop bug, so
    // the handler must discard it rather than pass it to startScanningAsync.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });

    const devices = await handler.scan({
      serviceUuids: [TREZOR_BLE_UUIDS.service],
      durationMs: 0,
    });

    expect(devices.map(d => d.id)).toEqual(['id-1']);
    expect(noble.startScanningAsync).toHaveBeenCalledWith([], true);

    await handler.stopScan();
  });

  test('connect falls back to connect-by-id when the device is not discoverable', async () => {
    // The regression this guards: a bonded Safe 7 STOPS ADVERTISING (it holds
    // the link and waits for the host), so after OS pairing it can never be
    // rediscovered by scanning. Connect must still reach it by id — noble's
    // native backends materialize the peripheral without any `discover`.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    // Empty: the device is NOT advertising, so no scan will ever surface it.
    const noble = new FakeNoble([]);
    (noble as any).connectAsync = jest.fn(async (id: string) => {
      expect(id).toBe('id-1');
      return peripheral;
    });
    const handler = new NobleBleHandler({ nobleFactory: () => noble as any });

    const result = await handler.connect('id-1');

    expect(result).toEqual({ id: 'id-1', name: 'Trezor Safe 7' });
    expect((noble as any).connectAsync).toHaveBeenCalledWith('id-1');
    expect(peripheral.discoverSomeServicesAndCharacteristicsAsync).toHaveBeenCalled();

    await handler.disconnect('id-1');
    // The fallback only fires after the scan window has elapsed (see
    // _connectInner: scanning first is what keeps macOS from hanging).
  }, 15_000);

  test('cancelPairing ends a connect still waiting on the OS pairing window', async () => {
    // Pairing happens inside connectAsync, so the device is not in _connected
    // yet. Before cancelPairing could abandon the attempt, cancelling left the
    // caller waiting out the full connect timeout — sized to the OS pairing
    // window, so on Windows it read as a hang.
    const peripheral = new FakePeripheral('id-1', { localName: 'Trezor Safe 7' });
    peripheral.connectAsync = jest.fn(
      () =>
        new Promise<void>(() => {
          // Never settles: the OS pairing dialog is still open.
        })
    );
    const noble = new FakeNoble([peripheral]);
    const handler = new NobleBleHandler({
      nobleFactory: () => noble as any,
      connectTimeoutMs: 60_000,
    });
    await handler.scan({ durationMs: 0 });

    const pending = handler.connect('id-1');
    const settled = pending.then(
      () => 'resolved',
      (error: Error) => error.message
    );
    // Let _connectInner get past its settle delay and into connectAsync.
    await new Promise(resolve => {
      setTimeout(resolve, 350);
    });

    await handler.cancelPairing();

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
      nobleFactory: () => noble as any,
      // Fires while connectAsync is in flight: _connectInner spends 300ms in
      // the settle delay first, and connectAsync itself takes 400ms more.
      connectTimeoutMs: 400,
    });
    await handler.scan({ durationMs: 0 }); // put the peripheral in the cache

    await expect(handler.connect('id-1')).rejects.toThrow(/timed out/);

    // Let the late connectAsync success and the abandoned-path teardown settle.
    await new Promise(resolve => {
      setTimeout(resolve, 700);
    });

    // The late success must NOT have been committed…
    await expect(handler.subscribe('id-1')).rejects.toThrow(/not connected/i);
    // …and the link it opened must have been torn down again.
    expect(peripheral.disconnectAsync).toHaveBeenCalled();
    expect(peripheral.state).toBe('disconnected');

    await handler.stopScan();
  }, 10_000);

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

  test('renderer transport → IPC → handler scan stays unfiltered end to end', async () => {
    // The regression this guards: the renderer transport used to send a
    // service-UUID filter over IPC, and the handler forwarded it to
    // noble.startScanningAsync. On Windows noble applies that filter per
    // received packet, and a Safe 7's ADV packet carries only its name — so
    // the JS-side Trezor filter never even saw the device. The full production
    // path must reach noble with NO native filter.
    const safe7 = new FakePeripheral('id-safe7', { localName: 'Trezor Safe 7' });
    const noble = new FakeNoble([safe7]);
    const ipcMain = new FakeIpcMain();
    const webContents = { send: () => undefined };

    const handle = initTrezorBleSupport(webContents, {
      ipcMain,
      nobleFactory: () => noble as any,
    });

    // Renderer-side bridge exactly as a preload would wire it: every call goes
    // through the IPC channel, nothing shortcuts to the handler.
    const invoke = (channel: string, ...args: any[]) => ipcMain.invoke(channel, ...args);
    const bridge = {
      scan: (options?: unknown) => invoke(TREZOR_BLE_CHANNELS.scan, options),
      stopScan: () => invoke(TREZOR_BLE_CHANNELS.stopScan),
      connect: (id: string) => invoke(TREZOR_BLE_CHANNELS.connect, id),
      disconnect: (id: string) => invoke(TREZOR_BLE_CHANNELS.disconnect, id),
      subscribe: (id: string) => invoke(TREZOR_BLE_CHANNELS.subscribe, id),
      unsubscribe: (id: string) => invoke(TREZOR_BLE_CHANNELS.unsubscribe, id),
      write: (id: string, hexData: string) => invoke(TREZOR_BLE_CHANNELS.write, id, hexData),
      checkAvailability: () => invoke(TREZOR_BLE_CHANNELS.availability),
      getDevice: (id: string) => invoke(TREZOR_BLE_CHANNELS.getDevice, id),
      readRssi: (id: string) => invoke(TREZOR_BLE_CHANNELS.readRssi, id),
      cancelPairing: () => invoke(TREZOR_BLE_CHANNELS.cancelPairing),
      onNotification: () => () => undefined,
      onDeviceDisconnected: () => () => undefined,
    } as unknown as TrezorBleApi;

    const transport = new TrezorElectronBleTransport({ bridge });
    const devices = await transport.scan(0);

    // The Safe 7 advertises no service UUID (name only), so it survives the
    // trip iff the native scan really ran unfiltered.
    expect(devices.map(d => d.id)).toEqual(['id-safe7']);
    expect(noble.startScanningAsync).toHaveBeenCalledWith([], true);

    await transport.stopScan();
    await handle.dispose();
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
    await handler.scan({ durationMs: 0 });
    const connecting = handler.connect(peripheral.id);
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
      await handler.scan({ durationMs: 0 });
      const connecting = handler.connect(peripheral.id);
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
    await expect(handler.scan()).rejects.toThrow('shutting down');
  });

  test('keeps native alive on renderer disposal and releases every recovered instance on quit', async () => {
    const original = Object.assign(new FakeNoble(), { stop: jest.fn() });
    const recovered = Object.assign(new FakeNoble(), { stop: jest.fn() });
    const factory = jest.fn().mockReturnValueOnce(original).mockReturnValue(recovered);
    const handler = new NobleBleHandler({ nobleFactory: factory });
    await handler.init();
    original.state = 'unsupported';
    original.startScanningAsync.mockRejectedValueOnce(new Error('adapter unavailable'));
    await handler.scan();
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
    const scanning = handler.scan();
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
    const support = initTrezorBleSupport(
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
