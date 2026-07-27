import transport, { ProtocolV2FrameAssembler } from '@onekeyfe/hd-transport';

import WebUsbTransport from '../src/webusb';

const schema = {
  nested: {
    Ping: { fields: { message: { type: 'string', id: 1 } } },
    Success: { fields: { message: { type: 'string', id: 1 } } },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
      },
    },
  },
};

describe('WebUsbTransport Protocol V2 timeout recovery', () => {
  test('resets the connection between a failed V1 probe and the V2 probe', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    const events: string[] = [];
    webusb.probeProtocolV1 = jest.fn().mockImplementation(() => {
      events.push('probe-v1');
      return Promise.resolve(false);
    });
    webusb.resetConnectionAfterProbe = jest.fn().mockImplementation(() => {
      events.push('reset');
      return Promise.resolve();
    });
    webusb.probeProtocolV2 = jest.fn().mockImplementation(() => {
      events.push('probe-v2');
      return Promise.resolve(true);
    });

    await expect(webusb.detectProtocol(path)).resolves.toBe('V2');

    expect(events).toEqual(['probe-v1', 'reset', 'probe-v2']);
    expect(webusb.deviceProtocol.get(path)).toBe('V2');
  });

  test('invalidates and resets the cached connection before another call can start', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.protocolV2Assemblers.set(path, new ProtocolV2FrameAssembler());
    webusb.transferOutOnce = jest.fn().mockResolvedValue(undefined);
    webusb.receiveProtocolV2Frame = jest.fn(() => new Promise<void>(() => {}));
    webusb.resetConnectionAfterProbe = jest.fn().mockImplementation(() => {
      webusb.protocolV2Sessions.delete(path);
      webusb.protocolV2ReadTimeouts.delete(path);
      webusb.protocolV2Assemblers.get(path)?.reset();
    });

    await expect(
      webusb.callProtocolV2(path, 'Ping', { message: 'timeout' }, { timeoutMs: 10 })
    ).rejects.toThrow('timeout');

    expect(webusb.resetConnectionAfterProbe).toHaveBeenCalledWith(path);
    expect(webusb.protocolV2Sessions.has(path)).toBe(false);
  });
});
