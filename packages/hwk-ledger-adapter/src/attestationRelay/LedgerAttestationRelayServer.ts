import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import WebSocket from 'ws';

import {
  DEFAULT_LEDGER_RELAY_SESSION_TTL_MS,
  LEDGER_ATTESTATION_RELAY_PROTOCOL_VERSION,
  MAX_LEDGER_RELAY_APDU_BYTES,
  MAX_LEDGER_RELAY_APDU_EXCHANGES,
  parseLedgerRelayClientMessage,
} from './protocol';
import { runLedgerDmkGenuineCheck } from './runLedgerDmkGenuineCheck';

import type { AddressInfo } from 'node:net';
import type {
  LedgerRelayClientMessage,
  LedgerRelayDevice,
  LedgerRelayServerMessage,
} from './protocol';
import type {
  LedgerRelayApduBridge,
  LedgerRelayApduResponse,
} from './relayTransport';
import type { LedgerServerGenuineCheckResult } from './runLedgerDmkGenuineCheck';

type RelaySession = {
  expiresAt: number;
  consumed: boolean;
  expiryTimer: ReturnType<typeof setTimeout>;
  resolve: (result: LedgerServerGenuineCheckResult) => void;
  reject: (error: Error) => void;
};

type PendingApdu = {
  requestId: string;
  resolve: (response: LedgerRelayApduResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type LedgerAttestationRelayTicket = {
  webSocketUrl: string;
  expiresAt: number;
  result: Promise<LedgerServerGenuineCheckResult>;
};

export type RunLedgerServerGenuineCheck = (
  bridge: LedgerRelayApduBridge,
  device: LedgerRelayDevice
) => Promise<LedgerServerGenuineCheckResult>;

const sendMessage = (socket: WebSocket, message: LedgerRelayServerMessage) => {
  socket.send(JSON.stringify(message));
};

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class LedgerAttestationRelayServer {
  private readonly sessions = new Map<string, RelaySession>();

  private constructor(
    private readonly httpServer: ReturnType<typeof createServer>,
    private readonly webSocketServer: WebSocket.Server,
    private readonly baseUrl: string,
    private readonly sessionTtlMs: number,
    private readonly runGenuineCheck: RunLedgerServerGenuineCheck
  ) {
    webSocketServer.on('connection', (socket, request) => {
      this.handleConnection(socket, request.url ?? '/');
    });
  }

  static async listen(options?: {
    host?: string;
    port?: number;
    sessionTtlMs?: number;
    publicWebSocketBaseUrl?: string;
    runGenuineCheck?: RunLedgerServerGenuineCheck;
  }): Promise<LedgerAttestationRelayServer> {
    const host = options?.host ?? '127.0.0.1';
    if (options?.publicWebSocketBaseUrl) {
      let parsedPublicUrl: URL;
      try {
        parsedPublicUrl = new URL(options.publicWebSocketBaseUrl);
      } catch {
        throw new Error('Ledger relay public WebSocket base URL is invalid');
      }
      if (
        (parsedPublicUrl.protocol !== 'ws:' &&
          parsedPublicUrl.protocol !== 'wss:') ||
        parsedPublicUrl.username ||
        parsedPublicUrl.password ||
        parsedPublicUrl.search ||
        parsedPublicUrl.hash
      ) {
        throw new Error('Ledger relay public WebSocket base URL is invalid');
      }
    }
    const httpServer = createServer();
    const webSocketServer = new WebSocket.Server({
      server: httpServer,
      maxPayload: MAX_LEDGER_RELAY_APDU_BYTES * 2 + 4_096,
    });
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(options?.port ?? 0, host, () => {
        httpServer.off('error', reject);
        resolve();
      });
    });
    const address = httpServer.address() as AddressInfo;
    const publicWebSocketBaseUrl =
      options?.publicWebSocketBaseUrl ?? `ws://${host}:${address.port}`;
    return new LedgerAttestationRelayServer(
      httpServer,
      webSocketServer,
      publicWebSocketBaseUrl.replace(/\/+$/, ''),
      options?.sessionTtlMs ?? DEFAULT_LEDGER_RELAY_SESSION_TTL_MS,
      options?.runGenuineCheck ?? runLedgerDmkGenuineCheck
    );
  }

  createSession(): LedgerAttestationRelayTicket {
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.sessionTtlMs;
    let resolve!: (result: LedgerServerGenuineCheckResult) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<LedgerServerGenuineCheckResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const expiryTimer = setTimeout(() => {
      const session = this.sessions.get(token);
      if (!session || session.consumed) return;
      this.sessions.delete(token);
      session.reject(new Error('Ledger attestation relay session expired'));
    }, this.sessionTtlMs);
    expiryTimer.unref?.();
    this.sessions.set(token, {
      expiresAt,
      consumed: false,
      expiryTimer,
      resolve,
      reject,
    });
    return {
      webSocketUrl: `${this.baseUrl}/v1/ledger/attestation/${token}`,
      expiresAt,
      result,
    };
  }

  private handleConnection(socket: WebSocket, rawUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl, this.baseUrl);
    } catch {
      socket.close(4400, 'invalid-url');
      return;
    }
    if (parsed.search || parsed.hash) {
      socket.close(4400, 'invalid-url');
      return;
    }
    const match = parsed.pathname.match(
      /^\/v1\/ledger\/attestation\/([0-9a-f]{64})$/
    );
    const token = match?.[1];
    if (!token) {
      socket.close(4404, 'session-not-found');
      return;
    }
    const session = this.sessions.get(token);
    if (
      !session ||
      session.consumed ||
      session.expiresAt <= Date.now()
    ) {
      socket.close(4404, 'session-not-found');
      return;
    }
    session.consumed = true;
    clearTimeout(session.expiryTimer);
    this.sessions.delete(token);
    let helloReceived = false;
    let finished = false;
    let exchangeCount = 0;
    let pendingApdu: PendingApdu | undefined;

    const fail = (error: unknown, closeCode = 4400) => {
      if (finished) return;
      finished = true;
      const normalized = asError(error);
      if (pendingApdu) {
        clearTimeout(pendingApdu.timer);
        pendingApdu.reject(normalized);
        pendingApdu = undefined;
      }
      session.reject(normalized);
      if (socket.readyState === WebSocket.OPEN) {
        sendMessage(socket, {
          type: 'error',
          code: 'ledger_attestation_failed',
          message: normalized.message,
        });
        socket.close(closeCode, 'attestation-failed');
      }
    };

    const bridge: LedgerRelayApduBridge = {
      exchangeApdu: (apdu, timeoutMs = 30_000) => {
        if (finished || socket.readyState !== WebSocket.OPEN) {
          return Promise.reject(new Error('Ledger relay client disconnected'));
        }
        if (pendingApdu) {
          return Promise.reject(
            new Error('Ledger relay permits only one outstanding APDU')
          );
        }
        if (apdu.byteLength > MAX_LEDGER_RELAY_APDU_BYTES) {
          return Promise.reject(new Error('Ledger relay APDU is too large'));
        }
        exchangeCount += 1;
        if (exchangeCount > MAX_LEDGER_RELAY_APDU_EXCHANGES) {
          return Promise.reject(
            new Error('Ledger relay APDU exchange limit exceeded')
          );
        }
        const requestId = randomUUID();
        return new Promise<LedgerRelayApduResponse>((resolve, reject) => {
          const boundedTimeout = Math.max(1_000, Math.min(timeoutMs, 60_000));
          const timer = setTimeout(() => {
            pendingApdu = undefined;
            reject(new Error('Ledger relay APDU timed out'));
          }, boundedTimeout);
          pendingApdu = { requestId, resolve, reject, timer };
          sendMessage(socket, {
            type: 'apdu-request',
            requestId,
            apduHex: Buffer.from(apdu).toString('hex'),
            timeoutMs: boundedTimeout,
          });
        });
      },
      onInteraction: requiredUserInteraction => {
        if (!finished && socket.readyState === WebSocket.OPEN) {
          sendMessage(socket, {
            type: 'interaction',
            requiredUserInteraction,
          });
        }
      },
    };

    const handleClientMessage = (message: LedgerRelayClientMessage) => {
      if (!helloReceived) {
        if (message.type !== 'hello') {
          throw new Error('Ledger relay expected hello first');
        }
        helloReceived = true;
        sendMessage(socket, {
          type: 'ready',
          protocolVersion: LEDGER_ATTESTATION_RELAY_PROTOCOL_VERSION,
        });
        void this.runGenuineCheck(bridge, message.device).then(
          result => {
            if (finished) return;
            if (
              result.isGenuine === true &&
              (!result.deviceId || !/^[0-9a-f]{64}$/i.test(result.deviceId))
            ) {
              fail(
                new Error(
                  'Ledger server Genuine Check succeeded without a valid physical-device DSID'
                )
              );
              return;
            }
            finished = true;
            const authoritativeResult: LedgerServerGenuineCheckResult =
              result.isGenuine === true
                ? result
                : { isGenuine: false, deviceId: undefined };
            session.resolve(authoritativeResult);
            sendMessage(socket, {
              type: 'result',
              isGenuine: authoritativeResult.isGenuine,
              deviceId: authoritativeResult.deviceId,
            });
            socket.close(1000, 'complete');
          },
          error => fail(error)
        );
        return;
      }
      if (message.type !== 'apdu-response' && message.type !== 'apdu-error') {
        throw new Error('Unexpected Ledger relay message');
      }
      if (!pendingApdu || pendingApdu.requestId !== message.requestId) {
        throw new Error('Ledger relay APDU response is out of order');
      }
      const pending = pendingApdu;
      pendingApdu = undefined;
      clearTimeout(pending.timer);
      if (message.type === 'apdu-error') {
        pending.reject(new Error(message.message));
      } else {
        pending.resolve({
          data: Uint8Array.from(Buffer.from(message.dataHex, 'hex')),
          statusCode: Uint8Array.from(
            Buffer.from(message.statusCodeHex, 'hex')
          ),
        });
      }
    };

    socket.on('message', raw => {
      try {
        handleClientMessage(parseLedgerRelayClientMessage(raw.toString()));
      } catch (error) {
        fail(error);
      }
    });
    socket.on('close', () => {
      if (!finished) {
        fail(new Error('Ledger relay client disconnected'), 4408);
      }
    });
    socket.on('error', error => fail(error, 1011));
  }

  async close(): Promise<void> {
    const error = new Error('Ledger attestation relay server closed');
    for (const session of this.sessions.values()) {
      clearTimeout(session.expiryTimer);
      if (!session.consumed) {
        session.reject(error);
      }
    }
    this.sessions.clear();
    for (const socket of this.webSocketServer.clients) {
      socket.close(1001, 'server-closed');
    }
    await new Promise<void>(resolve => {
      this.webSocketServer.close(() => resolve());
    });
    await new Promise<void>(resolve => {
      this.httpServer.close(() => resolve());
    });
  }
}
