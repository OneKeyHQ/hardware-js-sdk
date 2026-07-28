import transport, {
  ProtocolV2,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkError,
} from '@onekeyfe/hd-transport';

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
      webusb.protocolV2Assemblers.get(path)?.reset();
    });

    await expect(
      webusb.callProtocolV2(path, 'Ping', { message: 'timeout' }, { timeoutMs: 10 })
    ).rejects.toThrow('timeout');

    expect(webusb.resetConnectionAfterProbe).toHaveBeenCalledWith(path);
    expect(webusb.protocolV2Sessions.has(path)).toBe(false);
  });

  test.each(['router', 'packet-source', 'ack-sequence', 'response-sequence', 'frame'] as const)(
    'invalidates cached state for typed Protocol V2 %s errors',
    async code => {
      const webusb = new WebUsbTransport() as any;
      const path = 'pro2-webusb';
      webusb.messages = transport.parseConfigure(schema);
      webusb.messagesV2 = transport.parseConfigure(schema);
      webusb.protocolV2Assemblers.set(path, new ProtocolV2FrameAssembler());
      webusb.transferOutOnce = jest.fn().mockResolvedValue(undefined);
      const recoveredResponse = ProtocolV2.encodeFrame(
        { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
        'Success',
        { message: 'recovered' },
        { seq: 1 }
      );
      webusb.receiveProtocolV2Frame = jest
        .fn()
        .mockRejectedValueOnce(
          new ProtocolV2LinkError(code, `Protocol V2 ${code} validation failed`)
        )
        .mockResolvedValue(recoveredResponse);
      webusb.resetConnectionAfterProbe = jest.fn().mockImplementation(() => {
        webusb.protocolV2Sessions.delete(path);
        webusb.protocolV2Assemblers.get(path)?.reset();
      });

      await expect(webusb.callProtocolV2(path, 'Ping', { message: 'mismatch' })).rejects.toThrow(
        `${code} validation failed`
      );

      expect(webusb.resetConnectionAfterProbe).toHaveBeenCalledWith(path);
      expect(webusb.protocolV2Sessions.has(path)).toBe(false);

      await expect(
        webusb.callProtocolV2(path, 'Ping', { message: 'after-reset' })
      ).resolves.toMatchObject({
        type: 'Success',
        message: { message: 'recovered' },
      });
    }
  );

  test('does not discard buffered Protocol V2 frames before each call', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    const assembler = new ProtocolV2FrameAssembler();
    const reset = jest.spyOn(assembler, 'reset');
    let responseSequence = 0;
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.protocolV2Assemblers.set(path, assembler);
    webusb.transferOutOnce = jest.fn().mockResolvedValue(undefined);
    webusb.receiveProtocolV2Frame = jest.fn().mockImplementation(() => {
      responseSequence += 1;
      const response = ProtocolV2.encodeFrame(
        { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
        'Success',
        { message: 'ok' },
        { seq: responseSequence }
      );
      return Promise.resolve(response);
    });

    await webusb.callProtocolV2(path, 'Ping', { message: 'first' });
    await webusb.callProtocolV2(path, 'Ping', { message: 'second' });

    expect(reset).not.toHaveBeenCalled();
  });

  test('keeps queued Protocol V2 read timeouts scoped to each call', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    let responseSequence = 0;
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.transferOutOnce = jest.fn().mockResolvedValue(undefined);
    webusb.receiveProtocolV2Frame = jest.fn().mockImplementation(() => {
      responseSequence += 1;
      return Promise.resolve(
        ProtocolV2.encodeFrame(
          { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
          'Success',
          { message: 'ok' },
          { seq: responseSequence }
        )
      );
    });

    await Promise.all([
      webusb.callProtocolV2(path, 'Ping', { message: 'long' }, { timeoutMs: 1_000 }),
      webusb.callProtocolV2(path, 'Ping', { message: 'short' }, { timeoutMs: 25 }),
    ]);

    expect(
      webusb.receiveProtocolV2Frame.mock.calls.map(([, timeoutMs]: unknown[]) => timeoutMs)
    ).toEqual([1_000, 25]);
  });
});
