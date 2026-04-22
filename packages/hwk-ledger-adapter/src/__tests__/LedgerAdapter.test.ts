import { HardwareErrorCode, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';

import { LedgerAdapter } from '../adapter/LedgerAdapter';

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
} {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  const connector = {
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

    call: jest.fn().mockResolvedValue({}),

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
  };

  return connector;
}

describe('LedgerAdapter', () => {
  let adapter: LedgerAdapter;
  let connector: ReturnType<typeof createMockConnector>;

  beforeEach(async () => {
    jest.clearAllMocks();
    connector = createMockConnector();
    adapter = new LedgerAdapter(connector);
  });

  it('should have vendor set to "ledger"', () => {
    expect(adapter.vendor).toBe('ledger');
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

    it('should disconnect without error', async () => {
      await adapter.connectDevice('dev-1');
      await expect(adapter.disconnectDevice('dev-1')).resolves.toBeUndefined();
      expect(connector.disconnect).toHaveBeenCalledWith('session-abc');
    });
  });

  describe('evmGetAddress', () => {
    it('should return address on success', async () => {
      connector.call.mockResolvedValueOnce({
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
      connector.call.mockResolvedValueOnce({
        address: '0xABCD',
        publicKey: '0xpk',
      });

      await adapter.connectDevice('dev-1');
      await adapter.evmGetAddress('dev-1', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: true,
      });

      expect(connector.call).toHaveBeenCalledWith(
        'session-abc',
        'evmGetAddress',
        expect.objectContaining({
          path: "m/44'/60'/0'/0/0",
          showOnDevice: true,
        })
      );
    });
  });

  describe('evmGetAddresses', () => {
    it('should return multiple addresses', async () => {
      connector.call
        .mockResolvedValueOnce({ address: '0xABCD' })
        .mockResolvedValueOnce({ address: '0xDEF0' });

      await adapter.connectDevice('dev-1');
      const result = await adapter.evmGetAddresses('dev-1', '', [
        { path: "m/44'/60'/0'/0/0" },
        { path: "m/44'/60'/0'/0/1" },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload).toHaveLength(2);
      }
    });
  });

  describe('evmSignMessage', () => {
    it('should return signature on success', async () => {
      connector.call.mockResolvedValueOnce({
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
      connector.call.mockResolvedValueOnce({
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
      connector.call.mockRejectedValueOnce(
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

  describe('Solana methods', () => {
    it('should return address for solGetAddress', async () => {
      connector.call.mockResolvedValueOnce({ address: 'SoLAddr123', path: "m/44'/501'/0'" });

      await adapter.connectDevice('dev-1');
      const result = await adapter.solGetAddress('dev-1', '', { path: "m/44'/501'/0'" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.address).toBe('SoLAddr123');
        expect(result.payload.path).toBe("m/44'/501'/0'");
      }
    });

    it('should return signature for solSignTransaction', async () => {
      connector.call.mockResolvedValueOnce({ signature: 'solSig456' });

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
      connector.call.mockResolvedValueOnce({ address: 'bc1qxyz', path: "m/84'/0'/0'" });

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
      connector.call.mockResolvedValueOnce({ xpub: 'xpub6Abc', path: "m/84'/0'/0'" });

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

    it('btcSignTransaction forwards PSBT and returns serialized tx', async () => {
      connector.call.mockResolvedValueOnce({ serializedTx: 'aabbcc' });

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
      connector.call.mockResolvedValueOnce({ signedPsbt: '70736274ff01signed' });

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
      connector.call.mockResolvedValueOnce({ signature: '1fabcd' });

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
      connector.call.mockResolvedValueOnce({ masterFingerprint: 'deadbeef' });

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
      connector.call.mockResolvedValueOnce({
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
      connector.call.mockResolvedValueOnce({ signature: 'trxSig1' });

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
      connector.call.mockResolvedValueOnce({ signature: 'trxMsgSig' });

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
  });

  describe('getAvailableTransports', () => {
    it('should return hid', () => {
      expect(adapter.getAvailableTransports()).toEqual(['hid']);
    });
  });

  describe('switchTransport', () => {
    it('should be a no-op (transport is fixed at connector creation)', async () => {
      await expect(adapter.switchTransport('ble')).resolves.toBeUndefined();
    });
  });

  describe('setUiHandler', () => {
    it('should store the UI handler', () => {
      const handler = { onPinRequest: jest.fn() };
      expect(() => adapter.setUiHandler(handler)).not.toThrow();
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
      connector.call.mockResolvedValueOnce({
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

    it('should retry with fresh connection on disconnect error', async () => {
      // First: establish a session
      await adapter.connectDevice('dev-1');

      // Simulate disconnect error on first call, success on retry
      connector.call
        .mockRejectedValueOnce(
          Object.assign(new Error('session not found'), { _tag: 'DeviceSessionNotFound' })
        )
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

      const result = await adapter.evmGetAddress('dev-1', '', {
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

    it('should auto-select first device when multiple devices found and handleSelectDevice is off (default)', async () => {
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
      connector.call.mockResolvedValueOnce({ address: '0xFALLBACK' });

      // No UI handler set — should fall back to first device
      const result = await adapter.evmGetAddress('', '', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
      });

      expect(result.success).toBe(true);
      expect(connector.connect).toHaveBeenCalledWith('dev-A');
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
});
