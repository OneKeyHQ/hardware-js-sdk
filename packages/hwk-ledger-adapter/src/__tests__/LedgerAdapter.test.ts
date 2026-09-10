import {
  DEVICE,
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  createHardwareInteractionId,
  deriveDeviceFingerprint,
  parseHardwareRuntimeId,
  serializeConnectorError,
} from '@onekeyfe/hwk-adapter-core';

import { LedgerAdapter } from '../adapter/LedgerAdapter';
import { ERROR_TAG } from '../errors';

import type {
  ConnectorDevice,
  ConnectorEventMap,
  ConnectorEventType,
  ConnectorSession,
  IConnector,
} from '@onekeyfe/hwk-adapter-core';

function createMockConnector(): IConnector & {
  _handlers: Map<string, Set<(...args: unknown[]) => void>>;
  _emit: <K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]) => void;
  // Tests configure this with raw payloads / rejections; `call` wraps it into
  // the ConnectorCallResult contract (success:false instead of throwing).
  callImpl: jest.Mock;
} {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  const callImpl = jest.fn().mockResolvedValue({});

  const connector = {
    callImpl,
    _handlers: handlers,
    _emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]) {
      const set = handlers.get(event);
      if (set) {
        for (const handler of set) {
          handler(data);
        }
      }
    },

    connectionType: 'usb' as const,

    searchDevices: jest.fn().mockResolvedValue([
      {
        connectId: 'dev-1',
        deviceId: 'dev-1',
        name: 'Nano X',
        model: 'nanoX',
      } as ConnectorDevice,
    ]),

    connect: jest.fn().mockResolvedValue({
      sessionId: 'session-abc',
      deviceInfo: {
        vendor: 'ledger',
        model: 'nanoX',
        firmwareVersion: 'unknown',
        deviceId: 'dev-1',
        connectId: 'dev-1',
        connectionType: 'usb',
      },
    } as ConnectorSession),

    disconnect: jest.fn().mockResolvedValue(undefined),

    // Wraps callImpl into the ConnectorCallResult contract: device failures
    // resolve as { success:false, error } rather than rejecting.
    call: jest.fn(async (sessionId: string, method: string, params: unknown) => {
      try {
        const payload = await callImpl(sessionId, method, params);
        return { success: true, payload };
      } catch (error) {
        return { success: false, error: serializeConnectorError(error) };
      }
    }),

    cancel: jest.fn().mockResolvedValue(undefined),

    uiResponse: jest.fn(),

    on: jest.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    }),

    off: jest.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    }),

    reset: jest.fn(),

    configure: jest.fn().mockResolvedValue(undefined),
  };

  return connector;
}

async function waitForCondition(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    if (condition()) return;
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
}

