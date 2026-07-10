import { createCombinedConnector } from '../types/connector';
import { HardwareErrorCode, createHwkError } from '../types/errors';

import type {
  ConnectorDevice,
  ConnectorEventMap,
  ConnectorEventType,
  ConnectorSession,
  IConnector,
} from '../types/connector';
import type { ConnectionType } from '../types/device';
import type { UiResponseEvent } from '../events/ui-request';

/**
 * Minimal in-memory IConnector standing in for one transport (USB or BLE).
 * Records what it was asked to do so the combined-connector routing can be
 * asserted.
 */
class FakeConnector implements IConnector {
  readonly connectionType: ConnectionType;

  readonly connectCalls: Array<string | undefined> = [];

  readonly callCalls: Array<{ sessionId: string; method: string }> = [];

  readonly disconnectCalls: string[] = [];

  readonly cancelCalls: string[] = [];

  readonly uiResponses: UiResponseEvent[] = [];

  searchCalls = 0;

  resetCount = 0;

  knownCredentials: unknown[][] = [];

  private readonly devices: ConnectorDevice[];

  private readonly scanError?: Error;

  private readonly connectError?: Error;

  private readonly scanDelayMs: number;

  private readonly listeners = new Map<ConnectorEventType, Set<(data: unknown) => void>>();

  constructor(
    connectionType: ConnectionType,
    devices: ConnectorDevice[],
    options: {
      scanError?: Error;
      connectError?: Error;
      supportsCredentials?: boolean;
      scanDelayMs?: number;
    } = {}
  ) {
    this.connectionType = connectionType;
    this.devices = devices;
    this.scanError = options.scanError;
    this.connectError = options.connectError;
    this.scanDelayMs = options.scanDelayMs ?? 0;
    if (!options.supportsCredentials) {
      // Mimic a connector (e.g. Ledger) that has no credential concept.
      this.setKnownCredentials = undefined;
    }
  }

