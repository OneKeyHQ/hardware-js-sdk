import transport, {
  PROTOCOL_V2_CHANNEL_USB,
  ProtocolV2,
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
  test('keeps active links when the Protocol V2 schema is configured repeatedly', () => {
    const webusb = new WebUsbTransport() as any;
    webusb.invalidateAllProtocolV2UsbLinks = jest.fn().mockResolvedValue(undefined);
    const schemaSource = JSON.stringify(schema);

    webusb.configureProtocolV2(schemaSource);
    webusb.configureProtocolV2(schemaSource);

    expect(webusb.invalidateAllProtocolV2UsbLinks).not.toHaveBeenCalled();

    webusb.configureProtocolV2(
      JSON.stringify({
        ...schema,
        nested: {
          ...schema.nested,
          Failure: { fields: { message: { type: 'string', id: 1 } } },
        },
      })
    );
    expect(webusb.invalidateAllProtocolV2UsbLinks).toHaveBeenCalledWith(
      'Protocol V2 schema reconfigured'
    );
  });

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

  test('retries an expected Protocol V2 probe once after resetting the connection', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.probeProtocolV1 = jest.fn();
    webusb.probeProtocolV2 = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    webusb.resetConnectionAfterProbe = jest.fn().mockResolvedValue(undefined);

    await expect(webusb.detectProtocol(path, 'V2')).resolves.toBe('V2');

    expect(webusb.probeProtocolV2).toHaveBeenCalledTimes(2);
    expect(webusb.probeProtocolV1).not.toHaveBeenCalled();
    expect(webusb.resetConnectionAfterProbe).toHaveBeenCalledTimes(1);
    expect(webusb.deviceProtocol.get(path)).toBe('V2');
  });

  test('reports a Protocol V2 probe timeout only after the bounded retry is exhausted', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.probeProtocolV1 = jest.fn();
    webusb.probeProtocolV2 = jest.fn().mockResolvedValue(false);
    webusb.resetConnectionAfterProbe = jest.fn().mockResolvedValue(undefined);

    await expect(webusb.detectProtocol(path, 'V2')).rejects.toThrow(
      'Protocol V2 probe timeout after 2 attempts'
    );

    expect(webusb.probeProtocolV2).toHaveBeenCalledTimes(2);
    expect(webusb.probeProtocolV1).not.toHaveBeenCalled();
    expect(webusb.resetConnectionAfterProbe).toHaveBeenCalledTimes(2);
    expect(webusb.deviceProtocol.has(path)).toBe(false);
  });

  test('invalidates and resets the cached connection before another call can start', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    webusb.readProtocolV2UsbPacket = jest.fn(() => new Promise<void>(() => {}));
    webusb.resetProtocolV2UsbNativeLink = jest.fn().mockResolvedValue(undefined);
    webusb.resetConnectionAfterProbe = jest.fn();
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    await expect(
      webusb.callProtocolV2(path, 'Ping', { message: 'timeout' }, { timeoutMs: 10 })
    ).rejects.toThrow('timeout');

    expect(webusb.resetProtocolV2UsbNativeLink).toHaveBeenCalledWith(
      path,
      expect.stringContaining('timeout')
    );
    expect(webusb.resetConnectionAfterProbe).not.toHaveBeenCalled();
  });

  test('does not reconnect inside a Protocol V2 frame read after a USB I/O failure', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    webusb.readProtocolV2UsbPacket = jest
      .fn()
      .mockRejectedValue(new Error('NetworkError: transferIn device disconnected'));
    webusb.resetProtocolV2UsbNativeLink = jest.fn().mockResolvedValue(undefined);
    webusb.resetConnectionAfterProbe = jest.fn();
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    await expect(webusb.callProtocolV2(path, 'Ping', { message: 'read-error' })).rejects.toThrow(
      'NetworkError'
    );

    expect(webusb.readProtocolV2UsbPacket).toHaveBeenCalledTimes(1);
    expect(webusb.resetProtocolV2UsbNativeLink).toHaveBeenCalledWith(
      path,
      expect.stringContaining('NetworkError')
    );
    expect(webusb.resetConnectionAfterProbe).not.toHaveBeenCalled();
  });

  test('rejects an active Protocol V2 read without reconnecting after release', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    let markReadStarted: () => void = () => undefined;
    const readStarted = new Promise<void>(resolve => {
      markReadStarted = resolve;
    });
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    webusb.readProtocolV2UsbPacket = jest.fn().mockImplementation(() => {
      markReadStarted();
      return new Promise<void>(() => {});
    });
    webusb.closeOpenDevice = jest.fn().mockResolvedValue(undefined);
    webusb.connect = jest.fn();
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    const call = webusb.callProtocolV2(path, 'Ping', { message: 'release' });
    await readStarted;
    await webusb.release(path);

    await expect(call).rejects.toThrow('WebUSB transport released');
    expect(webusb.connect).not.toHaveBeenCalled();
  });

  test.each(['router', 'packet-source', 'ack-sequence', 'response-sequence', 'frame'] as const)(
    'invalidates cached state for typed Protocol V2 %s errors',
    async code => {
      const webusb = new WebUsbTransport() as any;
      const path = 'pro2-webusb';
      webusb.messages = transport.parseConfigure(schema);
      webusb.messagesV2 = transport.parseConfigure(schema);
      webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
      const recoveredResponse = ProtocolV2.encodeFrame(
        { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
        'Success',
        { message: 'recovered' },
        { seq: 1 }
      );
      webusb.readProtocolV2UsbPacket = jest
        .fn()
        .mockRejectedValueOnce(
          new ProtocolV2LinkError(code, `Protocol V2 ${code} validation failed`)
        )
        .mockResolvedValue(recoveredResponse);
      webusb.resetProtocolV2UsbNativeLink = jest.fn().mockResolvedValue(undefined);
      webusb.resetConnectionAfterProbe = jest.fn();
      await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

      await expect(webusb.callProtocolV2(path, 'Ping', { message: 'mismatch' })).rejects.toThrow(
        `${code} validation failed`
      );

      expect(webusb.resetProtocolV2UsbNativeLink).toHaveBeenCalledWith(
        path,
        expect.stringContaining(`${code} validation failed`)
      );
      expect(webusb.resetConnectionAfterProbe).not.toHaveBeenCalled();

      await webusb.rotateProtocolV2UsbGeneration(path, 'test reconnect');
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
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    const firstResponse = ProtocolV2.encodeFrame(
      { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
      'Success',
      { message: 'first' },
      { router: PROTOCOL_V2_CHANNEL_USB, seq: 1 }
    );
    const secondResponse = ProtocolV2.encodeFrame(
      { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
      'Success',
      { message: 'second' },
      { router: PROTOCOL_V2_CHANNEL_USB, seq: 2 }
    );
    const coalescedResponses = new Uint8Array(firstResponse.length + secondResponse.length);
    coalescedResponses.set(firstResponse);
    coalescedResponses.set(secondResponse, firstResponse.length);
    webusb.readProtocolV2UsbPacket = jest.fn().mockResolvedValue(coalescedResponses);
    webusb.resetProtocolV2UsbNativeLink = jest.fn().mockResolvedValue(undefined);
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    await expect(webusb.callProtocolV2(path, 'Ping', { message: 'first' })).resolves.toMatchObject({
      type: 'Success',
      message: { message: 'first' },
    });
    await expect(webusb.callProtocolV2(path, 'Ping', { message: 'second' })).resolves.toMatchObject(
      {
        type: 'Success',
        message: { message: 'second' },
      }
    );

    expect(webusb.readProtocolV2UsbPacket).toHaveBeenCalledTimes(1);
  });

  test('keeps queued Protocol V2 read timeouts scoped to each call', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    let responseSequence = 0;
    const readTimeouts: number[] = [];
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    webusb.readProtocolV2UsbPacket = jest.fn().mockImplementation((_path, context) => {
      responseSequence += 1;
      readTimeouts.push(context.timeoutMs);
      return Promise.resolve(
        ProtocolV2.encodeFrame(
          { protocolV1: webusb.messages, protocolV2: webusb.messagesV2 },
          'Success',
          { message: 'ok' },
          { seq: responseSequence }
        )
      );
    });
    webusb.resetProtocolV2UsbNativeLink = jest.fn().mockResolvedValue(undefined);
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    await Promise.all([
      webusb.callProtocolV2(path, 'Ping', { message: 'long' }, { timeoutMs: 1_000 }),
      webusb.callProtocolV2(path, 'Ping', { message: 'short' }, { timeoutMs: 25 }),
    ]);

    expect(readTimeouts).toEqual([1_000, 25]);
  });
});