describe('LedgerAdapter', () => {
  let adapter: LedgerAdapter;
  let connector: ReturnType<typeof createMockConnector>;

  beforeEach(async () => {
    jest.clearAllMocks();
    connector = createMockConnector();
    adapter = new LedgerAdapter(connector);
    // Auto-reply granted=true for permission requests so tests that don't
    // explicitly exercise the permission flow proceed normally.
    adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
        payload: { granted: true },
      });
    });
  });

  it('should have vendor set to "ledger"', () => {
    expect(adapter.vendor).toBe('ledger');
  });

  it('does not let a cancelled scan select or connect for a newer acquire', async () => {
    Object.defineProperty(connector, 'connectionType', { value: 'ble' });
    let finishOldScan!: (devices: ConnectorDevice[]) => void;
    let finishNewScan!: (devices: ConnectorDevice[]) => void;
    connector.searchDevices
      .mockReturnValueOnce(
        new Promise<ConnectorDevice[]>(resolve => {
          finishOldScan = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise<ConnectorDevice[]>(resolve => {
          finishNewScan = resolve;
        })
      );
    const select = jest.fn();
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      select(event.payload.extra);
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { sdkConnectId: 'dev-1', requestId: event.payload.requestId },
      });
    });
    const oldOperation = adapter.acquireInteraction('', { extra: { dbDeviceId: 'old' } });
    await waitForCondition(() => connector.searchDevices.mock.calls.length === 1);
    adapter.cancel();
    await expect(oldOperation).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    const newOperation = adapter.acquireInteraction('', { extra: { dbDeviceId: 'new' } });
    await waitForCondition(() => connector.searchDevices.mock.calls.length === 2);
    const devices: ConnectorDevice[] = [
      { connectId: 'dev-1', deviceId: 'dev-1', name: 'Nano X', model: 'nanoX' },
    ];
    finishOldScan(devices);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(select).not.toHaveBeenCalled();
    expect(connector.connect).not.toHaveBeenCalled();
    finishNewScan(devices);
    const result = await newOperation;
    expect(result.success).toBe(true);
    expect(select.mock.calls).toEqual([[{ dbDeviceId: 'new' }]]);
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.callImpl).not.toHaveBeenCalled();
    if (result.success) await adapter.releaseInteraction(result.payload);
  });

  it.each(['known-ble', 'stale-ble', 'unbound-ble', 'targeted-usb'])(
    'acquires and pins an operation target without probing the wallet (%s)',
    async scenario => {
      const isBle = scenario !== 'targeted-usb';
      if (isBle) Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      connector.searchDevices.mockResolvedValue([
        {
          connectId: 'other-device',
          deviceId: 'other-device',
          name: 'Other Ledger',
          model: 'nanoX',
        },
        { connectId: 'dev-1', deviceId: 'dev-1', name: 'Nano X', model: 'nanoX' },
      ]);
      if (scenario === 'stale-ble') {
        connector.connect.mockRejectedValueOnce(
          Object.assign(new Error('No longer advertising'), {
            _tag: ERROR_TAG.DeviceNotAdvertising,
          })
        );
      }
      const select = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        select();
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { sdkConnectId: 'dev-1', requestId: event.payload.requestId },
        });
      });
      const acquired = await adapter.acquireInteraction('', {
        knownConnections:
          scenario === 'unbound-ble'
            ? []
            : [
                {
                  transport: isBle ? 'ble' : 'usb',
                  connectId: scenario === 'stale-ble' ? 'old-ble' : 'dev-1',
                },
              ],
        extra: { dbDeviceId: 'ledger-db' },
      });
      expect(acquired.success).toBe(true);
      expect(select).toHaveBeenCalledTimes(
        scenario === 'stale-ble' || scenario === 'unbound-ble' ? 1 : 0
      );
      expect(connector.connect).toHaveBeenLastCalledWith('dev-1');
      expect(connector.connect).not.toHaveBeenCalledWith('other-device');
      expect(connector.callImpl).not.toHaveBeenCalled();
      if (scenario === 'known-ble') expect(connector.searchDevices).not.toHaveBeenCalled();
      if (acquired.success) {
        const address = '0x1111111111111111111111111111111111111111';
        connector.callImpl.mockResolvedValue({ address });
        const result = await adapter.evmGetAddress(
          acquired.payload,
          deriveDeviceFingerprint(address),
          { path: "m/44'/60'/0'/0/0" }
        );
        expect(result.success).toBe(true);
        expect(connector.callImpl).toHaveBeenCalledTimes(2);
        await adapter.releaseInteraction(acquired.payload);
      }
    }
  );

  describe('interaction BLE binding', () => {
    async function acquireBinding() {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { sdkConnectId: 'dev-1', requestId: event.payload.requestId },
        });
      });
      const acquired = await adapter.acquireInteraction('', {
        knownConnections: [],
        extra: { dbDeviceId: 'binding-record' },
      });
      if (!acquired.success) throw new Error('Expected acquisition to succeed');
      return acquired.payload;
    }

    it.each(['business', 'fingerprint'] as const)(
      'publishes the original selection once after %s verification',
      async method => {
        const verified = jest.fn();
        adapter.on(DEVICE.LEDGER_CONNECTION_VERIFIED, verified);
        const interactionId = await acquireBinding();
        expect(verified).not.toHaveBeenCalled();
        const address = '0x1111111111111111111111111111111111111111';
        const fingerprint = deriveDeviceFingerprint(address);
        connector.callImpl.mockResolvedValue({ address });
        const verify = () =>
          method === 'business'
            ? adapter.evmGetAddress(interactionId, fingerprint, {
                path: "m/44'/60'/0'/0/0",
                extra: { dbDeviceId: 'must-not-replace-original-record' },
              })
            : adapter.getChainFingerprint(interactionId, fingerprint, 'evm');
        expect((await verify()).success).toBe(true);
        expect((await verify()).success).toBe(true);
        expect(verified).toHaveBeenCalledTimes(1);
        expect(verified).toHaveBeenCalledWith({
          type: DEVICE.LEDGER_CONNECTION_VERIFIED,
          payload: {
            previousConnectId: expect.any(String),
            connectId: 'dev-1',
            chain: 'evm',
            fingerprint,
            extra: { dbDeviceId: 'binding-record' },
            selectionRequestId: expect.any(String),
          },
        });
        await adapter.releaseInteraction(interactionId);
      }
    );

    it('does not bind on an unchecked fingerprint read or mismatch', async () => {
      const verified = jest.fn();
      adapter.on(DEVICE.LEDGER_CONNECTION_VERIFIED, verified);
      const interactionId = await acquireBinding();
      connector.callImpl.mockResolvedValue({ address: 'synthetic-address' });
      expect((await adapter.getChainFingerprint(interactionId, '', 'evm')).success).toBe(true);
      expect(
        await adapter.getChainFingerprint(interactionId, 'wrong-fingerprint', 'evm')
      ).toMatchObject({ success: false, payload: { code: HardwareErrorCode.DeviceMismatch } });
      expect(verified).not.toHaveBeenCalled();
      await adapter.releaseInteraction(interactionId);
    });

    it.each(['cancel', 'release', 'reset', 'disconnect'] as const)(
      'discards a pending binding after %s',
      async action => {
        const verified = jest.fn();
        adapter.on(DEVICE.LEDGER_CONNECTION_VERIFIED, verified);
        const interactionId = await acquireBinding();
        if (action === 'cancel') adapter.cancel(interactionId);
        else if (action === 'release') await adapter.releaseInteraction(interactionId);
        else if (action === 'disconnect')
          connector._emit('device-disconnect', { connectId: 'dev-1' });
        else adapter.resetState();
        const address = '0x1111111111111111111111111111111111111111';
        connector.callImpl.mockResolvedValue({ address });
        await adapter.getChainFingerprint(interactionId, deriveDeviceFingerprint(address), 'evm');
        expect(verified).not.toHaveBeenCalled();
        if (action === 'cancel') await adapter.releaseInteraction(interactionId);
      }
    );
  });

  it('routes genuine check through a short-lived relay and restores defaults', async () => {
    const relayUrl = 'wss://attestation.onekey.test/session/opaque-token';
    connector.callImpl.mockResolvedValueOnce({
      isGenuine: true,
      deviceId: 'ab'.repeat(32),
    });

    const result = await adapter.verifyDeviceAuthenticity('dev-1', {
      ledgerGenuineCheckWebSocketUrl: relayUrl,
    });

    expect(connector.configure).toHaveBeenNthCalledWith(1, {
      ledgerGenuineCheckWebSocketUrl: relayUrl,
    });
    expect(connector.callImpl).toHaveBeenCalledWith('session-abc', 'getDeviceGenuineCheck', {});
    expect(connector.configure).toHaveBeenNthCalledWith(2, {
      ledgerGenuineCheckWebSocketUrl: undefined,
    });
    expect(result).toMatchObject({
      success: true,
      payload: {
        vendor: 'ledger',
        verified: true,
        deviceId: 'ab'.repeat(32),
      },
    });
  });

  it('does not expose attacker-controlled identity fields when Ledger is not genuine', async () => {
    connector.callImpl.mockResolvedValueOnce({
      isGenuine: false,
      deviceId: 'ab'.repeat(32),
    });

    const result = await adapter.verifyDeviceAuthenticity('dev-1');

    expect(result).toEqual({
      success: true,
      payload: {
        vendor: 'ledger',
        verified: false,
      },
    });
  });

  it('resets the connector if restoring the official Ledger endpoint fails', async () => {
    const relayUrl = 'wss://attestation.onekey.test/session/opaque-token';
    connector.configure
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offscreen bridge unavailable'));
    connector.callImpl.mockResolvedValueOnce({
      isGenuine: true,
      deviceId: 'ab'.repeat(32),
    });

    const result = await adapter.verifyDeviceAuthenticity('dev-1', {
      ledgerGenuineCheckWebSocketUrl: relayUrl,
    });

    expect(result.success).toBe(true);
    expect(connector.reset).toHaveBeenCalledTimes(1);
  });

  it('serializes complete one-shot Ledger relay lifecycles', async () => {
    const relayOne = 'wss://attestation.onekey.test/session/relay-one';
    const relayTwo = 'wss://attestation.onekey.test/session/relay-two';
    let resolveFirstCheck: (value: { isGenuine: boolean; deviceId: string }) => void = () =>
      undefined;
    connector.callImpl
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirstCheck = resolve;
        })
      )
      .mockResolvedValueOnce({
        isGenuine: true,
        deviceId: 'bb'.repeat(32),
      });

    const first = adapter.verifyDeviceAuthenticity('dev-1', {
      ledgerGenuineCheckWebSocketUrl: relayOne,
    });
    await waitForCondition(
      () =>
        connector.callImpl.mock.calls.filter(call => call[1] === 'getDeviceGenuineCheck').length ===
        1
    );
    const second = adapter.verifyDeviceAuthenticity('dev-1', {
      ledgerGenuineCheckWebSocketUrl: relayTwo,
    });
    await Promise.resolve();

    expect(connector.configure).toHaveBeenCalledTimes(1);
    expect(connector.configure).toHaveBeenLastCalledWith({
      ledgerGenuineCheckWebSocketUrl: relayOne,
    });

    resolveFirstCheck({
      isGenuine: true,
      deviceId: 'aa'.repeat(32),
    });
    await expect(first).resolves.toMatchObject({
      success: true,
      payload: { deviceId: 'aa'.repeat(32) },
    });
    await expect(second).resolves.toMatchObject({
      success: true,
      payload: { deviceId: 'bb'.repeat(32) },
    });

    expect(connector.configure.mock.calls).toEqual([
      [{ ledgerGenuineCheckWebSocketUrl: relayOne }],
      [{ ledgerGenuineCheckWebSocketUrl: undefined }],
      [{ ledgerGenuineCheckWebSocketUrl: relayTwo }],
      [{ ledgerGenuineCheckWebSocketUrl: undefined }],
    ]);
  });

  describe('searchDevices', () => {
    it('should return devices from connector', async () => {
      const devices = await adapter.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0]).toMatchObject({
        vendor: 'ledger',
        model: 'nanoX',
        deviceId: 'dev-1',
        connectId: 'dev-1',
        connectionType: 'usb',
      });
      expect(connector.searchDevices).toHaveBeenCalled();
    });

    it('marks BLE scan results as BLE when connectId is a transport id', async () => {
      (connector as unknown as { connectionType: string }).connectionType = 'ble';
      connector.searchDevices.mockResolvedValueOnce([
        {
          connectId: 'D5:75:7D:4B:51:E8',
          deviceId: 'D5:75:7D:4B:51:E8',
          name: 'Nano X 123',
          model: 'nanoX',
        } as ConnectorDevice,
      ]);

      const devices = await adapter.searchDevices();

      expect(devices[0]).toMatchObject({
        vendor: 'ledger',
        model: 'nanoX',
        deviceId: 'D5:75:7D:4B:51:E8',
        connectId: 'D5:75:7D:4B:51:E8',
        label: 'Nano X 123',
        connectionType: 'ble',
      });
    });
  });

  describe('wallet lifecycle', () => {
    it('returns device search targets without connecting', async () => {
      const targets = await adapter.searchDeviceTargets({ resetSession: true });

      expect(connector.searchDevices).toHaveBeenCalledTimes(1);
      expect(connector.connect).not.toHaveBeenCalled();
      expect(targets).toEqual([
        expect.objectContaining({
          searchTargetId: 'dev-1',
          searchTargetReusePolicy: 'current-discovery',
          vendor: 'ledger',
          connectionType: 'usb',
          kind: 'physical',
        }),
      ]);
    });

    it('keeps the deprecated connection-target projection compatible', async () => {
      const targets = await adapter.listConnectionTargets();

      expect(targets).toEqual([
        expect.objectContaining({
          targetId: 'dev-1',
        }),
      ]);
      expect(targets[0]).not.toHaveProperty('searchTargetId');
    });

    it('connects an empty-id USB target and returns an interaction id', async () => {
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-empty',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'usb-path',
          connectId: 'usb-path',
          connectionType: 'usb',
        },
      });

      const result = await adapter.connectDevice('');

      expect(connector.connect).toHaveBeenCalledWith('');
      expect(connector.call).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        payload: expect.any(String),
      });
      if (!result.success) return;
      expect(parseHardwareRuntimeId(result.payload)).toMatchObject({
        kind: 'interaction',
        vendor: 'ledger',
      });

      connector._emit('device-disconnect', { connectId: 'usb-path' });
      const info = await adapter.getDeviceInfo(result.payload, '');
      expect(info.success).toBe(false);
      if (!info.success) {
        expect(info.payload.code).toBe(HardwareErrorCode.InteractionEnded);
      }
    });

    it('resolves device info through the returned interaction id', async () => {
      const result = await adapter.connectDevice('dev-1');
      expect(result.success).toBe(true);
      if (!result.success) return;

      await expect(adapter.getDeviceInfo(result.payload, '')).resolves.toEqual({
        success: true,
        payload: expect.objectContaining({
          vendor: 'ledger',
          connectId: 'dev-1',
        }),
      });
    });

    it('fails an ended interaction without searching or reconnecting', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      await adapter.releaseInteraction(connected.payload);
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        interactionId: connected.payload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
      }
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.call).not.toHaveBeenCalled();
    });

    it('retires an older interaction before replacing its USB session', async () => {
      const first = await adapter.connectDevice('dev-1');
      const second = await adapter.connectDevice('dev-1');
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;

      const oldInfo = await adapter.getDeviceInfo(first.payload, '');
      expect(oldInfo.success).toBe(false);
      if (!oldInfo.success) {
        expect(oldInfo.payload.code).toBe(HardwareErrorCode.InteractionEnded);
      }
      await expect(adapter.getDeviceInfo(second.payload, '')).resolves.toEqual({
        success: true,
        payload: expect.objectContaining({ connectId: 'dev-1' }),
      });
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
    });

    it('does not disconnect the replacement when the retired interaction ends late', async () => {
      connector.connect
        .mockResolvedValueOnce({
          sessionId: 'session-A',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dev-1',
            connectId: 'dev-1',
            connectionType: 'usb',
          },
        } as ConnectorSession)
        .mockResolvedValueOnce({
          sessionId: 'session-B',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dev-1',
            connectId: 'dev-1',
            connectionType: 'usb',
          },
        } as ConnectorSession);

      const first = await adapter.connectDevice('dev-1');
      const second = await adapter.connectDevice('dev-1');
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;
      connector.callImpl.mockResolvedValueOnce({ address: '0xB', publicKey: '0xpk' });
      jest.clearAllMocks();

      await adapter.releaseInteraction(first.payload);
      const result = await adapter.evmGetAddress(second.payload, '', {
        path: "m/44'/60'/0'/0/0",
        interactionId: second.payload,
      });

      expect(result.success).toBe(true);
      expect(connector.disconnect).not.toHaveBeenCalled();
      expect(connector.call).toHaveBeenCalledWith('session-B', 'evmGetAddress', expect.any(Object));
    });

    it('does not replay a pinned signing request after an ambiguous disconnect', async () => {
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockImplementationOnce(() => {
          connector._emit('device-disconnect', { connectId: 'dev-1' });
          return Promise.reject(
            Object.assign(new Error('disconnected'), {
              code: HardwareErrorCode.DeviceDisconnected,
              _tag: ERROR_TAG.DeviceDisconnected,
            })
          );
        })
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ signature: '0xSIGNED' });
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-new', deviceId: 'dev-new', name: 'Nano X', model: 'nanoX' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-new',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-new',
          connectId: 'dev-new',
          connectionType: 'usb',
        },
      });
      jest.clearAllMocks();

      const result = await adapter.evmSignMessage(connected.payload, expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
        interactionId: connected.payload,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.InteractionEnded,
          recovery: { scope: 'unknown' },
          params: { operationMayHaveCompleted: true, method: 'evmSignMessage' },
        },
      });
      expect(connector.connect).not.toHaveBeenCalledWith('dev-new');
      expect(connector.call).not.toHaveBeenCalledWith(
        'session-new',
        'evmSignMessage',
        expect.anything()
      );
      expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(false);
    });

    it('ends a pinned interaction after an APDU timeout without reconnecting', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('apdu timeout'), { _tag: 'SendApduTimeoutError' })
      );
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        interactionId: connected.payload,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InteractionEnded },
      });
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.callImpl).toHaveBeenCalledTimes(1);
      expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(false);
      expect(connector.disconnect).toHaveBeenCalledTimes(1);
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      await adapter.releaseInteraction(connected.payload);
      expect(connector.disconnect).toHaveBeenCalledTimes(1);
    });

    it('does not probe a replacement Ledger after a signing disconnect', async () => {
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      const wrongAddress = '0x2222222222222222222222222222222222222222';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockRejectedValueOnce(
          Object.assign(new Error('disconnected'), {
            code: HardwareErrorCode.DeviceDisconnected,
            _tag: ERROR_TAG.DeviceDisconnected,
          })
        )
        .mockResolvedValueOnce({ address: wrongAddress });
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-other', deviceId: 'dev-other', name: 'Nano X', model: 'nanoX' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-other',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-other',
          connectId: 'dev-other',
          connectionType: 'usb',
        },
      });
      jest.clearAllMocks();

      const result = await adapter.evmSignMessage(connected.payload, expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
        interactionId: connected.payload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
        expect(result.payload.params).toMatchObject({
          operationMayHaveCompleted: true,
          method: 'evmSignMessage',
        });
      }
      expect(connector.connect).not.toHaveBeenCalledWith('dev-other');
      expect(connector.call).not.toHaveBeenCalledWith(
        'session-other',
        'evmSignMessage',
        expect.anything()
      );
      expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(false);
    });
  });

  describe('connectDevice / releaseInteraction', () => {
    it('should connect and return an interaction id', async () => {
      const result = await adapter.connectDevice('dev-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(parseHardwareRuntimeId(result.payload)).toMatchObject({
          kind: 'interaction',
          vendor: 'ledger',
        });
      }
      expect(connector.connect).toHaveBeenCalledWith('dev-1');
    });

    it('should directly connect a BLE device when connectId is provided', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValue([]);
      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      const result = await bleAdapter.connectDevice('dev-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(parseHardwareRuntimeId(result.payload)).toMatchObject({
          kind: 'interaction',
          vendor: 'ledger',
        });
      }
      expect(bleConnector.searchDevices).not.toHaveBeenCalled();
      expect(bleConnector.connect).toHaveBeenCalledWith('dev-1');
    });

    it('should not auto-pick the first BLE device when connectId is empty', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValue([
        {
          connectId: 'A58F',
          deviceId: 'A58F',
          name: 'Leo',
          model: 'nanoX',
        } as ConnectorDevice,
        {
          connectId: '0738',
          deviceId: '0738',
          name: 'Andox',
          model: 'nanoX',
        } as ConnectorDevice,
      ]);
      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      const result = await bleAdapter.connectDevice('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
      }
      expect(bleConnector.searchDevices).not.toHaveBeenCalled();
      expect(bleConnector.connect).not.toHaveBeenCalled();
    });

    it('should disconnect without error', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      await expect(adapter.releaseInteraction(connected.payload)).resolves.toBeUndefined();
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
    });

    it('releases a timed-out interaction and keeps releaseInteraction idempotent', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      const interactions = (
        adapter as unknown as {
          _interactions: {
            end(interactionId: string, reason: 'timeout'): unknown;
          };
        }
      )._interactions;
      interactions.end(connected.payload, 'timeout');
      await new Promise(resolve => setImmediate(resolve));

      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      await expect(adapter.releaseInteraction(connected.payload)).resolves.toBeUndefined();
    });

    it('cancels the active job without terminating its interaction', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      adapter.cancel(connected.payload);

      expect(connector.cancel).toHaveBeenCalledWith('session-abc');
      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      await adapter.releaseInteraction(connected.payload);
    });
  });

  describe('evmGetAddress', () => {
    it('rejects a concurrent chain call with DeviceBusy instead of queueing it', async () => {
      let resolveFirstCall: (value: unknown) => void = () => {};
      connector.callImpl
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              resolveFirstCall = resolve;
            })
        )
        .mockResolvedValueOnce({
          address: '0xSECOND',
          publicKey: '0xpk2',
        });

      await adapter.connectDevice('dev-1');

      const first = adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      await waitForCondition(() => connector.call.mock.calls.length === 1);
      expect(connector.call).toHaveBeenCalledTimes(1);

      const second = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/1",
        showOnDevice: false,
      });
      resolveFirstCall({ address: '0xFIRST', publicKey: '0xpk1' });

      const firstResult = await first;
      expect(firstResult.success).toBe(true);
      expect(second.success).toBe(false);
      if (!second.success) {
        expect(second.payload.code).toBe(HardwareErrorCode.DeviceBusy);
      }
      expect(connector.call).toHaveBeenCalledTimes(1);
    });

    it('should return address on success', async () => {
      connector.callImpl.mockResolvedValueOnce({
        address: '0xABCD',
        publicKey: '0xpk',
      });

      await adapter.connectDevice('dev-1');

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('0xABCD');
      }
    });

    it('should call connector with correct method and params', async () => {
      connector.callImpl.mockResolvedValueOnce({
        address: '0xABCD',
        publicKey: '0xpk',
      });

      await adapter.connectDevice('dev-1');
      await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: true,
        autoInstallApp: true,
        passphraseState: 'aabbccdd',
        useEmptyPassphrase: true,
      });

      expect(connector.call).toHaveBeenCalledWith('session-abc', 'evmGetAddress', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: true,
      });
    });
  });

  describe('evmSignMessage', () => {
    it('should return signature on success', async () => {
      connector.callImpl.mockResolvedValueOnce({
        signature: `0x${'aabb'.padStart(64, '0')}${'ccdd'.padStart(64, '0')}1c`,
      });

      await adapter.connectDevice('dev-1');
      const result = await adapter.evmSignMessage('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toMatch(/^0x/);
      }
    });
  });

  describe('evmSignTypedData', () => {
    it('should return signature on success with full mode', async () => {
      connector.callImpl.mockResolvedValueOnce({
        signature: `0x${'aabb'.padStart(64, '0')}${'ccdd'.padStart(64, '0')}1c`,
      });

      await adapter.connectDevice('dev-1');
      const result = await adapter.evmSignTypedData('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        mode: 'full',
        data: {
          domain: { name: 'Test' },
          types: { EIP712Domain: [{ name: 'name', type: 'string' }] },
          primaryType: 'EIP712Domain',
          message: {},
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toMatch(/^0x/);
      }
    });

    it('should reject hash mode', async () => {
      // Connector validates and throws for hash mode
      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('Ledger does not support hash-only EIP-712 signing.'), {
          code: HardwareErrorCode.MethodNotSupported,
        })
      );
      await adapter.connectDevice('dev-1');
      const result = await adapter.evmSignTypedData('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        mode: 'hash',
        domainSeparatorHash: '0xdomainhash',
        messageHash: '0xmsghash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.MethodNotSupported);
      }
    });
  });

  describe('stuck-app (APDU 0x6901) retry', () => {
    // Stax-specific failure mode: the device returns 0x6901 when
    // OpenAppCommand lands during the post-CloseApp UI transition,
    // before the user can confirm. A short pause + single retry recovers.

    function makeStuckErr(): Error {
      return Object.assign(new Error('Ledger app is unresponsive'), {
        _tag: 'DeviceAppStuck',
        code: HardwareErrorCode.DeviceAppStuck,
      });
    }

    it('retries once and succeeds when DeviceAppStuck clears on the second attempt', async () => {
      connector.callImpl
        .mockRejectedValueOnce(makeStuckErr())
        .mockResolvedValueOnce({ address: '0xABCD', publicKey: '0xpk' });

      await adapter.connectDevice('dev-1');

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('0xABCD');
      }
      // Retry the rejected APDU on the original session only.
      expect(connector.call).toHaveBeenCalledTimes(2);
      expect(connector.reset).not.toHaveBeenCalled();
      expect(connector.connect).toHaveBeenCalledTimes(1);
    });

    it('surfaces the original DeviceAppStuck error after a second 0x6901', async () => {
      connector.callImpl
        .mockRejectedValueOnce(makeStuckErr())
        .mockRejectedValueOnce(makeStuckErr());

      await adapter.connectDevice('dev-1');

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceAppStuck);
      }
      expect(connector.call).toHaveBeenCalledTimes(2);
    });

    it('retries APDU 0x6901 once on the pinned session without reconnecting', async () => {
      connector.callImpl
        .mockRejectedValueOnce(makeStuckErr())
        .mockResolvedValueOnce({ address: '0xABCD', publicKey: '0xpk' });
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        interactionId: connected.payload,
      });

      expect(result.success).toBe(true);
      expect(connector.call).toHaveBeenCalledTimes(2);
      expect(connector.reset).not.toHaveBeenCalled();
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
    });

    it('disconnects and ends a pinned interaction when the 0x6901 retry times out', async () => {
      connector.callImpl
        .mockRejectedValueOnce(makeStuckErr())
        .mockRejectedValueOnce(
          Object.assign(new Error('apdu timeout'), { _tag: 'SendApduTimeoutError' })
        );
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        interactionId: connected.payload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
      }
      expect(connector.call).toHaveBeenCalledTimes(2);
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(false);
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.reset).not.toHaveBeenCalled();
    });

    it('marks an unsafe pinned operation ambiguous when its 0x6901 retry disconnects', async () => {
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockRejectedValueOnce(makeStuckErr())
        .mockRejectedValueOnce(
          Object.assign(new Error('apdu timeout'), { _tag: 'SendApduTimeoutError' })
        );
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      jest.clearAllMocks();

      const result = await adapter.evmSignMessage(connected.payload, expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
        interactionId: connected.payload,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.InteractionEnded,
          recovery: { scope: 'unknown' },
          params: { operationMayHaveCompleted: true, method: 'evmSignMessage' },
        },
      });
      expect(connector.call).toHaveBeenCalledTimes(3);
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
    });

    it('asks for unlock and retries DeviceLocked on the same pinned session', async () => {
      const locked = Object.assign(new Error('Ledger is locked'), {
        code: HardwareErrorCode.DeviceLocked,
      });
      connector.callImpl
        .mockRejectedValueOnce(locked)
        .mockResolvedValueOnce({ address: '0xABCD', publicKey: '0xpk' });
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const unlockRequests = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, () => {
        unlockRequests();
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
          payload: { confirmed: true },
        });
      });
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        interactionId: connected.payload,
      });

      expect(result.success).toBe(true);
      expect(unlockRequests).toHaveBeenCalledTimes(1);
      expect(connector.call).toHaveBeenCalledTimes(2);
      expect(connector.call).toHaveBeenNthCalledWith(
        1,
        'session-abc',
        'evmGetAddress',
        expect.any(Object)
      );
      expect(connector.call).toHaveBeenNthCalledWith(
        2,
        'session-abc',
        'evmGetAddress',
        expect.any(Object)
      );
      expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(true);
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.reset).not.toHaveBeenCalled();
    });

    it('bounds pinned DeviceLocked retries', async () => {
      const locked = Object.assign(new Error('Ledger is locked'), {
        code: HardwareErrorCode.DeviceLocked,
      });
      connector.callImpl.mockRejectedValue(locked);
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const unlockRequests = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, () => {
        unlockRequests();
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
          payload: { confirmed: true },
        });
      });
      jest.clearAllMocks();

      const result = await adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        interactionId: connected.payload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceLocked);
      }
      expect(unlockRequests).toHaveBeenCalledTimes(3);
      expect(connector.call).toHaveBeenCalledTimes(4);
      expect(connector.call.mock.calls.every(([sessionId]) => sessionId === 'session-abc')).toBe(
        true
      );
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.reset).not.toHaveBeenCalled();
    });

    it('does not retry for non-stuck errors', async () => {
      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('User rejected on device'), {
          _tag: 'UserRejected',
          code: HardwareErrorCode.UserRejected,
        })
      );

      await adapter.connectDevice('dev-1');

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      expect(connector.call).toHaveBeenCalledTimes(1);
    });
  });

  describe('Solana methods', () => {
    it('should return address for solGetAddress', async () => {
      connector.callImpl.mockResolvedValueOnce({ address: 'SoLAddr123', path: "m/44'/501'/0'" });

      await adapter.connectDevice('dev-1');
      const result = await adapter.solGetAddress('dev-1', '', { path: "m/44'/501'/0'" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('SoLAddr123');
        expect(result.payload.path).toBe("m/44'/501'/0'");
      }
    });

    it('should return signature for solSignTransaction', async () => {
      connector.callImpl.mockResolvedValueOnce({ signature: 'solSig456' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.solSignTransaction('dev-1', '', {
        path: "m/44'/501'/0'",
        serializedTx: '0xdeadbeef',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toBe('solSig456');
      }
    });
  });

  describe('BTC methods', () => {
    it('btcGetAddress forwards params and returns address', async () => {
      connector.callImpl.mockResolvedValueOnce({ address: 'bc1qxyz', path: "m/84'/0'/0'" });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcGetAddress('dev-1', '', {
        path: "m/84'/0'/0'",
        coin: 'btc',
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('bc1qxyz');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetAddress',
        expect.objectContaining({ path: "m/84'/0'/0'", showOnDevice: false })
      );
    });

    it('btcGetPublicKey forwards params and returns xpub', async () => {
      connector.callImpl.mockResolvedValueOnce({ xpub: 'xpub6Abc', path: "m/84'/0'/0'" });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcGetPublicKey('dev-1', '', {
        path: "m/84'/0'/0'",
        coin: 'btc',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.xpub).toBe('xpub6Abc');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetPublicKey',
        expect.objectContaining({ path: "m/84'/0'/0'" })
      );
    });

    it('rejects concurrent BTC high-index calls instead of queueing them', async () => {
      let resolveFirstCall: ((value: unknown) => void) | undefined;
      connector.callImpl.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstCall = resolve;
          })
      );
      await adapter.connectDevice('dev-1');

      const prompts: unknown[] = [];
      adapter.on(UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM, event => {
        prompts.push(event);
      });

      const first = adapter.btcGetPublicKey('dev-1', '', {
        path: "m/84'/0'/100'",
        coin: 'btc',
      });
      const second = adapter.btcGetPublicKey('dev-1', '', {
        path: "m/84'/0'/101'",
        coin: 'btc',
      });

      await waitForCondition(() => prompts.length === 1);
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_BTC_HIGH_INDEX_CONFIRM,
        payload: { confirmed: true },
      });

      await waitForCondition(() => connector.call.mock.calls.length === 1);
      expect(prompts).toHaveLength(1);
      expect(connector.call).toHaveBeenCalledTimes(1);
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetPublicKey',
        expect.objectContaining({ path: "m/84'/0'/100'", showOnDevice: true })
      );

      resolveFirstCall?.({ xpub: 'xpub6First' });
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(prompts).toHaveLength(1);
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.payload.code).toBe(HardwareErrorCode.DeviceBusy);
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetPublicKey',
        expect.objectContaining({ path: "m/84'/0'/100'", showOnDevice: true })
      );
      expect(connector.call).toHaveBeenCalledTimes(1);
    });

    it('rejects later device jobs while BTC high-index confirmation is pending', async () => {
      connector.callImpl.mockResolvedValueOnce({ xpub: 'xpub6High' });
      await adapter.connectDevice('dev-1');

      const prompts: unknown[] = [];
      adapter.on(UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM, event => {
        prompts.push(event);
      });

      const highIndex = adapter.btcGetPublicKey('dev-1', '', {
        path: "m/84'/0'/100'",
        coin: 'btc',
      });

      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
      expect(prompts).toHaveLength(1);
      expect(connector.call).not.toHaveBeenCalled();

      const signing = adapter.btcSignMessage('dev-1', '', {
        path: "m/84'/0'/0'/0/0",
        coin: 'btc',
        messageHex: '0x48656c6c6f',
      });

      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
      expect(connector.call).not.toHaveBeenCalled();

      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_BTC_HIGH_INDEX_CONFIRM,
        payload: { confirmed: true },
      });

      const [highIndexResult, signingResult] = await Promise.all([highIndex, signing]);

      expect(highIndexResult.success).toBe(true);
      expect(signingResult.success).toBe(false);
      if (!signingResult.success) {
        expect(signingResult.payload.code).toBe(HardwareErrorCode.DeviceBusy);
      }
      expect(connector.call).toHaveBeenNthCalledWith(
        1,
        'session-abc',
        'btcGetPublicKey',
        expect.objectContaining({ path: "m/84'/0'/100'", showOnDevice: true })
      );
      expect(connector.call).toHaveBeenCalledTimes(1);
    });

    it('btcSignTransaction forwards PSBT and returns serialized tx', async () => {
      connector.callImpl.mockResolvedValueOnce({ serializedTx: 'aabbcc' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcSignTransaction('dev-1', '', {
        path: "m/84'/0'/0'",
        coin: 'btc',
        psbt: '70736274ff0100',
        inputs: [],
        outputs: [],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.serializedTx).toBe('aabbcc');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcSignTransaction',
        expect.objectContaining({ psbt: '70736274ff0100' })
      );
    });

    it('btcSignPsbt forwards PSBT and returns signed PSBT', async () => {
      connector.callImpl.mockResolvedValueOnce({ signedPsbt: '70736274ff01signed' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcSignPsbt('dev-1', '', {
        path: "m/86'/0'/0'",
        coin: 'btc',
        psbt: '70736274ff0100',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signedPsbt).toBe('70736274ff01signed');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcSignPsbt',
        expect.objectContaining({ psbt: '70736274ff0100' })
      );
    });

    it('btcSignMessage forwards params and returns signature (address optional)', async () => {
      connector.callImpl.mockResolvedValueOnce({ signature: '1fabcd' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcSignMessage('dev-1', '', {
        path: "m/84'/0'/0'/0/0",
        coin: 'btc',
        messageHex: '0x48656c6c6f',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toBe('1fabcd');
        // address is optional — Ledger DMK does not return it
        expect(result.payload.address).toBeUndefined();
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcSignMessage',
        expect.any(Object)
      );
    });

    it('btcGetMasterFingerprint forwards to connector with no params', async () => {
      connector.callImpl.mockResolvedValueOnce({ masterFingerprint: 'deadbeef' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.btcGetMasterFingerprint('dev-1', '');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.masterFingerprint).toBe('deadbeef');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetMasterFingerprint',
        expect.any(Object)
      );
    });
  });

  describe('Tron methods', () => {
    it('tronGetAddress forwards params and returns address + publicKey', async () => {
      connector.callImpl.mockResolvedValueOnce({
        address: 'TRonAddr1',
        publicKey: '04pk',
        path: "m/44'/195'/0'/0/0",
      });

      await adapter.connectDevice('dev-1');
      const result = await adapter.tronGetAddress('dev-1', '', {
        path: "m/44'/195'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('TRonAddr1');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'tronGetAddress',
        expect.objectContaining({ path: "m/44'/195'/0'/0/0" })
      );
    });

    it('tronSignTransaction forwards rawTxHex (+ optional tokenSignatures) and returns signature', async () => {
      connector.callImpl.mockResolvedValueOnce({ signature: 'trxSig1' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.tronSignTransaction('dev-1', '', {
        path: "m/44'/195'/0'/0/0",
        rawTxHex: '0adeadbeef',
        tokenSignatures: ['tokenmeta1'],
      } as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toBe('trxSig1');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'tronSignTransaction',
        expect.objectContaining({
          rawTxHex: '0adeadbeef',
          tokenSignatures: ['tokenmeta1'],
        })
      );
    });

    it('tronSignMessage forwards messageHex and returns signature', async () => {
      connector.callImpl.mockResolvedValueOnce({ signature: 'trxMsgSig' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.tronSignMessage('dev-1', '', {
        path: "m/44'/195'/0'/0/0",
        messageHex: '0x48656c6c6f',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.signature).toBe('trxMsgSig');
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'tronSignMessage',
        expect.objectContaining({ messageHex: '0x48656c6c6f' })
      );
    });

    it('tronGetAddress rejects before returning a target address when fingerprint mismatches', async () => {
      const expectedFingerprint = deriveDeviceFingerprint('TExpectedFingerprintAddress');
      connector.callImpl
        .mockResolvedValueOnce({ address: 'TActualFingerprintAddress' })
        .mockResolvedValueOnce({ address: 'TSHOULD_NOT_RETURN', publicKey: '0xpub' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.tronGetAddress('dev-1', expectedFingerprint, {
        path: "m/44'/195'/1'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
      }
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'tronGetAddress',
        expect.objectContaining({ path: "m/44'/195'/0'/0/0", showOnDevice: false })
      );
      expect(connector.call).not.toHaveBeenCalledWith(
        'session-abc',
        'tronGetAddress',
        expect.objectContaining({ path: "m/44'/195'/1'/0/0" })
      );
    });

    it('tronSignTransaction rejects before signing when fingerprint mismatches', async () => {
      const expectedFingerprint = deriveDeviceFingerprint('TExpectedFingerprintAddress');
      connector.callImpl
        .mockResolvedValueOnce({ address: 'TActualFingerprintAddress' })
        .mockResolvedValueOnce({ signature: 'SHOULD_NOT_SIGN' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.tronSignTransaction('dev-1', expectedFingerprint, {
        path: "m/44'/195'/0'/0/0",
        rawTxHex: '0x0a02',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
      }
      expect(connector.call).not.toHaveBeenCalledWith(
        'session-abc',
        'tronSignTransaction',
        expect.any(Object)
      );
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
    });
  });

  describe('cancel', () => {
    it('should delegate to connector.cancel', async () => {
      await adapter.connectDevice('dev-1');
      adapter.cancel('dev-1');
      expect(connector.cancel).toHaveBeenCalledWith('session-abc');
    });
  });

  describe('dispose', () => {
    it('should clean up', async () => {
      await expect(adapter.dispose()).resolves.toBeUndefined();
      expect(connector.reset).toHaveBeenCalled();
    });

    it('waits for a cancelled raw connector call before disconnecting and resetting', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      let resolveRawCall: (value: { address: string; publicKey: string }) => void = () => undefined;
      connector.callImpl.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      );
      jest.clearAllMocks();

      const pending = adapter.evmGetAddress(connected.payload, '', {
        path: "m/44'/60'/0'/0/0",
        interactionId: connected.payload,
      });
      await new Promise(resolve => setImmediate(resolve));
      adapter.cancel(connected.payload);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });

      const disposing = adapter.dispose();
      await new Promise(resolve => setImmediate(resolve));
      expect(connector.disconnect).not.toHaveBeenCalled();
      expect(connector.reset).not.toHaveBeenCalled();

      resolveRawCall({ address: '0xABCD', publicKey: '0xpk' });
      await disposing;
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      expect(connector.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('activeTransport', () => {
    it('should return hid', () => {
      expect(adapter.activeTransport).toBe('hid');
    });

    it('should return ble when connector.connectionType is ble', () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      const bleAdapter = new LedgerAdapter(bleConnector);
      expect(bleAdapter.activeTransport).toBe('ble');
    });
  });

  describe('getAvailableTransports', () => {
    it('should return hid', () => {
      expect(adapter.getAvailableTransports()).toEqual(['hid']);
    });

    it('should return ble for a ble connector', () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      const bleAdapter = new LedgerAdapter(bleConnector);
      expect(bleAdapter.getAvailableTransports()).toEqual(['ble']);
    });
  });

  describe('_ensureDevicePermission transport propagation', () => {
    it('emits REQUEST_DEVICE_PERMISSION with transportType=ble for a BLE connector', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      const bleAdapter = new LedgerAdapter(bleConnector);
      const listener = jest.fn();
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, listener);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      await bleAdapter.searchDevices();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ transportType: 'ble' }),
        })
      );
    });

    it('emits REQUEST_DEVICE_PERMISSION with transportType=hid for a USB connector', async () => {
      const listener = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, listener);
      adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      await adapter.searchDevices();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ transportType: 'hid' }),
        })
      );
    });

    it('throws DevicePermissionDenied when the consumer replies granted=false', async () => {
      // Drop the default granted=true listener installed in beforeEach so
      // this test gets a clean event slot.
      (
        adapter as unknown as { emitter: { removeAllListeners(e: string): void } }
      ).emitter.removeAllListeners(UI_REQUEST.REQUEST_DEVICE_PERMISSION);
      adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: false },
        });
      });

      await expect(adapter.searchDevices()).rejects.toMatchObject({
        code: HardwareErrorCode.DevicePermissionDenied,
      });
    });

    it('preserves permission denial detail when the consumer replies granted=false with reason', async () => {
      (
        adapter as unknown as { emitter: { removeAllListeners(e: string): void } }
      ).emitter.removeAllListeners(UI_REQUEST.REQUEST_DEVICE_PERMISSION);
      adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: {
            granted: false,
            reason: 'bluetoothTurnedOff',
          },
        });
      });

      await expect(adapter.searchDevices()).rejects.toMatchObject({
        code: HardwareErrorCode.DevicePermissionDenied,
        reason: 'bluetoothTurnedOff',
      });
    });

    it('preserves permission denial detail in chain call failure payload', async () => {
      (
        adapter as unknown as { emitter: { removeAllListeners(e: string): void } }
      ).emitter.removeAllListeners(UI_REQUEST.REQUEST_DEVICE_PERMISSION);
      adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: {
            granted: false,
            reason: 'bluetoothTurnedOff',
          },
        });
      });

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DevicePermissionDenied);
        expect(result.payload.params).toEqual({
          permissionDeniedReason: 'bluetoothTurnedOff',
        });
      }
      expect(connector.call).not.toHaveBeenCalled();
    });
  });

  describe('switchTransport', () => {
    it('should be a no-op (transport is fixed at connector creation)', async () => {
      await expect(adapter.switchTransport('ble')).resolves.toBeUndefined();
    });
  });

  describe('event listeners', () => {
    it('should register and invoke listeners with on()', () => {
      const listener = jest.fn();
      adapter.on('device-connect', listener);
      (adapter as any).emitter.emit('device-connect', {
        type: 'device-connect',
        payload: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-1',
          connectId: 'dev-1',
          connectionType: 'usb',
        },
      });
      expect(listener).toHaveBeenCalled();
    });

    it('should remove listeners with off()', () => {
      const listener = jest.fn();
      adapter.on('device-connect', listener);
      adapter.off('device-connect', listener);
      (adapter as any).emitter.emit('device-connect', {
        type: 'device-connect',
        payload: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-1',
          connectId: 'dev-1',
          connectionType: 'usb',
        },
      });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('auto-connect', () => {
    it('should auto search+connect when calling evmGetAddress without prior connectDevice', async () => {
      connector.callImpl.mockResolvedValueOnce({
        address: '0xABCD',
        publicKey: '0xpk',
      });

      // Do NOT call adapter.connectDevice() first
      const result = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('0xABCD');
      }
      // Should have auto-searched
      expect(connector.searchDevices).toHaveBeenCalled();
      // Should have auto-connected to the single device
      expect(connector.connect).toHaveBeenCalledWith('dev-1');
      // Should have called with the resolved session
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'evmGetAddress',
        expect.any(Object)
      );
    });

    it('should not reuse a stale USB session after searchDevices requests a session reset', async () => {
      connector.callImpl.mockResolvedValueOnce({
        address: '0xOLD',
        publicKey: '0xold',
      });

      const first = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });
      expect(first.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledWith('dev-1');

      connector.searchDevices.mockResolvedValue([
        { connectId: 'dev-2', deviceId: 'dev-2', name: 'Nano Y', model: 'nanoY' },
      ]);
      connector.connect.mockResolvedValue({
        sessionId: 'session-dev-2',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoY',
          firmwareVersion: 'unknown',
          deviceId: 'dev-2',
          connectId: 'dev-2',
          connectionType: 'usb',
        },
      } as ConnectorSession);
      connector.callImpl.mockResolvedValueOnce({
        address: '0xNEW',
        publicKey: '0xnew',
      });

      await adapter.searchDevices({ resetSession: true });
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      const second = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(second.success).toBe(true);
      expect(connector.connect).toHaveBeenLastCalledWith('dev-2');
      expect(connector.call).toHaveBeenLastCalledWith(
        'session-dev-2',
        'evmGetAddress',
        expect.any(Object)
      );
    });

    it('resetState releases the old session before allowing a fresh call', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);

      let resolveDisconnect: () => void = () => undefined;
      connector.disconnect.mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveDisconnect = resolve;
          })
      );
      adapter.resetState();

      await expect(
        adapter.evmGetAddress('', '', {
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        })
      ).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceBusy },
      });
      await new Promise(resolve => setImmediate(resolve));
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      expect(connector.connect).toHaveBeenCalledTimes(1);

      resolveDisconnect();
      await new Promise(resolve => setImmediate(resolve));
      connector.callImpl.mockResolvedValueOnce({ address: '0xNEW', publicKey: '0xnew' });
      await expect(
        adapter.evmGetAddress('', '', {
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        })
      ).resolves.toMatchObject({ success: true });
      expect(connector.connect).toHaveBeenCalledTimes(2);
    });

    it('does not replay an acquired USB operation even with a verified fingerprint', async () => {
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);

      // First: establish a session
      await adapter.connectDevice('dev-1');

      // Simulate disconnect error on first call, success on retry
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockRejectedValueOnce(
          Object.assign(new Error('session not found'), { _tag: 'DeviceSessionNotFound' })
        )
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ address: '0xRETRY' });

      // After disconnect, searchDevices returns a new device ID (DMK regenerates UUIDs)
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-new', deviceId: 'dev-new', name: 'Nano X', model: 'nanoX' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-new',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-new',
          connectId: 'dev-new',
          connectionType: 'usb',
        },
      });

      const result = await adapter.evmGetAddress('dev-1', expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceDisconnected },
      });
      expect(connector.connect).not.toHaveBeenCalledWith('dev-new');
      expect(connector.callImpl).toHaveBeenCalledTimes(2);
    });

    it('should fail closed when a USB target misses and no device fingerprint is available', async () => {
      await adapter.connectDevice('dev-1');

      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('session not found'), { _tag: 'DeviceSessionNotFound' })
      );
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-new', deviceId: 'dev-new', name: 'Nano X', model: 'nanoX' },
      ]);

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceDisconnected);
      }
      expect(connector.connect).not.toHaveBeenCalledWith('dev-new');
    });

    it('should not replay a signing request after an APDU timeout', async () => {
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);

      await adapter.connectDevice('dev-1');

      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockRejectedValueOnce(
          Object.assign(new Error('apdu timeout'), { _tag: 'SendApduTimeoutError' })
        )
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ signature: '0xSIGNED' });

      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-1', deviceId: 'dev-1', name: 'Nano X', model: 'nanoX' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-target',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-1',
          connectId: 'dev-1',
          connectionType: 'usb',
        },
      });
      jest.clearAllMocks();

      const result = await adapter.evmSignMessage('dev-1', expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.OperationTimeout,
          recovery: { scope: 'unknown' },
          params: {
            operationMayHaveCompleted: true,
            method: 'evmSignMessage',
          },
        },
      });
      expect(connector.connect).not.toHaveBeenCalledWith('dev-1');
      expect(connector.call).not.toHaveBeenCalledWith(
        'session-target',
        'evmSignMessage',
        expect.anything()
      );
    });

    it('releases a timed-out session and permits a separate new operation', async () => {
      await adapter.connectDevice('dev-1');

      connector.connect
        .mockResolvedValueOnce({
          sessionId: 'session-retry',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dev-1',
            connectId: 'dev-1',
            connectionType: 'usb',
          },
        } as ConnectorSession)
        .mockResolvedValueOnce({
          sessionId: 'session-final',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dev-1',
            connectId: 'dev-1',
            connectionType: 'usb',
          },
        } as ConnectorSession);

      connector.callImpl
        .mockRejectedValueOnce(
          Object.assign(new Error('apdu timeout'), { _tag: 'SendApduTimeoutError' })
        )
        .mockResolvedValueOnce({ address: '0xRECOVERED', publicKey: '0xpk' });

      const failed = await adapter.btcGetPublicKey('dev-1', '', {
        path: "m/44'/0'/0'",
        showOnDevice: false,
      });
      expect(failed.success).toBe(false);
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
      expect(connector.callImpl).toHaveBeenCalledTimes(1);

      const recovered = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(recovered.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledTimes(2);
      expect(connector.call).toHaveBeenLastCalledWith(
        'session-retry',
        'evmGetAddress',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0" })
      );
    });

    it('asks the host to select when multiple USB devices are present', async () => {
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-A', deviceId: 'dev-A', name: 'Nano X', model: 'nanoX' },
        { connectId: 'dev-B', deviceId: 'dev-B', name: 'Nano S', model: 'nanoS' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-B',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoS',
          firmwareVersion: 'unknown',
          deviceId: 'dev-B',
          connectId: 'dev-B',
          connectionType: 'usb',
        },
      });
      connector.callImpl.mockResolvedValueOnce({ address: '0xFALLBACK', publicKey: '0xpk' });
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        expect(event.payload.devices.map(device => device.connectId)).toEqual(['dev-A', 'dev-B']);
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { sdkConnectId: 'dev-B', requestId: event.payload.requestId },
        });
      });

      const result = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledWith('dev-B');
      expect(connector.connect).not.toHaveBeenCalledWith('dev-A');
    });

    it('selects an unbound BLE device before verifying the wallet fingerprint', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      const expectedAddress = '0x1111111111111111111111111111111111111111';
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ address: 'verified-address' });
      const select = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        select();
        expect(connector.connect).not.toHaveBeenCalled();
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: {
            sdkConnectId: event.payload.devices[0].connectId,
            requestId: event.payload.requestId,
          },
        });
      });

      const result = await adapter.evmGetAddress('', deriveDeviceFingerprint(expectedAddress), {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(select).toHaveBeenCalledTimes(1);
      expect(connector.callImpl).toHaveBeenCalledTimes(2);
    });

    it('cancels a correlated BLE selection without opening the device', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { requestId: event.payload.requestId, cancelled: true },
        });
      });
      const result = await adapter.evmGetAddress('', deriveDeviceFingerprint('expected-wallet'), {
        path: "m/44'/60'/0'/0/0",
      });
      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      expect(connector.connect).not.toHaveBeenCalled();
      expect(connector.callImpl).not.toHaveBeenCalled();
    });

    it('fails without waiting when BLE binding has no host listener', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      const result = await adapter.evmGetAddress('', deriveDeviceFingerprint('expected-wallet'), {
        path: "m/44'/60'/0'/0/0",
      });
      expect(result.success).toBe(false);
      expect(connector.connect).not.toHaveBeenCalled();
    });

    it('uses a known BLE hint without rediscovery and keeps host context out of APDUs', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      connector.callImpl.mockResolvedValue({ address: 'verified-address' });
      const result = await adapter.evmGetAddress('stale-usb', '', {
        path: "m/44'/60'/0'/0/0",
        knownConnections: [{ transport: 'ble', connectId: 'dev-1' }],
        extra: { dbDeviceId: 'ledger-db' },
        allowDeviceSelection: false,
      });
      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledWith('dev-1');
      expect(connector.searchDevices).not.toHaveBeenCalled();
      expect(connector.callImpl).toHaveBeenLastCalledWith(expect.any(String), 'evmGetAddress', {
        path: "m/44'/60'/0'/0/0",
      });
    });

    it('repairs a stale BLE address and pins unlock retries to the verified target', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      connector.connect.mockRejectedValueOnce(
        Object.assign(new Error('Old BLE address is unavailable'), {
          _tag: ERROR_TAG.DeviceNotAdvertising,
        })
      );
      const address = '0x1111111111111111111111111111111111111111';
      const fingerprint = deriveDeviceFingerprint(address);
      connector.callImpl.mockResolvedValue({ address });
      connector.callImpl
        .mockResolvedValueOnce({ address })
        .mockRejectedValueOnce(
          Object.assign(new Error('Ledger is locked'), { code: HardwareErrorCode.DeviceLocked })
        );
      const unlock = jest.fn(() => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
          payload: { confirmed: true },
        });
      });
      adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, unlock);
      const select = jest.fn();
      const verified = jest.fn();
      adapter.on(DEVICE.LEDGER_CONNECTION_VERIFIED, verified);
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        select();
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: {
            sdkConnectId: event.payload.devices[0].connectId,
            requestId: event.payload.requestId,
          },
        });
      });
      const params = { path: "m/44'/60'/0'/0/0", showOnDevice: false };

      expect((await adapter.evmGetAddress('old-ble', fingerprint, params)).success).toBe(true);
      expect((await adapter.evmGetAddress('old-ble', fingerprint, params)).success).toBe(true);

      expect(select).toHaveBeenCalledTimes(1);
      expect(connector.connect).toHaveBeenCalledTimes(2);
      expect(unlock).toHaveBeenCalledTimes(1);
      expect(verified).toHaveBeenCalledWith({
        type: DEVICE.LEDGER_CONNECTION_VERIFIED,
        payload: {
          previousConnectId: 'old-ble',
          connectId: 'dev-1',
          chain: 'evm',
          fingerprint,
          selectionRequestId: expect.any(String),
        },
      });
    });

    it('does not dispatch the requested BLE operation when the selected wallet fingerprint differs', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      connector.callImpl.mockResolvedValueOnce({ address: 'different-wallet' });
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: {
            sdkConnectId: event.payload.devices[0].connectId,
            requestId: event.payload.requestId,
          },
        });
      });

      const result = await adapter.evmGetAddress('', deriveDeviceFingerprint('expected-wallet'), {
        path: "m/44'/60'/0'/0/1",
        showOnDevice: false,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      expect(connector.callImpl).toHaveBeenCalledTimes(1);
    });

    it('never treats a wrong-app fingerprint failure as successful wallet verification', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      const verified = jest.fn();
      adapter.on(DEVICE.LEDGER_CONNECTION_VERIFIED, verified);
      adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { requestId: event.payload.requestId, sdkConnectId: 'dev-1' },
        });
      });
      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('Wrong app opened'), { _tag: ERROR_TAG.WrongAppOpened })
      );
      const result = await adapter.evmGetAddress('', deriveDeviceFingerprint('expected-wallet'), {
        path: "m/44'/60'/0'/0/1",
        extra: { dbDeviceId: 'ledger-db' },
      });
      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.WrongApp },
      });
      expect(connector.callImpl).toHaveBeenCalledTimes(1);
      expect(verified).not.toHaveBeenCalled();
    });

    it('connects the explicitly targeted device even when multiple USB devices are present', async () => {
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-A', deviceId: 'dev-A', name: 'Nano X', model: 'nanoX' },
        { connectId: 'dev-B', deviceId: 'dev-B', name: 'Nano S', model: 'nanoS' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-B',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoS',
          firmwareVersion: 'unknown',
          deviceId: 'dev-B',
          connectId: 'dev-B',
          connectionType: 'usb',
        },
      });
      connector.callImpl.mockResolvedValueOnce({ address: '0xTARGET', publicKey: '0xpk' });

      const result = await adapter.evmGetAddress('dev-B', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledWith('dev-B');
      expect(connector.connect).not.toHaveBeenCalledWith('dev-A');
    });

    it('should reject BLE business calls with an empty connectId instead of auto-selecting a device', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValueOnce([
        { connectId: 'A58F', deviceId: 'A58F', name: 'Leo', model: 'nanoX' },
        { connectId: '0738', deviceId: '0738', name: 'Andox', model: 'nanoX' },
      ]);
      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      const result = await bleAdapter.btcGetPublicKey('', '', {
        path: "m/44'/0'/0'",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
      }
      expect(bleConnector.searchDevices).not.toHaveBeenCalled();
      expect(bleConnector.connect).not.toHaveBeenCalled();
    });

    it('should directly connect BLE business calls when connectId is provided', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-A', deviceId: 'dev-A', name: 'Nano X', model: 'nanoX' },
      ]);
      bleConnector.connect.mockResolvedValueOnce({
        sessionId: 'session-dev-A',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-A',
          connectId: 'dev-A',
          connectionType: 'ble',
        },
      } as ConnectorSession);
      bleConnector.callImpl.mockResolvedValueOnce({ address: '0xBLE', publicKey: '0xpk' });
      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      const result = await bleAdapter.evmGetAddress('dev-A', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(bleConnector.searchDevices).not.toHaveBeenCalled();
      expect(bleConnector.connect).toHaveBeenCalledWith('dev-A');
      expect(bleConnector.call).toHaveBeenCalledWith(
        'session-dev-A',
        'evmGetAddress',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0" })
      );
    });

    it('should recover BLE direct-connect failures by retrying the same connectId', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValue([
        { connectId: 'dev-A', deviceId: 'dev-A', name: 'Nano X', model: 'nanoX' },
      ]);
      bleConnector.connect
        .mockRejectedValueOnce(
          Object.assign(new Error('not advertising'), {
            _tag: 'DeviceNotAdvertisingError',
            code: HardwareErrorCode.DeviceNotFound,
          })
        )
        .mockResolvedValueOnce({
          sessionId: 'session-dev-A',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dev-A',
            connectId: 'dev-A',
            connectionType: 'ble',
          },
        } as ConnectorSession);
      bleConnector.callImpl.mockResolvedValueOnce({ address: '0xBLE', publicKey: '0xpk' });
      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      const result = await bleAdapter.evmGetAddress('dev-A', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(bleConnector.connect).toHaveBeenNthCalledWith(1, 'dev-A');
      expect(bleConnector.connect).toHaveBeenNthCalledWith(2, 'dev-A');
      expect(bleConnector.connect).not.toHaveBeenCalledWith(undefined);
    });

    it('does not reconnect or replay BLE connection-level errors after acquire', async () => {
      const bleConnector = createMockConnector();
      (bleConnector as unknown as { connectionType: string }).connectionType = 'ble';
      bleConnector.searchDevices.mockResolvedValue([
        { connectId: 'A58F', deviceId: 'dmk-path-a58f', name: 'Leo', model: 'nanoX' },
      ]);
      bleConnector.connect
        .mockResolvedValueOnce({
          sessionId: 'session-a58f-initial',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dmk-path-a58f',
            connectId: 'A58F',
            connectionType: 'ble',
          },
        } as ConnectorSession)
        .mockResolvedValueOnce({
          sessionId: 'session-a58f-retry',
          deviceInfo: {
            vendor: 'ledger',
            model: 'nanoX',
            firmwareVersion: 'unknown',
            deviceId: 'dmk-path-a58f',
            connectId: 'A58F',
            connectionType: 'ble',
          },
        } as ConnectorSession);
      bleConnector.callImpl
        .mockRejectedValueOnce(
          Object.assign(new Error('session not found'), { _tag: 'DeviceSessionNotFound' })
        )
        .mockResolvedValueOnce({ address: '0xBLE', publicKey: '0xpk' });

      const bleAdapter = new LedgerAdapter(bleConnector);
      bleAdapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
        bleAdapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
          payload: { granted: true },
        });
      });

      await bleAdapter.connectDevice('A58F');
      const result = await bleAdapter.evmGetAddress('A58F', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceDisconnected },
      });
      expect(bleConnector.connect).toHaveBeenCalledTimes(1);
      expect(bleConnector.connect).not.toHaveBeenCalledWith(undefined);
      expect(bleConnector.call).toHaveBeenLastCalledWith(
        'session-a58f-initial',
        'evmGetAddress',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0" })
      );
    });
  });

  describe('event forwarding from connector', () => {
    it('should forward device-connect events', () => {
      const listener = jest.fn();
      adapter.on('device-connect', listener);

      connector._emit('device-connect', {
        device: {
          connectId: 'dev-2',
          deviceId: 'dev-2',
          name: 'Nano S',
          model: 'nanoS',
        },
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'device-connect',
          payload: expect.objectContaining({
            vendor: 'ledger',
            model: 'nanoS',
            connectId: 'dev-2',
          }),
        })
      );
    });

    it('should forward device-disconnect events', () => {
      const listener = jest.fn();
      adapter.on('device-disconnect', listener);

      connector._emit('device-disconnect', { connectId: 'dev-1' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'device-disconnect',
          payload: { connectId: 'dev-1' },
        })
      );
    });
  });

  describe('getDeviceInfo', () => {
    it('should return cached device info after searchDevices', async () => {
      await adapter.searchDevices();
      const result = await adapter.getDeviceInfo('dev-1', 'dev-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toMatchObject({
          vendor: 'ledger',
          connectId: 'dev-1',
        });
      }
    });

    it('should return failure when device not in cache', async () => {
      const result = await adapter.getDeviceInfo('unknown', 'unknown');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
      }
    });
  });

  describe('autoInstallApp (commonParams)', () => {
    const evmFingerprintAddress = '0xabcd000000000000000000000000000000000000';
    const evmFingerprint = deriveDeviceFingerprint(evmFingerprintAddress);
    const solFingerprintAddress = 'SoLExpectedFingerprintAddress';
    const solFingerprint = deriveDeviceFingerprint(solFingerprintAddress);
    const btcFingerprint = 'deadbeef';

    function makeAppNotInstalledErr(appName = 'Cardano'): Error {
      return Object.assign(new Error(`Failed to open "${appName}"`), {
        _tag: 'OpenAppCommandError',
        errorCode: '6807',
        statusCode: '6807',
        appName,
      });
    }

    const methodsCalled = () => connector.callImpl.mock.calls.map((c: unknown[]) => c[1]);

    it('prompts, installs, then retries the original call on confirm', async () => {
      connector.callImpl
        .mockRejectedValueOnce(makeAppNotInstalledErr('Cardano')) // open app fails
        .mockResolvedValueOnce(undefined) // installApp
        .mockResolvedValueOnce({ address: '0xABCD', publicKey: '0xpk' }); // retry

      await adapter.connectDevice('dev-1');

      let requestedAppName: string | undefined;
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, evt => {
        requestedAppName = (evt as { payload: { appName: string } }).payload.appName;
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: true },
        });
      });

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        autoInstallApp: true,
      });

      expect(requestedAppName).toBe('Cardano');
      expect(result.success).toBe(true);
      if (result.success) expect(result.payload.address).toBe('0xABCD');
      expect(methodsCalled()).toEqual(['evmGetAddress', 'installApp', 'evmGetAddress']);
    });

    it('surfaces UserAborted without installing when the user declines', async () => {
      connector.callImpl.mockRejectedValueOnce(makeAppNotInstalledErr('Cardano'));
      await adapter.connectDevice('dev-1');
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: false },
        });
      });

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        autoInstallApp: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
      }
      expect(methodsCalled()).not.toContain('installApp');
    });

    it('does not prompt when autoInstallApp is off (default failure path)', async () => {
      connector.callImpl.mockRejectedValueOnce(makeAppNotInstalledErr('Cardano'));
      await adapter.connectDevice('dev-1');
      const onInstall = jest.fn();
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, onInstall);

      const result = await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
      });

      expect(onInstall).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(methodsCalled()).not.toContain('installApp');
    });

    it('allNetworkGetAddress returns item failures when install runs out of memory', async () => {
      connector.callImpl
        .mockResolvedValueOnce({ address: evmFingerprintAddress })
        .mockRejectedValueOnce(makeAppNotInstalledErr('Ethereum'))
        .mockRejectedValueOnce(
          Object.assign(new Error('Not enough space'), {
            _tag: 'OutOfMemoryDAError',
          })
        )
        .mockResolvedValueOnce({ address: solFingerprintAddress })
        .mockRejectedValueOnce(makeAppNotInstalledErr('Solana'));

      await adapter.connectDevice('dev-1');
      const onInstall = jest.fn(() => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: true },
        });
      });
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, onInstall);

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        autoInstallApp: true,
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: evmFingerprint,
          },
          {
            network: 'sol',
            methodName: 'solGetAddress',
            path: "m/44'/501'/0'/0'",
            deviceId: solFingerprint,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toHaveLength(2);
        expect(result.payload[0].success).toBe(false);
        expect(result.payload[0].payload?.code).toBe(HardwareErrorCode.DeviceOutOfMemory);
        expect(result.payload[1].success).toBe(false);
        expect(result.payload[1].payload?.code).toBe(HardwareErrorCode.DeviceOutOfMemory);
      }
      expect(onInstall).toHaveBeenCalledTimes(1);
      expect(methodsCalled()).toEqual([
        'evmGetAddress',
        'evmGetAddress',
        'installApp',
        'solGetAddress',
        'solGetAddress',
      ]);
    });

    it('allNetworkGetAddress aborts the entire bundle when the user declines app installation', async () => {
      // New behavior: any UserAborted during the bundle (install-decline,
      // BTC high-index decline, connect-cancel) fail-fasts the whole batch.
      // Subsequent items are NOT attempted — the user's "no" propagates.
      connector.callImpl
        .mockResolvedValueOnce({ masterFingerprint: btcFingerprint })
        .mockRejectedValueOnce(makeAppNotInstalledErr('Bitcoin'));

      await adapter.connectDevice('dev-1');
      const onInstall = jest.fn(() => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: false },
        });
      });
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, onInstall);

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        autoInstallApp: true,
        bundle: [
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/49'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: evmFingerprint,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload?.code).toBe(HardwareErrorCode.UserAborted);
      }
      expect(onInstall).toHaveBeenCalledTimes(1);
      // EVM item never runs after the BTC install decline.
      expect(methodsCalled()).toEqual(['btcGetMasterFingerprint', 'btcGetAddress']);
    });

    it('allNetworkGetAddress fail-fast survives a large bundle: only one prompt even with many follow-ups', async () => {
      // Sanity check that the bundle-wide abort holds regardless of how many
      // items would have followed — the user sees one prompt, says no, and
      // every remaining item (same network or not) is skipped.
      connector.callImpl
        .mockResolvedValueOnce({ masterFingerprint: btcFingerprint })
        .mockRejectedValueOnce(makeAppNotInstalledErr('Bitcoin'));

      await adapter.connectDevice('dev-1');
      const onInstall = jest.fn(() => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: false },
        });
      });
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, onInstall);

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        autoInstallApp: true,
        bundle: [
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/44'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/49'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/84'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/86'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: evmFingerprint,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload?.code).toBe(HardwareErrorCode.UserAborted);
      }
      expect(onInstall).toHaveBeenCalledTimes(1);
      // First BTC item triggers the prompt, every later item — including the
      // EVM one — is skipped.
      expect(methodsCalled()).toEqual(['btcGetMasterFingerprint', 'btcGetAddress']);
    });

    it('allNetworkGetAddress breaks the install loop when DMK reports success but app stays missing', async () => {
      // Sequence: BTC item 1 verify → main call AppNotInstalled → user
      // confirms → installApp resolves success → retry main call →
      // AppNotInstalled AGAIN (DMK lied). Loop guard fires: item 1 fails
      // with AppInstallVerifyFailed (no second prompt), bundle continues to
      // EVM normally. Note retry bypasses the fingerprint check so the
      // sequence has only one btcGetMasterFingerprint.
      connector.callImpl
        .mockResolvedValueOnce({ masterFingerprint: btcFingerprint })
        .mockRejectedValueOnce(makeAppNotInstalledErr('Bitcoin'))
        .mockResolvedValueOnce(undefined) // installApp resolves
        .mockRejectedValueOnce(makeAppNotInstalledErr('Bitcoin')) // retry: still missing
        .mockResolvedValueOnce({ address: evmFingerprintAddress })
        .mockResolvedValueOnce({ address: '0xABCD', path: "m/44'/60'/0'/0/0" });

      await adapter.connectDevice('dev-1');
      const onInstall = jest.fn(() => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_INSTALL_APP,
          payload: { confirmed: true },
        });
      });
      adapter.on(UI_REQUEST.REQUEST_INSTALL_APP, onInstall);

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        autoInstallApp: true,
        bundle: [
          {
            network: 'btc',
            methodName: 'btcGetAddress',
            path: "m/44'/0'/0'/0/0",
            deviceId: btcFingerprint,
          },
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: evmFingerprint,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toHaveLength(2);
        expect(result.payload[0].success).toBe(false);
        expect(result.payload[0].payload?.code).toBe(HardwareErrorCode.AppNotInstalled);
        expect(result.payload[0].payload?._tag).toBe(ERROR_TAG.AppInstallVerifyFailed);
        expect(result.payload[1].success).toBe(true);
      }
      expect(onInstall).toHaveBeenCalledTimes(1);
    });

    it('allNetworkGetAddress preserves normalized bundle params', async () => {
      connector.callImpl
        .mockResolvedValueOnce({ address: evmFingerprintAddress })
        .mockResolvedValueOnce({ address: '0xABCD', path: "m/44'/60'/0'/0/0" });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        passphraseState: 'aabbccdd',
        useEmptyPassphrase: true,
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            showOnDevice: true,
            customField: 'kept',
            deviceId: evmFingerprint,
          },
        ],
      });

      expect(result.success).toBe(true);
      const evmCall = connector.call.mock.calls.find(
        call =>
          call[1] === 'evmGetAddress' &&
          (call[2] as { customField?: unknown }).customField === 'kept'
      );
      expect(evmCall?.[2]).toMatchObject({
        network: 'evm',
        methodName: 'evmGetAddress',
        path: "m/44'/60'/0'/0/0",
        showOnDevice: true,
        chainId: 1,
        customField: 'kept',
      });
      expect(evmCall?.[2]).not.toHaveProperty('passphraseState');
      expect(evmCall?.[2]).not.toHaveProperty('useEmptyPassphrase');
    });

    it('allNetworkGetAddress verifies each item with its own chain fingerprint', async () => {
      const expectedAddress = '0xabcd000000000000000000000000000000000000';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      connector.callImpl
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ address: '0xBUNDLE', path: "m/44'/60'/0'/0/0" });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', 'wrong-global-device-id', {
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: expectedFingerprint,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(connector.call).toHaveBeenNthCalledWith(
        1,
        'session-abc',
        'evmGetAddress',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0", showOnDevice: false })
      );
      expect(connector.call).toHaveBeenNthCalledWith(
        2,
        'session-abc',
        'evmGetAddress',
        expect.objectContaining({
          network: 'evm',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          deviceId: expectedFingerprint,
        })
      );
    });

    it('allNetworkGetAddress stops at top level when any item fingerprint mismatches', async () => {
      const liveAddress = '0xabcd000000000000000000000000000000000000';
      const wrongFingerprint = deriveDeviceFingerprint(
        '0x0000000000000000000000000000000000000001'
      );
      connector.callImpl
        .mockResolvedValueOnce({ address: liveAddress })
        .mockResolvedValueOnce({ address: '0xSHOULD_NOT_RUN' });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
            deviceId: wrongFingerprint,
          },
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/1",
            chainId: 1,
            deviceId: wrongFingerprint,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
      }
      expect(methodsCalled()).toEqual(['evmGetAddress']);
    });

    it('allNetworkGetAddress bootstraps and returns a chain fingerprint when an item has none', async () => {
      const expectedAddress = '0xabcd000000000000000000000000000000000000';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      connector.callImpl
        .mockResolvedValueOnce({ address: '0xBUNDLE', path: "m/44'/60'/0'/0/0" })
        .mockResolvedValueOnce({ address: expectedAddress });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload[0].success).toBe(true);
        expect(result.payload[0].payload?.address).toBe('0xBUNDLE');
        expect(result.payload[0].payload?.deviceIdentity).toEqual({
          vendor: 'ledger',
          type: 'chainFingerprint',
          chain: 'evm',
          value: expectedFingerprint,
        });
        expect(result.payload[0].payload?.chainFingerprint).toBe(expectedFingerprint);
        expect(result.payload[0].payload?.chainFingerprintChain).toBe('evm');
      }
      expect(methodsCalled()).toEqual(['evmGetAddress', 'evmGetAddress']);
    });

    it('keeps batch address and identity calls on the known BLE connection', async () => {
      Object.defineProperty(connector, 'connectionType', { value: 'ble' });
      connector.callImpl.mockResolvedValue({ address: 'verified-address' });
      const result = await adapter.allNetworkGetAddress('stale-usb', '', {
        knownConnections: [{ transport: 'ble', connectId: 'dev-1' }],
        extra: { dbDeviceId: 'ledger-db' },
        allowDeviceSelection: false,
        bundle: [{ network: 'evm', methodName: 'evmGetAddress', path: "m/44'/60'/0'/0/0" }],
      });
      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledTimes(1);
      expect(connector.connect).toHaveBeenCalledWith('dev-1');
      expect(connector.searchDevices).not.toHaveBeenCalled();
      for (const call of connector.callImpl.mock.calls) {
        expect(call[0]).toBe('session-abc');
        expect(call[2]).not.toHaveProperty('extra');
        expect(call[2]).not.toHaveProperty('knownConnections');
      }
    });

    it('does not reconnect for batch identity after a successful address loses its connection', async () => {
      connector.callImpl.mockImplementationOnce(async () => {
        connector._emit('device-disconnect', { connectId: 'dev-1' });
        return { address: 'verified-address' };
      });
      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        bundle: [{ network: 'evm', methodName: 'evmGetAddress', path: "m/44'/60'/0'/0/0" }],
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
      expect(connector.connect).toHaveBeenCalledTimes(1);
      expect(connector.callImpl).toHaveBeenCalledTimes(1);
    });

    it('pins all address and fingerprint calls to the common interaction target', async () => {
      const expectedAddress = '0xabcd000000000000000000000000000000000000';
      connector.callImpl
        .mockResolvedValueOnce({ address: '0xBUNDLE', path: "m/44'/60'/0'/0/0" })
        .mockResolvedValueOnce({ address: expectedAddress });
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      const result = await adapter.allNetworkGetAddress('stale-or-unrelated-connect-id', '', {
        interactionId: connected.payload,
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(connector.call.mock.calls.every(call => call[0] === 'session-abc')).toBe(true);
      expect(connector.connect).toHaveBeenCalledTimes(1);
    });

    it('rejects conflicting positional and common interaction ids before device I/O', async () => {
      const connected = await adapter.connectDevice('dev-1');
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      jest.clearAllMocks();

      const result = await adapter.allNetworkGetAddress(connected.payload, '', {
        interactionId: createHardwareInteractionId('ledger'),
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
      expect(connector.call).not.toHaveBeenCalled();
      expect(connector.connect).not.toHaveBeenCalled();
    });

    it('allNetworkGetAddress reuses a bootstrapped fingerprint for later items on the same chain', async () => {
      const expectedAddress = '0xabcd000000000000000000000000000000000000';
      const expectedFingerprint = deriveDeviceFingerprint(expectedAddress);
      connector.callImpl
        .mockResolvedValueOnce({ address: '0xBUNDLE1', path: "m/44'/60'/0'/0/0" })
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ address: expectedAddress })
        .mockResolvedValueOnce({ address: '0xBUNDLE2', path: "m/44'/60'/0'/0/1" });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        bundle: [
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            chainId: 1,
          },
          {
            network: 'evm',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/1",
            chainId: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toHaveLength(2);
        expect(result.payload[0].success).toBe(true);
        expect(result.payload[0].payload?.deviceIdentity).toEqual({
          vendor: 'ledger',
          type: 'chainFingerprint',
          chain: 'evm',
          value: expectedFingerprint,
        });
        expect(result.payload[0].payload?.chainFingerprint).toBe(expectedFingerprint);
        expect(result.payload[1].success).toBe(true);
        expect(result.payload[1].payload?.deviceIdentity).toEqual({
          vendor: 'ledger',
          type: 'chainFingerprint',
          chain: 'evm',
          value: expectedFingerprint,
        });
        expect(result.payload[1].payload?.chainFingerprint).toBe(expectedFingerprint);
      }
      expect(methodsCalled()).toEqual([
        'evmGetAddress',
        'evmGetAddress',
        'evmGetAddress',
        'evmGetAddress',
      ]);
    });

    it('allNetworkGetAddress adds Ledger coin params for supported BTC fork networks inside the adapter', async () => {
      connector.callImpl
        .mockResolvedValueOnce({ masterFingerprint: btcFingerprint })
        .mockResolvedValueOnce({ xpub: 'xpub-ltc', path: "m/84'/2'/0'" });

      await adapter.connectDevice('dev-1');

      const result = await adapter.allNetworkGetAddress('dev-1', '', {
        bundle: [
          {
            network: 'ltc',
            methodName: 'btcGetPublicKey',
            path: "m/84'/2'/0'",
            deviceId: btcFingerprint,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'btcGetPublicKey',
        expect.objectContaining({
          network: 'ltc',
          methodName: 'btcGetPublicKey',
          path: "m/84'/2'/0'",
          coin: 'Litecoin',
        })
      );
    });

    it('allNetworkGetAddress returns item failure for Dogecoin on Ledger without calling connector', async () => {
      await adapter.connectDevice('dev-1');

      await expect(
        adapter.allNetworkGetAddress('dev-1', '', {
          bundle: [
            {
              network: 'doge',
              methodName: 'btcGetPublicKey',
              path: "m/44'/3'/0'",
            },
          ],
        })
      ).resolves.toEqual({
        success: true,
        payload: [
          expect.objectContaining({
            network: 'doge',
            methodName: 'btcGetPublicKey',
            path: "m/44'/3'/0'",
            success: false,
            payload: {
              code: HardwareErrorCode.ChainNotSupported,
              error: 'Ledger allNetwork does not support Dogecoin',
            },
          }),
        ],
      });
      expect(connector.call).not.toHaveBeenCalled();
    });

    it('allNetworkGetAddress returns item failure for unsupported method without throwing', async () => {
      await adapter.connectDevice('dev-1');

      await expect(
        adapter.allNetworkGetAddress('dev-1', '', {
          bundle: [
            {
              network: 'doge',
              methodName: 'dogeGetAddress' as never,
              path: "m/44'/3'/0'",
            },
          ],
        })
      ).resolves.toEqual({
        success: true,
        payload: [
          expect.objectContaining({
            network: 'doge',
            methodName: 'dogeGetAddress',
            path: "m/44'/3'/0'",
            success: false,
            payload: {
              code: HardwareErrorCode.InvalidParams,
              error: 'Unsupported allNetwork method: dogeGetAddress',
            },
          }),
        ],
      });
      expect(connector.call).not.toHaveBeenCalled();
    });
  });

  describe('app management', () => {
    it('listInstalledApps routes through connector.call with listInstalledApps method', async () => {
      connector.callImpl.mockResolvedValueOnce([
        {
          versionName: 'Bitcoin',
          versionId: 1,
          version: '2.4.1',
          versionDisplayName: 'Bitcoin',
          description: 'BTC app',
          icon: null,
          bytes: 12345,
          currencyId: 'bitcoin',
          isDevTools: false,
        },
      ]);
      await adapter.connectDevice('dev-1');
      const result = await adapter.listInstalledApps('dev-1');

      expect(connector.call).toHaveBeenCalledWith('session-abc', 'listInstalledApps', {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload[0].versionName).toBe('Bitcoin');
      }
    });

    it('listAvailableApps routes through connector.call with listAvailableApps method', async () => {
      connector.callImpl.mockResolvedValueOnce([]);
      await adapter.connectDevice('dev-1');
      const result = await adapter.listAvailableApps('dev-1');

      expect(connector.call).toHaveBeenCalledWith('session-abc', 'listAvailableApps', {});
      expect(result.success).toBe(true);
    });

    it('installApp passes appName through params (no function refs)', async () => {
      connector.callImpl.mockResolvedValueOnce(undefined);
      await adapter.connectDevice('dev-1');
      const result = await adapter.installApp('dev-1', 'Cardano');

      expect(result.success).toBe(true);
      const [sessionId, method, params] = connector.call.mock.calls[0];
      expect(sessionId).toBe('session-abc');
      expect(method).toBe('installApp');
      expect(params).toEqual({ appName: 'Cardano' });
      // Params must be serializable — no function refs may cross the connector
      // boundary (would be dropped by IHardwareBridge structured-clone / JSON).
      for (const value of Object.values(params as Record<string, unknown>)) {
        expect(typeof value).not.toBe('function');
      }
    });

    it('forwards connector AppInstallProgress ui-event with connectId re-keyed from sessionId', async () => {
      connector.callImpl.mockResolvedValueOnce(undefined);
      const events: unknown[] = [];
      adapter.on('ui-event', evt => {
        if (evt.type === EConnectorInteraction.AppInstallProgress) {
          events.push(evt);
        }
      });

      await adapter.connectDevice('dev-1');
      // Simulate the connector emitting progress mid-install.
      connector._emit('ui-event', {
        type: EConnectorInteraction.AppInstallProgress,
        payload: {
          sessionId: 'session-abc',
          appName: 'Cardano',
          progress: 0.5,
        },
      });
      await adapter.installApp('dev-1', 'Cardano');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: EConnectorInteraction.AppInstallProgress,
        payload: { connectId: 'dev-1', appName: 'Cardano', progress: 0.5 },
      });
    });

    it('drops AppInstallProgress events with no matching session', async () => {
      const events: unknown[] = [];
      adapter.on('ui-event', evt => {
        if (evt.type === EConnectorInteraction.AppInstallProgress) {
          events.push(evt);
        }
      });

      // No connectDevice() called → _sessions is empty → forwarder drops.
      connector._emit('ui-event', {
        type: EConnectorInteraction.AppInstallProgress,
        payload: {
          sessionId: 'stale-session',
          appName: 'Cardano',
          progress: 0.1,
        },
      });

      expect(events).toHaveLength(0);
    });

    it('installApp surfaces connector errors as failure response', async () => {
      connector.callImpl.mockRejectedValueOnce(
        Object.assign(new Error('Allow secure connection rejected'), {
          code: HardwareErrorCode.UserAborted,
        })
      );
      await adapter.connectDevice('dev-1');
      const result = await adapter.installApp('dev-1', 'Cardano');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
      }
    });
  });
});

/**
 * Type-only: Ledger's public method signature must not accept Trezor's
 * structured-fields shape — Ledger signs a whole RLP (`serializedTx`).
 */
function typeOnlyLedgerEvmSignTxShape(adapter: LedgerAdapter) {
  void adapter.evmSignTransaction('connect-1', 'device-1', {
    path: "m/44'/60'/0'/0/0",
    chainId: 1,
    // @ts-expect-error Ledger requires serializedTx; structured fields are Trezor-only.
    nonce: '0x1',
    // @ts-expect-error Ledger requires serializedTx; structured fields are Trezor-only.
    gasLimit: '0x5208',
  });
}
void typeOnlyLedgerEvmSignTxShape;
