import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';

import { LedgerAdapter } from '../adapter/LedgerAdapter';

import type { ConnectorDevice, ConnectorSession, IConnector } from '@onekeyfe/hwk-adapter-core';

function createMockConnector(): IConnector {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    searchDevices: vi.fn().mockResolvedValue([
      {
        connectId: 'dev-1',
        deviceId: 'dev-1',
        name: 'Nano X',
        model: 'nanoX',
      } as ConnectorDevice,
    ]),

    connect: vi.fn().mockResolvedValue({
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

    disconnect: vi.fn().mockResolvedValue(undefined),
    call: vi.fn().mockResolvedValue({}),
    cancel: vi.fn().mockResolvedValue(undefined),

    uiResponse: vi.fn(),

    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    }),

    off: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    }),

    reset: vi.fn(),
  };
}

describe('LedgerAdapter Integration', () => {
  let connector: ReturnType<typeof createMockConnector>;
  let adapter: LedgerAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    connector = createMockConnector();
    adapter = new LedgerAdapter(connector);
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  it('should complete full flow: search -> connect -> getAddress -> signTx', async () => {
    const devices = await adapter.searchDevices();
    expect(devices.length).toBeGreaterThanOrEqual(1);
    expect(devices[0].vendor).toBe('ledger');
    expect(devices[0].model).toBe('nanoX');

    await adapter.connectDevice('dev-1');

    // Mock evmGetAddress response
    (connector.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      publicKey: '0xpk',
    });

    const addrResult = await adapter.evmGetAddress('dev-1', '', {
      path: "m/44'/60'/0'/0/0",
    });
    expect(addrResult.success).toBe(true);
    if (addrResult.success) {
      expect(addrResult.payload.address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
    }

    // Mock evmSignTransaction response
    (connector.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      v: '0x1c',
      r: '0xaabb',
      s: '0xccdd',
    });

    const signResult = await adapter.evmSignTransaction('dev-1', '', {
      path: "m/44'/60'/0'/0/0",
      serializedTx: '0x02e50180843b9aca00825208940000000000000000000000000000000000000000808080',
    });
    expect(signResult.success).toBe(true);
    if (signResult.success) {
      // Adapter passes through the connector result as-is
      expect(signResult.payload.r).toBe('0xaabb');
      expect(signResult.payload.s).toBe('0xccdd');
    }
  });

  it('should emit ui-request-device-connect event when device is locked', async () => {
    // Mock connector.call to throw a locked error on both initial call and retry
    (connector.call as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(Object.assign(new Error('locked'), { errorCode: '5515' }))
      .mockRejectedValueOnce(Object.assign(new Error('locked'), { errorCode: '5515' }));

    await adapter.connectDevice('dev-1');

    const unlockListener = vi.fn();
    adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, (event: any) => {
      unlockListener(event);
      // Confirm the prompt so the adapter retries (and gets the second locked error)
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
        payload: { confirmed: true },
      });
    });

    const result = await adapter.evmGetAddress('dev-1', '', {
      path: "m/44'/60'/0'/0/0",
    });

    expect(result.success).toBe(false);
    expect(unlockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-request-device-connect',
        payload: expect.objectContaining({ message: expect.any(String) }),
      })
    );
  });
});
