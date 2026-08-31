import {
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  deriveDeviceFingerprint,
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

  describe('connectDevice / disconnectDevice', () => {
    it('should connect and return connectId', async () => {
      const result = await adapter.connectDevice('dev-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toBe('dev-1');
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
        expect(result.payload).toBe('dev-1');
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
      await adapter.connectDevice('dev-1');
      await expect(adapter.disconnectDevice('dev-1')).resolves.toBeUndefined();
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
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
      // 1 stuck + 1 successful retry; connector.reset called between them.
      expect(connector.call).toHaveBeenCalledTimes(2);
      expect(connector.reset).toHaveBeenCalled();
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

    it('should retry with a recovered USB connectId when fingerprint verification is available', async () => {
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('0xRETRY');
      }
      // Should have reconnected with the new device
      expect(connector.connect).toHaveBeenCalledWith('dev-new');
      // The retry call should use the new session
      expect(connector.call).toHaveBeenLastCalledWith(
        'session-new',
        'evmGetAddress',
        expect.any(Object)
      );
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
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
        expect(result.payload.error).toContain('Target Ledger unavailable: dev-1');
      }
      expect(connector.connect).not.toHaveBeenCalledWith('dev-new');
    });

    it('should reconnect the original target after timeout reset', async () => {
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

      const result = await adapter.evmSignMessage('dev-1', expectedFingerprint, {
        path: "m/44'/60'/0'/0/0",
        message: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenLastCalledWith('dev-1');
      expect(connector.call).toHaveBeenLastCalledWith(
        'session-target',
        'evmSignMessage',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0", message: 'Hello' })
      );
    });

    it('should reset dirty timeout retry state before the next chain call', async () => {
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
        .mockRejectedValueOnce(
          Object.assign(new Error('InvalidResponseFormatError'), {
            _tag: 'InvalidResponseFormatError',
          })
        )
        .mockResolvedValueOnce({ address: '0xRECOVERED', publicKey: '0xpk' });

      const failed = await adapter.btcGetPublicKey('dev-1', '', {
        path: "m/44'/0'/0'",
        showOnDevice: false,
      });
      expect(failed.success).toBe(false);
      expect(connector.reset).toHaveBeenCalledTimes(2);

      const recovered = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(recovered.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledTimes(3);
      expect(connector.call).toHaveBeenLastCalledWith(
        'session-final',
        'evmGetAddress',
        expect.objectContaining({ path: "m/44'/60'/0'/0/0" })
      );
    });

    it('should reject multiple USB devices instead of auto-selecting the first one', async () => {
      connector.searchDevices.mockResolvedValueOnce([
        { connectId: 'dev-A', deviceId: 'dev-A', name: 'Nano X', model: 'nanoX' },
        { connectId: 'dev-B', deviceId: 'dev-B', name: 'Nano S', model: 'nanoS' },
      ]);
      connector.connect.mockResolvedValueOnce({
        sessionId: 'session-A',
        deviceInfo: {
          vendor: 'ledger',
          model: 'nanoX',
          firmwareVersion: 'unknown',
          deviceId: 'dev-A',
          connectId: 'dev-A',
          connectionType: 'usb',
        },
      });
      connector.callImpl.mockResolvedValueOnce({ address: '0xFALLBACK' });

      const result = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.DeviceOneDeviceOnly);
        expect(result.payload.error).toContain('Multiple Ledger USB devices are connected');
      }
      expect(connector.connect).not.toHaveBeenCalled();
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

    it('should retry BLE connection-level errors with the original connectId', async () => {
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

      expect(result.success).toBe(true);
      expect(bleConnector.connect).toHaveBeenLastCalledWith('A58F');
      expect(bleConnector.connect).not.toHaveBeenCalledWith(undefined);
      expect(bleConnector.call).toHaveBeenLastCalledWith(
        'session-a58f-retry',
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
