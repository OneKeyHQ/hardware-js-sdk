import { HardwareErrorCode, SDK, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';

import { TrezorAdapter } from '../index';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

/**
 * A3 — passphrase wallet sessions. The adapter may reuse a verified wallet
 * session for wallet-bound calls, but it still verifies the derived passphrase
 * state before forwarding chain methods. These tests drive the adapter against
 * a programmable connector that routes `__thpCreateSession`,
 * `__thpSelectSession`, `btcGetPublicKey` (passphrase-state derivation),
 * `getFeatures`, and chain ops.
 *
 * SECURITY invariant under test: a wallet-bound op carrying a `passphraseState`
 * always derives and confirms the state before the chain call. Session reuse
 * only saves re-entering the passphrase; it never skips verification. And
 * `getPassphraseState` only returns null (standard wallet) when a fresh device
 * read reports no passphrase protection.
 */
describe('TrezorAdapter passphrase sessions', () => {
  type CreateResult = { protocol: string; thpSessionId: string | null };

  function createConnector(opts?: {
    createResults?: CreateResult[];
    states?: string[];
    features?: Record<string, unknown>;
    chain?: (method: string, params: unknown) => unknown;
  }): IConnector & { call: jest.Mock } {
    const createResults = opts?.createResults ?? [];
    const states = opts?.states ?? [];
    const features = opts?.features ?? { unlocked: true, passphrase_protection: true };
    let createIdx = 0;
    let stateIdx = 0;

    const call = jest.fn(async (_sessionId: string, method: string, params: unknown) => {
      switch (method) {
        case 'getFeatures':
          return features;
        case '__thpCreateSession': {
          const r = createResults[createIdx] ?? {
            protocol: 'thp',
            thpSessionId: `sess-${createIdx + 1}`,
          };
          createIdx += 1;
          return r;
        }
        case '__thpSelectSession':
          return {
            protocol: 'thp',
            thpSessionId: (params as { thpSessionId: string }).thpSessionId,
          };
        case 'btcGetPublicKey':
          return { publicKey: states[stateIdx++] ?? '02ffffffff' };
        default:
          return opts?.chain ? opts.chain(method, params) : { method, params };
      }
    });

    return {
      connectionType: 'ble',
      searchDevices: jest.fn().mockResolvedValue([]),
      connect: jest.fn().mockResolvedValue({
        sessionId: 'safe-7-session',
        deviceInfo: {
          vendor: 'trezor',
          model: 'T3W1',
          firmwareVersion: '',
          deviceId: 'safe-7',
          connectId: 'safe-7',
          connectionType: 'ble',
        },
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      call,
      cancel: jest.fn().mockResolvedValue(undefined),
      uiResponse: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      reset: jest.fn(),
    } as unknown as IConnector & { call: jest.Mock };
  }

  const callsTo = (connector: { call: jest.Mock }, method: string) =>
    connector.call.mock.calls.filter(c => c[1] === method);

  /**
   * Makes `__thpCreateSession` raise REQUEST_PASSPHRASE and wait for the host, like the real
   * connector: an answer resolves it, a connector-level CANCEL rejects every open prompt.
   */
  function holdPassphrasePrompts(connector: IConnector & { call: jest.Mock }) {
    const open = new Map<string, { answer: () => void; cancel: (error: Error) => void }>();
    const fallback = connector.call.getMockImplementation();
    connector.call.mockImplementation(
      (sessionId: string, method: string, params: unknown): Promise<unknown> => {
        if (method !== '__thpCreateSession')
          return Promise.resolve(fallback?.(sessionId, method, params));
        return new Promise((resolve, reject) => {
          open.set(sessionId, {
            answer: () => resolve({ protocol: 'thp', thpSessionId: `${sessionId}-wallet` }),
            cancel: reject,
          });
          const onUiRequest = (connector.on as jest.Mock).mock.calls.find(
            c => c[0] === 'ui-request'
          )?.[1] as ((event: unknown) => void) | undefined;
          onUiRequest?.({
            type: UI_REQUEST.REQUEST_PASSPHRASE,
            payload: { connectId: sessionId.replace(/-session$/, '') },
          });
        });
      }
    );
    (connector.uiResponse as jest.Mock).mockImplementation((response: { type: string }) => {
      if (response.type !== UI_RESPONSE.CANCEL) return;
      for (const prompt of open.values()) prompt.cancel(new Error('Passphrase prompt cancelled'));
      open.clear();
    });
    return {
      isOpen: (sessionId: string) => open.has(sessionId),
      answer: (sessionId: string) => {
        open.get(sessionId)?.answer();
        open.delete(sessionId);
      },
    };
  }

  /** Bounded wait: a regression that leaves `promise` hanging fails the test instead of timing it out. */
  async function settleWithin<T>(
    promise: Promise<T>,
    ms = 100
  ): Promise<{ settled: true; value: T } | { settled: false }> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<{ settled: false }>(resolve => {
      timer = setTimeout(() => resolve({ settled: false }), ms);
    });
    try {
      return await Promise.race([
        promise.then(value => ({ settled: true as const, value })),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function waitUntil(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 20 && !condition(); i += 1) {
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
    }
    expect(condition()).toBe(true);
  }

  it('creates session, verifies state, and strips passphraseState', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-1' }],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: "m/84'/0'/0'/0/0",
      passphraseState: 'aabbccdd',
    });

    expect(res.success).toBe(true);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    // passphraseState must NOT reach the protobuf layer.
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetAddress', {
      path: "m/84'/0'/0'/0/0",
    });
  });

  it('reuses a verified session for repeated hidden-wallet calls', async () => {
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-1' },
        { protocol: 'thp', thpSessionId: 'sess-2' },
      ],
      states: ['aabbccdd', 'aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.btcGetAddress('safe-7', 'safe-7', { path: 'p0', passphraseState: 'aabbccdd' });
    connector.call.mockClear();

    await adapter.btcGetAddress('safe-7', 'safe-7', { path: 'p1', passphraseState: 'aabbccdd' });

    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(0);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', '__thpSelectSession', {
      thpSessionId: 'sess-1',
    });
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
  });

  it('mismatch: wrong passphrase wallet fails with PassphraseStateMismatch and is not cached', async () => {
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-1' },
        { protocol: 'thp', thpSessionId: 'sess-2' },
      ],
      // device derives a different wallet than the caller pinned
      states: ['deadbeef', '11112222'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });

    expect(res.success).toBe(false);
    expect((res as { success: false; payload: { code: number } }).payload.code).toBe(
      HardwareErrorCode.PassphraseStateMismatch
    );
    // The actual chain op never ran.
    expect(callsTo(connector, 'btcGetAddress')).toHaveLength(0);

    const res2 = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: '11112222',
    });
    expect(res2.success).toBe(true);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(0);
  });

  it('getPassphraseState discover (passphrase wallet) derives once and re-reads FRESH features', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-9' }],
      states: ['feedface', 'feedface'],
      features: { passphrase_protection: true },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.getPassphraseState('safe-7');
    expect(res).toEqual({ success: true, payload: 'feedface' });
    // Decision is made on a FRESH device read, not the cached features.
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', { refresh: true });
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, '__thpCreateSession')[0][2]).toEqual({ passphraseMode: 'prompt' });
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);

    // A later chain call pinned to that state reuses the verified session, then
    // re-derives the state before the chain method runs.
    connector.call.mockClear();
    await adapter.btcGetAddress('safe-7', 'safe-7', { path: 'p0', passphraseState: 'feedface' });
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(0);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
  });

  it('reuses the verified THP session discovered by getPassphraseState', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-9' }],
      states: ['feedface', 'feedface'],
      features: { passphrase_protection: true },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const state = await adapter.getPassphraseState('safe-7');
    expect(state).toEqual({ success: true, payload: 'feedface' });
    connector.call.mockClear();

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'feedface',
    });

    expect(res.success).toBe(true);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(0);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', '__thpSelectSession', {
      thpSessionId: 'sess-9',
    });
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetAddress', {
      path: 'p0',
    });
  });

  it('getPassphraseState discover returns the derived state even when the entered passphrase is empty', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-user' }],
      states: ['standard-state'],
      features: { passphrase_protection: true },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.getPassphraseState('safe-7');

    expect(res).toEqual({ success: true, payload: 'standard-state' });
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, '__thpCreateSession')[0][2]).toEqual({ passphraseMode: 'prompt' });
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
  });

  it('getPassphraseState discover (standard wallet) returns null after deriving + a FRESH feature read', async () => {
    // OneKey-aligned: always derive first (unlocks), then re-read fresh features;
    // a standard wallet (passphrase off) yields null, discarding the derived state.
    const connector = createConnector({
      states: ['abcd1234'],
      features: { passphrase_protection: false },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.getPassphraseState('safe-7');
    expect(res).toEqual({ success: true, payload: null });
    // We never trust a possibly-stale cached blob — decision uses a fresh read.
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', { refresh: true });
    // The standard state was derived (unlock side-effect) but NOT cached.
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
  });

  it('getPassphraseState verify mode reuses and verifies a cached session', async () => {
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-9' },
        { protocol: 'thp', thpSessionId: 'sess-10' },
        { protocol: 'thp', thpSessionId: 'sess-11' },
      ],
      states: ['feedface', 'feedface'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.getPassphraseState('safe-7');
    connector.call.mockClear();

    const res = await adapter.getPassphraseState('safe-7', 'feedface'); // verify
    expect(res).toEqual({ success: true, payload: 'feedface' });
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(0);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
  });

  it('v1 device: creates a fresh device session, verifies state, then runs the chain op', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'v1', thpSessionId: null }],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });

    expect(res.success).toBe(true);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetAddress', { path: 'p0' });
  });

  it('v1 device: wrong passphrase state fails before the chain op', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'v1', thpSessionId: null }],
      states: ['deadbeef'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });

    expect(res.success).toBe(false);
    expect((res as { success: false; payload: { code: number } }).payload.code).toBe(
      HardwareErrorCode.PassphraseStateMismatch
    );
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetAddress')).toHaveLength(0);
  });

  it('evicted session: stale-session error recreates and retries', async () => {
    let addrCalls = 0;
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-1' },
        { protocol: 'thp', thpSessionId: 'sess-2' },
        { protocol: 'thp', thpSessionId: 'sess-3' },
      ],
      // discover, first call verify, retry verify
      states: ['aabbccdd', 'aabbccdd', 'aabbccdd'],
      chain: method => {
        if (method === 'btcGetAddress') {
          addrCalls += 1;
          // First attempt hits an evicted session.
          if (addrCalls === 1) {
            throw Object.assign(new Error('evicted'), { code: 'ThpUnallocatedChannel' });
          }
          return { address: 'bc1qok', path: 'p0' };
        }
        return { method };
      },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.getPassphraseState('safe-7');
    connector.call.mockClear();

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });

    expect(res).toEqual({ success: true, payload: { address: 'bc1qok', path: 'p0' } });
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetAddress')).toHaveLength(2);
  });

  it('evicted session: detects stale code preserved under response.message.code', async () => {
    let addrCalls = 0;
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-1' },
        { protocol: 'thp', thpSessionId: 'sess-2' },
        { protocol: 'thp', thpSessionId: 'sess-3' },
      ],
      states: ['aabbccdd', 'aabbccdd', 'aabbccdd'],
      chain: method => {
        if (method === 'btcGetAddress') {
          addrCalls += 1;
          if (addrCalls === 1) {
            throw Object.assign(new Error('session missing'), {
              response: {
                type: 'Failure',
                message: { code: 'ThpUnallocatedChannel', message: 'session missing' },
              },
            });
          }
          return { address: 'bc1qok', path: 'p0' };
        }
        return { method };
      },
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.getPassphraseState('safe-7');
    connector.call.mockClear();

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });

    expect(res).toEqual({ success: true, payload: { address: 'bc1qok', path: 'p0' } });
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetAddress')).toHaveLength(2);
  });

  it('plain wallet-bound calls fail instead of reusing the last wallet', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-hidden' }],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'hidden-path',
      passphraseState: 'aabbccdd',
    });
    connector.call.mockClear();

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', { path: 'p0' });

    expect(res.success).toBe(false);
    expect((res as { success: false; payload: { code: number } }).payload.code).toBe(
      HardwareErrorCode.InvalidParams
    );
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(0);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(0);
    expect(callsTo(connector, 'btcGetAddress')).toHaveLength(0);
  });

  it('switches from a hidden wallet session back to the standard empty-passphrase session', async () => {
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-hidden' },
        { protocol: 'thp', thpSessionId: 'sess-empty' },
      ],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
    });
    await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(2);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'evmGetAddress', {
      path: "m/44'/60'/0'/0/0",
    });
  });

  it('creates a fresh empty-passphrase session for each standard-wallet call', async () => {
    const connector = createConnector({
      createResults: [
        { protocol: 'thp', thpSessionId: 'sess-empty-1' },
        { protocol: 'thp', thpSessionId: 'sess-empty-2' },
      ],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });
    await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/1",
      useEmptyPassphrase: true,
    });

    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(2);
    expect(callsTo(connector, '__thpCreateSession').map(c => c[2])).toEqual([
      { passphraseMode: 'empty' },
      { passphraseMode: 'empty' },
    ]);
    expect(callsTo(connector, '__thpSelectSession')).toHaveLength(0);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(0);
  });

  it('rejects wallet-bound calls without explicit wallet intent', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.evmGetAddress('safe-7', 'safe-7', null);

    expect(res.success).toBe(false);
    expect((res as { success: false; payload: { code: number } }).payload.code).toBe(
      HardwareErrorCode.InvalidParams
    );
    expect(callsTo(connector, 'evmGetAddress')).toHaveLength(0);
  });

  it('strips common fields from merged params before forwarding to the connector method', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-1' }],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      passphraseState: 'aabbccdd',
      autoInstallApp: true,
      useEmptyPassphrase: true,
    });

    expect(res.success).toBe(true);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(callsTo(connector, 'btcGetPublicKey')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetAddress', { path: 'p0' });
  });

  it.each([
    [
      'adds passphrase routing context to REQUEST_PASSPHRASE while a call is active',
      'ui-request-passphrase',
      true,
      (operationId: string): unknown[] => [
        {
          type: 'ui-request-passphrase',
          payload: { connectId: 'safe-7', useEmptyPassphrase: true, operationId },
        },
      ],
    ],
    [
      'names the connection live operation on a prompt from an unpinned call',
      'ui-request-pin',
      // The call never settles: the prompt has to stay open.
      false,
      (operationId: string): unknown[] => [
        expect.objectContaining({ payload: expect.objectContaining({ operationId }) }),
      ],
    ],
  ] as const)('%s', async (_title, promptType, settles, expectedEvents) => {
    // Captured by the closure below but only assigned after connectDevice resolves,
    // so it genuinely needs `let`.
    // eslint-disable-next-line prefer-const
    let uiRequestHandler: ((event: unknown) => void) | undefined;
    const connector = createConnector({
      chain: method => {
        if (method === 'btcGetAddress') {
          uiRequestHandler?.({ type: promptType, payload: { connectId: 'safe-7' } });
          if (!settles) return new Promise(() => undefined);
        }
        return { address: 'bc1qok' };
      },
    });
    const adapter = new TrezorAdapter(connector);
    const promptEvents: unknown[] = [];
    adapter.on(promptType, event => {
      promptEvents.push(event);
    });

    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    uiRequestHandler = connector.on.mock.calls.find(c => c[0] === 'ui-request')?.[1];
    expect(uiRequestHandler).toBeDefined();

    // The call carries no operationId, so it queues under the connectId; the
    // live operation on that connection still owns the prompt.
    const call = adapter.btcGetAddress('safe-7', 'safe-7', {
      path: 'p0',
      useEmptyPassphrase: true,
    });
    if (settles) {
      await call;
    } else {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 10);
      });
    }

    expect(promptEvents).toEqual(expectedEvents(connected.payload));
  });

  it('accepts merged params for btcGetMasterFingerprint', async () => {
    const connector = createConnector({
      createResults: [{ protocol: 'thp', thpSessionId: 'sess-1' }],
      states: ['aabbccdd'],
    });
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const res = await adapter.btcGetMasterFingerprint('safe-7', 'safe-7', {
      passphraseState: 'aabbccdd',
      autoInstallApp: true,
      useEmptyPassphrase: true,
    });

    expect(res.success).toBe(true);
    expect(callsTo(connector, '__thpCreateSession')).toHaveLength(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetMasterFingerprint', {});
  });

  it('releasing an operation dismisses its open passphrase prompt and settles the call', async () => {
    const connector = createConnector({ states: ['feedface'] });
    const prompts = holdPassphrasePrompts(connector);
    const adapter = new TrezorAdapter(connector);
    const ended: unknown[] = [];
    adapter.on(SDK.OPERATION_ENDED, event => {
      ended.push(event.payload);
    });
    const connected = await adapter.connectDevice('safe-7');
    if (!connected.success) throw new Error('connectDevice failed');
    const operationId = connected.payload;

    const pending = adapter.getPassphraseState(operationId);
    await waitUntil(() => prompts.isOpen('safe-7-session'));

    const released = await settleWithin(adapter.releaseOperation(operationId));
    expect(released.settled).toBe(true);
    const result = await settleWithin(pending);
    expect(result).toEqual({
      settled: true,
      value: {
        success: false,
        payload: expect.objectContaining({ code: HardwareErrorCode.OperationEnded }),
      },
    });
    expect(connector.uiResponse).toHaveBeenCalledWith({ type: UI_RESPONSE.CANCEL });
    expect(prompts.isOpen('safe-7-session')).toBe(false);
    expect(ended).toEqual([{ operationId, reason: 'explicit' }]);
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
  });

  it("releasing an idle operation leaves another operation's passphrase prompt open", async () => {
    const connector = createConnector({ states: ['feedface'] });
    (connector.connect as jest.Mock).mockImplementation((connectId: string) =>
      Promise.resolve({
        sessionId: `${connectId}-session`,
        deviceInfo: {
          vendor: 'trezor',
          model: 'T3W1',
          firmwareVersion: '',
          deviceId: connectId,
          connectId,
          connectionType: 'ble',
        },
      })
    );
    const prompts = holdPassphrasePrompts(connector);
    const adapter = new TrezorAdapter(connector);
    const idle = await adapter.connectDevice('safe-5');
    const prompting = await adapter.connectDevice('safe-7');
    if (!idle.success || !prompting.success) throw new Error('connectDevice failed');

    const pending = adapter.getPassphraseState(prompting.payload);
    await waitUntil(() => prompts.isOpen('safe-7-session'));

    // Teardown of the idle operation waits for the other call's raw request to drain.
    const release = adapter.releaseOperation(idle.payload);
    expect((await settleWithin(pending, 20)).settled).toBe(false);
    expect(connector.uiResponse).not.toHaveBeenCalled();
    expect(prompts.isOpen('safe-7-session')).toBe(true);

    prompts.answer('safe-7-session');
    await expect(pending).resolves.toEqual({ success: true, payload: 'feedface' });
    expect((await settleWithin(release)).settled).toBe(true);
    expect(connector.disconnect).toHaveBeenCalledWith('safe-5-session');
    expect(connector.disconnect).not.toHaveBeenCalledWith('safe-7-session');
  });

  it('releasing a live operation leaves a bare-connectId call on the same device to its caller', async () => {
    const connector = createConnector({ states: ['feedface'] });
    // Like the real connector, a disconnected session refuses every later call.
    const closed = new Set<string>();
    (connector.disconnect as jest.Mock).mockImplementation(async (sessionId: string) => {
      closed.add(sessionId);
    });
    const live = connector.call.getMockImplementation();
    connector.call.mockImplementation(
      async (sessionId: string, method: string, params: unknown) => {
        if (closed.has(sessionId)) {
          throw Object.assign(new Error('session closed'), {
            code: HardwareErrorCode.DeviceNotFound,
          });
        }
        return live?.(sessionId, method, params);
      }
    );
    const prompts = holdPassphrasePrompts(connector);
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    if (!connected.success) throw new Error('connectDevice failed');

    // Not pinned to the operation, so the release must not cancel it or its prompt, and must not
    // take the connection its later stages need.
    const pending = adapter.getPassphraseState('safe-7');
    await waitUntil(() => prompts.isOpen('safe-7-session'));
    expect((await settleWithin(adapter.releaseOperation(connected.payload), 20)).settled).toBe(
      true
    );

    expect((await settleWithin(pending, 20)).settled).toBe(false);
    expect(connector.uiResponse).not.toHaveBeenCalled();
    expect(prompts.isOpen('safe-7-session')).toBe(true);

    prompts.answer('safe-7-session');
    expect(await settleWithin(pending)).toEqual({
      settled: true,
      value: { success: true, payload: 'feedface' },
    });
    expect(connector.disconnect).not.toHaveBeenCalledWith('safe-7-session');
    // The operation itself is over.
    await expect(adapter.getPassphraseState(connected.payload)).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.OperationEnded },
    });
  });

  it('releasing a live operation leaves a call routed by the same device id to its caller', async () => {
    const connector = createConnector({
      states: ['aabbccdd'],
      features: { unlocked: true, passphrase_protection: true, device_id: 'safe-7' },
    });
    (connector.connect as jest.Mock).mockResolvedValue({
      sessionId: 'ble-addr-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '',
        deviceId: 'safe-7',
        connectId: 'ble-addr',
        connectionType: 'ble',
      },
    });
    const prompts = holdPassphrasePrompts(connector);
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('ble-addr');
    if (!connected.success) throw new Error('connectDevice failed');

    // Queued under the device id, not the connectId the operation holds.
    const pending = adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      passphraseState: 'aabbccdd',
      knownConnections: [{ transport: 'ble', connectId: 'ble-addr' }],
    });
    await waitUntil(() => prompts.isOpen('ble-addr-session'));
    expect((await settleWithin(adapter.releaseOperation(connected.payload), 20)).settled).toBe(
      true
    );

    prompts.answer('ble-addr-session');
    expect(await settleWithin(pending)).toMatchObject({ settled: true, value: { success: true } });
    expect(connector.disconnect).not.toHaveBeenCalledWith('ble-addr-session');
  });

  it('releasing an already-released operation again leaves a reconnected call and its prompt open', async () => {
    const connector = createConnector({ states: ['feedface'] });
    const prompts = holdPassphrasePrompts(connector);
    const adapter = new TrezorAdapter(connector);
    const first = await adapter.connectDevice('safe-7');
    if (!first.success) throw new Error('connectDevice failed');
    await adapter.releaseOperation(first.payload);
    const second = await adapter.connectDevice('safe-7');
    if (!second.success) throw new Error('reconnect failed');
    expect(second.payload).not.toBe(first.payload);
    const disconnectsBefore = (connector.disconnect as jest.Mock).mock.calls.length;

    // A raw-connectId call queues under the connectId the ended operation used to own.
    const pending = adapter.getPassphraseState('safe-7');
    await waitUntil(() => prompts.isOpen('safe-7-session'));

    expect((await settleWithin(adapter.releaseOperation(first.payload))).settled).toBe(true);
    expect((await settleWithin(pending, 20)).settled).toBe(false);
    expect(connector.uiResponse).not.toHaveBeenCalled();
    expect(prompts.isOpen('safe-7-session')).toBe(true);

    prompts.answer('safe-7-session');
    expect(await settleWithin(pending)).toEqual({
      settled: true,
      value: { success: true, payload: 'feedface' },
    });
    expect(connector.disconnect).toHaveBeenCalledTimes(disconnectsBefore);
    await expect(adapter.getDeviceInfo(second.payload, 'safe-7')).resolves.toMatchObject({
      success: true,
    });
  });
});
