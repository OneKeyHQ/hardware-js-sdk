import WebSocket from 'ws';

import { LedgerAttestationRelayServer } from '../LedgerAttestationRelayServer';

import type { LedgerRelayClientMessage, LedgerRelayServerMessage } from '../protocol';

const waitForOpen = (socket: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

describe('LedgerAttestationRelayServer', () => {
  let server: LedgerAttestationRelayServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('owns the DMK result while the client only forwards APDUs', async () => {
    const runGenuineCheck = jest.fn(async bridge => {
      const response = await bridge.exchangeApdu(
        Uint8Array.from([0xe0, 0x01, 0x00, 0x00, 0x00]),
        2_000
      );
      expect(Buffer.from(response.data).toString('hex')).toBe('abcd');
      expect(Buffer.from(response.statusCode).toString('hex')).toBe('9000');
      return {
        isGenuine: true,
        deviceId: 'ab'.repeat(32),
      };
    });
    server = await LedgerAttestationRelayServer.listen({
      host: '127.0.0.1',
      port: 0,
      runGenuineCheck,
    });
    const ticket = server.createSession();
    const socket = new WebSocket(ticket.webSocketUrl);
    await waitForOpen(socket);

    socket.on('message', raw => {
      const message = JSON.parse(raw.toString()) as LedgerRelayServerMessage;
      if (message.type === 'apdu-request') {
        socket.send(
          JSON.stringify({
            type: 'apdu-response',
            requestId: message.requestId,
            dataHex: 'abcd',
            statusCodeHex: '9000',
          } satisfies LedgerRelayClientMessage)
        );
      }
    });
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        device: {
          id: 'local-ledger',
          modelId: 'nanoX',
          name: 'Ledger Nano X',
        },
      } satisfies LedgerRelayClientMessage)
    );

    await expect(ticket.result).resolves.toEqual({
      isGenuine: true,
      deviceId: 'ab'.repeat(32),
    });
    expect(runGenuineCheck).toHaveBeenCalledTimes(1);
    expect(runGenuineCheck.mock.calls[0][1]).toMatchObject({
      id: 'local-ledger',
      modelId: 'nanoX',
      name: 'Ledger Nano X',
    });
  });

  it('rejects reuse of a consumed single-use session token', async () => {
    server = await LedgerAttestationRelayServer.listen({
      host: '127.0.0.1',
      port: 0,
      runGenuineCheck: async () => ({
        isGenuine: true,
        deviceId: 'cd'.repeat(32),
      }),
    });
    const ticket = server.createSession();
    const first = new WebSocket(ticket.webSocketUrl);
    await waitForOpen(first);
    first.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        device: { id: 'ledger', modelId: 'nanoX' },
      } satisfies LedgerRelayClientMessage)
    );
    await ticket.result;

    const second = new WebSocket(ticket.webSocketUrl);
    const closeCode = await new Promise<number>((resolve, reject) => {
      second.once('close', resolve);
      second.once('error', reject);
    });
    expect(closeCode).toBe(4404);
  });

  it('supports a TLS reverse-proxy public WSS base for production deployment', async () => {
    server = await LedgerAttestationRelayServer.listen({
      host: '127.0.0.1',
      port: 0,
      publicWebSocketBaseUrl: 'wss://attestation.onekey.test/',
      runGenuineCheck: async () => ({
        isGenuine: true,
        deviceId: 'ef'.repeat(32),
      }),
    });

    const ticket = server.createSession();
    void ticket.result.catch(() => undefined);
    expect(ticket.webSocketUrl).toMatch(
      /^wss:\/\/attestation\.onekey\.test\/v1\/ledger\/attestation\/[0-9a-f]{64}$/
    );
  });

  it('fails closed if a genuine verdict has no valid physical-device DSID', async () => {
    server = await LedgerAttestationRelayServer.listen({
      host: '127.0.0.1',
      port: 0,
      runGenuineCheck: async () => ({
        isGenuine: true,
        deviceId: 'client-controlled-value',
      }),
    });
    const ticket = server.createSession();
    const socket = new WebSocket(ticket.webSocketUrl);
    await waitForOpen(socket);
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        device: { id: 'ledger', modelId: 'nanoX' },
      } satisfies LedgerRelayClientMessage)
    );

    await expect(ticket.result).rejects.toThrow('valid physical-device DSID');
  });
});