  async searchDevices(): Promise<ConnectorDevice[]> {
    this.searchCalls += 1;
    if (this.scanDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.scanDelayMs));
    }
    if (this.scanError) throw this.scanError;
    return this.devices;
  }

  async connect(deviceId?: string): Promise<ConnectorSession> {
    this.connectCalls.push(deviceId);
    if (this.connectError) throw this.connectError;
    if (
      deviceId &&
      !this.devices.some(device => device.connectId === deviceId || device.deviceId === deviceId)
    ) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: `${this.connectionType} device not found: ${deviceId}`,
      });
    }
    const sessionId = deviceId ?? this.devices[0]?.connectId ?? 'session';
    return {
      sessionId,
      deviceInfo: {
        vendor: 'trezor',
        connectId: sessionId,
        deviceId: sessionId,
        model: 'T3W1',
        firmwareVersion: '3.0.0',
        label: `via-${this.connectionType}`,
        connectionType: this.connectionType,
      },
    };
  }

  async disconnect(sessionId: string): Promise<void> {
    this.disconnectCalls.push(sessionId);
  }

  async call(sessionId: string, method: string): Promise<unknown> {
    this.callCalls.push({ sessionId, method });
    return { ok: true, via: this.connectionType };
  }

  async cancel(sessionId: string): Promise<void> {
    this.cancelCalls.push(sessionId);
  }

  uiResponse(response: UiResponseEvent): void {
    this.uiResponses.push(response);
  }

  on<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as (data: unknown) => void);
  }

  off<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (data: unknown) => void);
  }

  reset(): void {
    this.resetCount += 1;
    this.listeners.clear();
  }

  setKnownCredentials?(credentials: unknown[]): void {
    this.knownCredentials.push(credentials);
  }

  /** Test helper: simulate the transport emitting an event. */
  emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]): void {
    for (const handler of this.listeners.get(event) ?? []) handler(data);
  }

  /** Test helper: how many listeners are registered for an event. */
  listenerCount(event: ConnectorEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

const device = (connectId: string, extra: Partial<ConnectorDevice> = {}): ConnectorDevice => ({
  connectId,
  deviceId: connectId,
  name: 'Trezor Safe 7',
  model: 'T3W1',
  ...extra,
});

describe('createCombinedConnector', () => {
  test('merges devices from every transport and stamps connectionType', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    const devices = await combined.searchDevices();

    expect(devices).toEqual([
      expect.objectContaining({ connectId: 'usb-1', connectionType: 'usb' }),
      expect.objectContaining({ connectId: 'ble-1', connectionType: 'ble' }),
    ]);
  });

  test('prioritizes USB devices ahead of BLE in the merged list', async () => {
    // BLE connector listed first to prove the sort, not the input order, wins.
    const ble = new FakeConnector('ble', [device('ble-1'), device('ble-2')]);
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const combined = createCombinedConnector([ble, usb]);

    const devices = await combined.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['usb-1', 'ble-1', 'ble-2']);
  });

  test('a transport that fails to scan does not sink the others', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [], {
      scanError: new Error('bluetooth powered off'),
    });
    const combined = createCombinedConnector([usb, ble]);

    const devices = await combined.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['usb-1']);
  });

  test('returns shortly after USB transport finds devices', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')], {
      scanDelayMs: 1_000,
    });
    const combined = createCombinedConnector([usb, ble]);

    const startedAt = Date.now();
    const devices = await combined.searchDevices();

    expect(Date.now() - startedAt).toBeLessThan(600);
    expect(devices.map(d => d.connectId)).toEqual(['usb-1']);
  });

  test('can wait for BLE when the caller needs every transport', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')], {
      scanDelayMs: 400,
    });
    const combined = createCombinedConnector([usb, ble]);

    const devices = await combined.searchDevices({ waitForAll: true });

    expect(devices.map(d => d.connectId)).toEqual(['usb-1', 'ble-1']);
  });

  test('connect routes to the transport that owns the device', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    await combined.searchDevices();
    const session = await combined.connect('ble-1');

    expect(session.sessionId).toBe('ble-1');
    expect(ble.connectCalls).toEqual(['ble-1']);
    expect(usb.connectCalls).toEqual([]);
  });

  test('connect with no deviceId picks the prioritized (USB) device', async () => {
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const combined = createCombinedConnector([ble, usb]);

    const session = await combined.connect();

    expect(session.sessionId).toBe('usb-1');
    expect(usb.connectCalls).toEqual(['usb-1']);
    expect(ble.connectCalls).toEqual([]);
  });

  test('connect with no devices keeps DeviceNotFound', async () => {
    const usb = new FakeConnector('usb', []);
    const ble = new FakeConnector('ble', []);
    const combined = createCombinedConnector([usb, ble]);

    await expect(combined.connect()).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'Combined connector: no devices found',
    });
  });

  test('connect with explicit id tries transports directly when search was not called first', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    const session = await combined.connect('ble-1');

    expect(session.sessionId).toBe('ble-1');
    expect(usb.searchCalls).toBe(0);
    expect(ble.searchCalls).toBe(0);
    expect(usb.connectCalls).toEqual(['ble-1']);
    expect(ble.connectCalls).toEqual(['ble-1']);
  });

  test('connect by explicit BLE id is not blocked by slow BLE search', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')], {
      scanDelayMs: 300,
    });
    const combined = createCombinedConnector([usb, ble]);

    const session = await combined.connect('ble-1');

    expect(session.sessionId).toBe('ble-1');
    expect(usb.searchCalls).toBe(0);
    expect(ble.searchCalls).toBe(0);
    expect(usb.connectCalls).toEqual(['ble-1']);
    expect(ble.connectCalls).toEqual(['ble-1']);
  });

  test('connect with explicit id keeps DeviceNotFound when every transport is unavailable', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')], {
      connectError: createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'usb device not found: missing',
      }),
    });
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    await expect(combined.connect('missing')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'ble device not found: missing',
    });

    expect(usb.connectCalls).toEqual(['missing']);
    expect(ble.connectCalls).toEqual(['missing']);
  });

  test('connect by explicit id does not fall back after non-availability errors', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')], {
      connectError: new Error('pairing rejected'),
    });
    const ble = new FakeConnector('ble', [device('usb-1')]);
    const combined = createCombinedConnector([usb, ble]);

    await expect(combined.connect('usb-1')).rejects.toThrow('pairing rejected');

    expect(usb.connectCalls).toEqual(['usb-1']);
    expect(ble.connectCalls).toEqual([]);
  });

  test('call / cancel / disconnect route by sessionId to the owning transport', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    await combined.searchDevices();
    const session = await combined.connect('ble-1');
    await combined.call(session.sessionId, 'getFeatures', {});
    await combined.cancel(session.sessionId);
    await combined.disconnect(session.sessionId);

    expect(ble.callCalls).toEqual([{ sessionId: 'ble-1', method: 'getFeatures' }]);
    expect(ble.cancelCalls).toEqual(['ble-1']);
    expect(ble.disconnectCalls).toEqual(['ble-1']);
    expect(usb.callCalls).toEqual([]);
  });

  test('call on an unknown session throws', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const combined = createCombinedConnector([usb]);

    await expect(combined.call('nope', 'getFeatures', {})).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceDisconnected,
      message: 'Combined connector: session not found: nope',
    });
  });

  test('events from any transport fan in to a single combined listener', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    const onConnect = jest.fn();
    combined.on('device-connect', onConnect);

    usb.emit('device-connect', { device: device('usb-1', { connectionType: 'usb' }) });
    ble.emit('device-connect', { device: device('ble-1', { connectionType: 'ble' }) });

    expect(onConnect).toHaveBeenCalledTimes(2);
    expect(onConnect).toHaveBeenCalledWith({
      device: expect.objectContaining({ connectId: 'usb-1' }),
    });
    expect(onConnect).toHaveBeenCalledWith({
      device: expect.objectContaining({ connectId: 'ble-1' }),
    });
  });

  test('off detaches the forwarder from every transport', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    const handler = jest.fn();
    combined.on('device-disconnect', handler);
    expect(usb.listenerCount('device-disconnect')).toBe(1);
    expect(ble.listenerCount('device-disconnect')).toBe(1);

    combined.off('device-disconnect', handler);
    expect(usb.listenerCount('device-disconnect')).toBe(0);
    expect(ble.listenerCount('device-disconnect')).toBe(0);

    usb.emit('device-disconnect', { connectId: 'usb-1' });
    expect(handler).not.toHaveBeenCalled();
  });

  test('uiResponse broadcasts to every transport', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    const response = { type: 'ui-response', payload: '1234' } as unknown as UiResponseEvent;
    combined.uiResponse(response);

    expect(usb.uiResponses).toEqual([response]);
    expect(ble.uiResponses).toEqual([response]);
  });

  test('setKnownCredentials fans out only to transports that support it', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')], {
      supportsCredentials: true,
    });
    const ble = new FakeConnector('ble', [device('ble-1')], {
      supportsCredentials: true,
    });
    const combined = createCombinedConnector([usb, ble]);

    const creds = [{ credential: 'abc' }];
    combined.setKnownCredentials?.(creds);

    expect(usb.knownCredentials).toEqual([creds]);
    expect(ble.knownCredentials).toEqual([creds]);
  });

  test('setKnownCredentials is undefined when no transport supports credentials', () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    expect(combined.setKnownCredentials).toBeUndefined();
  });

  test('reset clears routing and resets every transport', async () => {
    const usb = new FakeConnector('usb', [device('usb-1')]);
    const ble = new FakeConnector('ble', [device('ble-1')]);
    const combined = createCombinedConnector([usb, ble]);

    await combined.searchDevices();
    await combined.connect('usb-1');
    combined.reset();

    expect(usb.resetCount).toBe(1);
    expect(ble.resetCount).toBe(1);
    // After reset the session map is empty, so call must report not-found.
    await expect(combined.call('usb-1', 'getFeatures', {})).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceDisconnected,
      message: 'Combined connector: session not found: usb-1',
    });
  });

  test('throws when constructed with no transports', () => {
    expect(() => createCombinedConnector([])).toThrow(/at least one connector/);
  });
});
