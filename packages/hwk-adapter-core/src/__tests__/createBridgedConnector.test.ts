import { createBridgedConnector } from '../types/connector';

import type { ConnectorEventType, IHardwareBridge } from '../types/connector';

function createMockBridge(): IHardwareBridge & {
  _emit: (event: { type: ConnectorEventType; data: unknown }) => void;
  _handlers: Set<(event: { type: ConnectorEventType; data: unknown }) => void>;
} {
  const handlers = new Set<(event: { type: ConnectorEventType; data: unknown }) => void>();

  return {
    _handlers: handlers,
    _emit(event) {
      for (const h of handlers) h(event);
    },

    searchDevices: jest.fn().mockResolvedValue([]),
    connect: jest.fn().mockResolvedValue({ sessionId: 's', deviceInfo: {} }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    call: jest.fn().mockResolvedValue({}),
    cancel: jest.fn().mockResolvedValue(undefined),
    uiResponse: jest.fn(),
    reset: jest.fn(),

    onEvent: jest.fn().mockImplementation((_params, handler) => {
      handlers.add(handler);
    }),
    offEvent: jest.fn().mockImplementation((_params, handler) => {
      handlers.delete(handler);
    }),
  };
}

describe('createBridgedConnector', () => {
  it('forwards events to registered handlers', () => {
    const bridge = createMockBridge();
    const connector = createBridgedConnector('ledger', 'usb', bridge);
    const handler = jest.fn();

    connector.on('device-connect', handler);
    bridge._emit({
      type: 'device-connect',
      data: { device: { connectId: 'x', deviceId: 'x', name: 'n' } },
    });

    expect(handler).toHaveBeenCalledWith({
      device: { connectId: 'x', deviceId: 'x', name: 'n' },
    });
  });

  it('off() unregisters the correct bridge handler', () => {
    const bridge = createMockBridge();
    const connector = createBridgedConnector('ledger', 'usb', bridge);
    const handler = jest.fn();

    connector.on('device-connect', handler);
    expect(bridge._handlers.size).toBe(1);

    connector.off('device-connect', handler);
    expect(bridge._handlers.size).toBe(0);
  });

  it('does NOT leak when the same function is registered for multiple events', () => {
    const bridge = createMockBridge();
    const connector = createBridgedConnector('ledger', 'usb', bridge);
    const handler = jest.fn();

    connector.on('device-connect', handler);
    connector.on('device-disconnect', handler);
    expect(bridge._handlers.size).toBe(2);

    // off for one event leaves the other subscription intact
    connector.off('device-connect', handler);
    expect(bridge._handlers.size).toBe(1);

    // remaining subscription still fires for its event
    handler.mockClear();
    bridge._emit({ type: 'device-disconnect', data: { connectId: 'x' } });
    expect(handler).toHaveBeenCalledTimes(1);

    // and does NOT fire for the unregistered event
    handler.mockClear();
    bridge._emit({
      type: 'device-connect',
      data: { device: { connectId: 'x', deviceId: 'x', name: 'n' } },
    });
    expect(handler).not.toHaveBeenCalled();

    // clean up the last subscription
    connector.off('device-disconnect', handler);
    expect(bridge._handlers.size).toBe(0);
  });

  it('off() with wrong event is a no-op (does not remove unrelated subscription)', () => {
    const bridge = createMockBridge();
    const connector = createBridgedConnector('ledger', 'usb', bridge);
    const handler = jest.fn();

    connector.on('device-connect', handler);
    connector.off('device-disconnect', handler); // wrong event
    expect(bridge._handlers.size).toBe(1);
  });
});
