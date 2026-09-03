import { randomBytes } from 'node:crypto';
import {
  thp as protocolThp,
  v1 as protocolV1,
  v2 as protocolV2,
} from '@onekeyfe/hwk-trezor-protocol';

import {
  type TrezorByteTransport,
  type TrezorCoreFactory,
  type TrezorCoreLike,
  TrezorDeviceSession,
  TrezorFailureError,
  type TrezorProtocolError,
} from '../index';

class EmptyTransport implements TrezorByteTransport {
  async write() {}

  async read() {
    throw new Error('No reads expected');
  }
}

type CallRecord = {
  protocol: string;
  name: string;
  data: Record<string, unknown>;
  thpState?: protocolThp.ThpState;
};

type QueuedResponse =
  | { type: string; message: Record<string, unknown> }
  | TrezorFailureError
  | TrezorProtocolError
  | Error;

class FakeCore implements TrezorCoreLike {
  constructor(
    private readonly protocolName: string,
    private readonly calls: CallRecord[],
    private readonly responses: QueuedResponse[]
  ) {}

  async send(
    name: string,
    data: Record<string, unknown> = {},
    options: { thpState?: protocolThp.ThpState } = {}
  ) {
    this.calls.push({ protocol: this.protocolName, name, data, thpState: options.thpState });
  }

  async receive() {
    return this.shiftResponse('receive');
  }

  async call(
    name: string,
    data: Record<string, unknown> = {},
    options: { thpState?: protocolThp.ThpState } = {}
  ) {
    this.calls.push({ protocol: this.protocolName, name, data, thpState: options.thpState });
    return this.shiftResponse(name);
  }

  private shiftResponse(name: string) {
    const next = this.responses.shift();
    if (!next) {
      throw new Error(`No fake response queued for ${name}`);
    }
    if (next instanceof Error) {
      throw next;
    }
    // Mirror real TrezorCore.call: a Failure payload becomes a thrown
    // TrezorFailureError, not a returned response. Tests for the THP
    // fallback path rely on this so the catch-block in initialize()
    // actually fires.
    if (next.type === 'Failure') {
      throw new TrezorFailureError(next as never);
    }
    return next;
  }
}

const createFactory =
  (calls: CallRecord[], responses: QueuedResponse[]): TrezorCoreFactory =>
  (_transport, protocol) =>
    new FakeCore(protocol.name, calls, responses);

const features = {
  vendor: 'trezor.io',
  major_version: 2,
  minor_version: 8,
  patch_version: 10,
  device_id: 'device-1',
  label: 'Trezor Safe 7',
  model: 'T3W1',
};

describe('TrezorDeviceSession', () => {
  test('uses v1 Initialize for non-BLE sessions', async () => {
    const calls: CallRecord[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'usb',
      coreFactory: createFactory(calls, [{ type: 'Features', message: features }]),
    });

    await session.initialize();

    expect(session.features).toEqual(features);
    expect(calls).toEqual([
      {
        protocol: protocolV1.name,
        name: 'Initialize',
        data: {},
        thpState: undefined,
      },
    ]);
  });

  test('bootstraps THP and reads Features for BLE sessions', async () => {
    const calls: CallRecord[] = [];
    const channel = Buffer.from('1234', 'hex');
    const handshakeHash = Buffer.alloc(32, 7);
    const hostKey = Buffer.alloc(32, 8);
    const trezorKey = Buffer.alloc(32, 9);
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      chunkSize: 244,
      coreFactory: createFactory(calls, [
        // v1 Initialize probe — THP-only device replies Failure_InvalidProtocol,
        // session.initialize then re-enters via the THP path.
        { type: 'Failure', message: { code: 'Failure_InvalidProtocol' } },
        {
          type: 'ThpCreateChannelResponse',
          message: {
            nonce: Buffer.from('0102030405060708', 'hex'),
            channel,
            handshakeHash,
            properties: {
              internal_model: 'T3W1',
              model_variant: 1,
              protocol_version_major: 2,
              protocol_version_minor: 1,
              pairing_methods: ['CodeEntry'],
            },
          },
        },
        {
          type: 'ThpHandshakeInitResponse',
          message: {
            trezorEphemeralPubkey: Buffer.alloc(32, 1),
            trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
            tag: Buffer.alloc(16, 3),
          },
        },
        { type: 'ThpHandshakeCompletionResponse', message: { state: 2 } },
        { type: 'ThpEndResponse', message: {} },
        { type: 'Features', message: features },
      ]),
      thp: {
        randomBytes: size =>
          size === 8 ? Buffer.from('0102030405060708', 'hex') : Buffer.alloc(size, size),
        handleHandshakeInit: () => ({
          trezorMaskedStaticPubkey: Buffer.alloc(32, 4),
          trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
          hostEncryptedStaticPubkey: Buffer.alloc(48, 5),
          hostKey,
          trezorKey,
          handshakeHash,
          allCredentials: [],
          encryptedPayload: Buffer.alloc(16, 6),
          staticKey: Buffer.alloc(32, 10),
          hostStaticKeys: {
            privateKey: randomBytes(32),
            publicKey: Buffer.alloc(32, 12),
          },
        }),
      },
    });

    await session.initialize();

    expect(session.features).toEqual(features);
    expect(calls.map(call => [call.protocol, call.name])).toEqual([
      [protocolV1.name, 'Initialize'],
      [protocolV2.name, 'ThpCreateChannelRequest'],
      [protocolV2.name, 'ThpHandshakeInitRequest'],
      [protocolV2.name, 'ThpHandshakeCompletionRequest'],
      [protocolV2.name, 'ThpEndRequest'],
      [protocolV2.name, 'GetFeatures'],
    ]);
    const thpCalls = calls.slice(1);
    expect(thpCalls[0].data).toEqual({ nonce: Buffer.from('0102030405060708', 'hex') });
    expect(thpCalls.every(call => call.thpState === thpCalls[0].thpState)).toBe(true);
    expect(thpCalls[0].thpState?.channel.toString('hex')).toBe(channel.toString('hex'));
    expect(thpCalls[0].thpState?.handshakeCredentials?.hostKey).toEqual(hostKey);
    expect(thpCalls[0].thpState?.handshakeCredentials?.trezorKey).toEqual(trezorKey);
  });

  test('does not write THP initialization diagnostics to console by default', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const calls: CallRecord[] = [];
      const channel = Buffer.from('1234', 'hex');
      const handshakeHash = Buffer.alloc(32, 7);
      const session = new TrezorDeviceSession({
        transport: new EmptyTransport(),
        connectionType: 'ble',
        chunkSize: 244,
        coreFactory: createFactory(calls, [
          { type: 'Failure', message: { code: 'Failure_InvalidProtocol' } },
          {
            type: 'ThpCreateChannelResponse',
            message: {
              nonce: Buffer.from('0102030405060708', 'hex'),
              channel,
              handshakeHash,
              properties: {
                internal_model: 'T3W1',
                model_variant: 1,
                protocol_version_major: 2,
                protocol_version_minor: 1,
                pairing_methods: ['SkipPairing'],
              },
            },
          },
          {
            type: 'ThpHandshakeInitResponse',
            message: {
              trezorEphemeralPubkey: Buffer.alloc(32, 1),
              trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
              tag: Buffer.alloc(16, 3),
            },
          },
          { type: 'ThpHandshakeCompletionResponse', message: { state: 2 } },
          { type: 'ThpEndResponse', message: {} },
          { type: 'Features', message: { ...features, session_id: 'do-not-log' } },
        ]),
        thp: {
          randomBytes: size =>
            size === 8 ? Buffer.from('0102030405060708', 'hex') : Buffer.alloc(size, size),
          handleHandshakeInit: () => ({
            trezorMaskedStaticPubkey: Buffer.alloc(32, 4),
            trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
            hostEncryptedStaticPubkey: Buffer.alloc(48, 5),
            hostKey: Buffer.alloc(32, 8),
            trezorKey: Buffer.alloc(32, 9),
            handshakeHash,
            allCredentials: [],
            encryptedPayload: Buffer.alloc(16, 6),
            staticKey: Buffer.alloc(32, 10),
            hostStaticKeys: {
              privateKey: randomBytes(32),
              publicKey: Buffer.alloc(32, 12),
            },
          }),
        },
      });

      await session.initialize();

      expect(JSON.stringify(logSpy.mock.calls)).not.toContain('do-not-log');
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[TREZOR_VERIFY]'),
        expect.anything()
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  test('does not log raw THP create-channel wire packets', async () => {
    const calls: CallRecord[] = [];
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const nonce = Buffer.from('639ba57ff4e0c234', 'hex');
    const channel = Buffer.from('3c83', 'hex');
    const handshakeHash = Buffer.alloc(32, 7);
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      chunkSize: 244,
      coreFactory: createFactory(calls, [
        // v1 Initialize probe — replies trigger the THP fallback path.
        { type: 'Failure', message: { code: 'Failure_InvalidProtocol' } },
        {
          type: 'ThpCreateChannelResponse',
          message: {
            nonce,
            channel,
            handshakeHash,
            properties: {
              internal_model: 'T3W1',
              model_variant: 1,
              protocol_version_major: 2,
              protocol_version_minor: 1,
              pairing_methods: ['SkipPairing'],
            },
          },
        },
        {
          type: 'ThpHandshakeInitResponse',
          message: {
            trezorEphemeralPubkey: Buffer.alloc(32, 1),
            trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
            tag: Buffer.alloc(16, 3),
          },
        },
        { type: 'ThpHandshakeCompletionResponse', message: { state: 2 } },
        { type: 'ThpEndResponse', message: {} },
        { type: 'Features', message: features },
      ]),
      thp: {
        randomBytes: size => (size === 8 ? nonce : Buffer.alloc(size, size)),
        logger: entry => logs.push({ event: entry.event, data: entry.data }),
        handleHandshakeInit: () => ({
          trezorMaskedStaticPubkey: Buffer.alloc(32, 4),
          trezorEncryptedStaticPubkey: Buffer.alloc(48, 2),
          hostEncryptedStaticPubkey: Buffer.alloc(48, 5),
          hostKey: Buffer.alloc(32, 8),
          trezorKey: Buffer.alloc(32, 9),
          handshakeHash,
          allCredentials: [],
          encryptedPayload: Buffer.alloc(16, 6),
          staticKey: Buffer.alloc(32, 10),
          hostStaticKeys: {
            privateKey: randomBytes(32),
            publicKey: Buffer.alloc(32, 12),
          },
        }),
      },
    });

    await session.initialize();

    expect(calls.map(call => call.name)).toContain('ThpCreateChannelRequest');
    expect(logs.map(log => log.event)).not.toContain('thp.call.wire');
    expect(JSON.stringify(logs)).not.toContain('packetHex');
  });

  test('creates a THP application session before EVM address calls without unrelated coin validation', async () => {
    const calls: CallRecord[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [
        { type: 'Success', message: {} },
        {
          type: 'EthereumAddress',
          message: { address: '0x1234567890123456789012345678901234567890' },
        },
      ]),
      initializedState: {
        protocol: 'thp',
        features,
        thpState: new protocolThp.ThpState(),
      },
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    const response = await session.withDeviceState(() =>
      session.call('EthereumGetAddress', {
        address_n: [2147483692, 2147483708, 2147483648, 0, 0],
        show_display: false,
      })
    );

    expect(response).toEqual({
      type: 'EthereumAddress',
      message: { address: '0x1234567890123456789012345678901234567890' },
    });
    expect(calls.map(call => call.name)).toEqual(['ThpCreateNewSession', 'EthereumGetAddress']);
    expect(calls[0].data).toEqual({ passphrase: '', derive_cardano: false });
    expect(calls[0].thpState?.sessionId.toString('hex')).toBe('01');
    expect(calls[1].thpState?.sessionId.toString('hex')).toBe('01');
  });

  test('emits sanitized THP business method logs through the main logger', async () => {
    const calls: CallRecord[] = [];
    const logs: TrezorDebugLogEntry[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [
        { type: 'Success', message: {} },
        {
          type: 'EthereumAddress',
          message: { address: '0x1234567890123456789012345678901234567890' },
        },
      ]),
      initializedState: {
        protocol: 'thp',
        features,
        thpState: new protocolThp.ThpState(),
      },
      thp: {
        logger: entry => {
          logs.push(entry);
        },
      },
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    await session.withDeviceState(() =>
      session.call('EthereumGetAddress', {
        address_n: [2147483692, 2147483708, 2147483648, 0, 0],
        show_display: false,
        passphrase: 'do-not-log',
      })
    );

    expect(logs).toContainEqual({
      level: 'info',
      scope: 'trezor-core',
      event: 'session.method.start',
      data: {
        name: 'EthereumGetAddress',
        protocol: 'thp',
        dataKeys: ['address_n', 'show_display'],
      },
      thpModuleForwarded: true,
    });
    expect(logs).toContainEqual({
      level: 'info',
      scope: 'trezor-core',
      event: 'session.method.response',
      data: {
        name: 'EthereumGetAddress',
        protocol: 'thp',
        responseType: 'EthereumAddress',
        messageKeys: ['address'],
      },
      thpModuleForwarded: true,
    });
    expect(logs.map(log => log.scope)).not.toContain('trezor-thp');
    expect(JSON.stringify(logs)).not.toContain('do-not-log');
  });

  // Regression: a passphrase-protected device answers ThpCreateNewSession with a
  // ButtonRequest (hidden-wallet confirm) that MUST be answered with ButtonAck
  // before the session is created. createThpAppSession must route through the
  // interactive call() loop, not a bare single round-trip — otherwise the device
  // is left awaiting the ack and the next message desyncs into Failure_FirmwareError.
  test('answers a ButtonRequest during passphrase session creation with ButtonAck', async () => {
    const calls: CallRecord[] = [];
    const buttonRequests: Record<string, unknown>[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [
        // ThpCreateNewSession → device wants on-device confirmation first
        { type: 'ButtonRequest', message: { code: 'ButtonRequest_Other' } },
        // ButtonAck → session created
        { type: 'Success', message: {} },
        // the actual business call
        { type: 'EthereumAddress', message: { address: '0xabc' } },
      ]),
      initializedState: {
        protocol: 'thp',
        features: { ...features, passphrase_protection: true },
        thpState: new protocolThp.ThpState(),
      },
      thp: {
        onPassphraseRequest: async () => ({ passphrase: 'secret' }),
        onButtonRequest: async payload => {
          buttonRequests.push(payload);
        },
      } as any,
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    const response = await session.withDeviceState(() =>
      session.call('EthereumGetAddress', {
        address_n: [2147483692, 2147483708, 2147483648, 0, 0],
        show_display: false,
      })
    );

    expect(response).toEqual({ type: 'EthereumAddress', message: { address: '0xabc' } });
    // The ButtonAck between create and the business call is the whole point.
    expect(calls.map(call => call.name)).toEqual([
      'ThpCreateNewSession',
      'ButtonAck',
      'EthereumGetAddress',
    ]);
    expect(calls[0].data).toEqual({ passphrase: 'secret', derive_cardano: false });
    expect(buttonRequests).toEqual([{ code: 'ButtonRequest_Other' }]);
  });

  // Trezor derives the wallet from the exact passphrase bytes; both protocol
  // send points MUST emit NFKD (matches trezor-suite / OneKey hd-core) or the
  // same human passphrase opens a different wallet. Input is the composed form
  // 'café'; the wire must carry the decomposed NFKD form 'café'.
  const PASSPHRASE_COMPOSED = 'caf\u00e9'; // é precomposed (U+00E9)
  const PASSPHRASE_NFKD = PASSPHRASE_COMPOSED.normalize('NFKD'); // e + U+0301

  test('NFKD-normalizes the passphrase before ThpCreateNewSession (THP)', async () => {
    const calls: CallRecord[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [
        { type: 'Success', message: {} },
        { type: 'EthereumAddress', message: { address: '0xabc' } },
      ]),
      initializedState: {
        protocol: 'thp',
        features: { ...features, passphrase_protection: true },
        thpState: new protocolThp.ThpState(),
      },
      thp: {
        onPassphraseRequest: async () => ({ passphrase: PASSPHRASE_COMPOSED }),
      } as any,
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    await session.withDeviceState(() =>
      session.call('EthereumGetAddress', {
        address_n: [2147483692, 2147483708, 2147483648, 0, 0],
        show_display: false,
      })
    );

    const createCall = calls.find(call => call.name === 'ThpCreateNewSession');
    expect(createCall?.data.passphrase).toBe(PASSPHRASE_NFKD);
    expect(createCall?.data.passphrase).not.toBe(PASSPHRASE_COMPOSED);
  });

  test('NFKD-normalizes the passphrase in PassphraseAck (v1)', async () => {
    const calls: CallRecord[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'usb',
      coreFactory: createFactory(calls, [
        // v1 device asks for the passphrase reactively mid-call...
        { type: 'PassphraseRequest', message: {} },
        // ...then returns the business response after PassphraseAck.
        { type: 'EthereumAddress', message: { address: '0xabc' } },
      ]),
      initializedState: {
        protocol: 'v1',
        features,
      },
      thp: {
        onPassphraseRequest: async () => ({ passphrase: PASSPHRASE_COMPOSED }),
      } as any,
    });

    await session.call('EthereumGetAddress', {
      address_n: [2147483692, 2147483708, 2147483648, 0, 0],
      show_display: false,
    });

    const ackCall = calls.find(call => call.name === 'PassphraseAck');
    expect(ackCall?.data).toEqual({ passphrase: PASSPHRASE_NFKD });
    expect(ackCall?.data.passphrase).not.toBe(PASSPHRASE_COMPOSED);
  });

  test('does not create a passphrase app session for device settings calls', async () => {
    const calls: CallRecord[] = [];
    const onPassphraseRequest = jest.fn(async () => ({ passphrase: 'secret' }));
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [{ type: 'Success', message: {} }]),
      initializedState: {
        protocol: 'thp',
        features: { ...features, passphrase_protection: true },
        thpState: new protocolThp.ThpState(),
      },
      thp: {
        onPassphraseRequest,
      } as any,
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    const response = await session.call('ApplySettings', {
      label: 'Trezor',
    });

    expect(response).toEqual({ type: 'Success', message: {} });
    expect(onPassphraseRequest).not.toHaveBeenCalled();
    expect(calls.map(call => call.name)).toEqual(['ApplySettings']);
  });

  test('creates an empty-passphrase THP app session without asking the host', async () => {
    const calls: CallRecord[] = [];
    const onPassphraseRequest = jest.fn(async () => ({ passphrase: 'secret' }));
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [{ type: 'Success', message: {} }]),
      initializedState: {
        protocol: 'thp',
        features: { ...features, passphrase_protection: true },
        thpState: new protocolThp.ThpState(),
      },
      thp: {
        onPassphraseRequest,
      } as any,
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    await session.createThpAppSession({ passphraseMode: 'empty' });

    expect(onPassphraseRequest).not.toHaveBeenCalled();
    expect(calls.map(call => call.name)).toEqual(['ThpCreateNewSession']);
    expect(calls[0].data).toEqual({ passphrase: '', derive_cardano: false });
  });

  // The connection handshake supplies the passphrase policy used for new app sessions.
  const alwaysOnDeviceSession = (calls: CallRecord[], onPassphraseRequest: jest.Mock) => {
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'ble',
      coreFactory: createFactory(calls, [{ type: 'Success', message: {} }]),
      initializedState: {
        protocol: 'thp',
        features: {
          ...features,
          passphrase_protection: true,
          passphrase_always_on_device: true,
        },
        thpState: new protocolThp.ThpState(),
      },
      thp: { onPassphraseRequest } as any,
    });
    session.getThpState()?.updateHandshakeCredentials({
      hostKey: Buffer.alloc(32, 1),
      trezorKey: Buffer.alloc(32, 2),
    });

    return session;
  };

  // Regression: once PASSPHRASE_ALWAYS_ON_DEVICE is set the firmware rejects
  // ThpCreateNewSession carrying ANY `passphrase` field with Failure_DataError
  // (`msg.passphrase is not None`, so an empty string counts). For a hidden
  // wallet the answer is to let the device collect the passphrase itself.
  test('prompt mode sends on_device and never asks the host for a passphrase', async () => {
    const calls: CallRecord[] = [];
    const onPassphraseRequest = jest.fn(async () => ({ passphrase: 'secret' }));
    const session = alwaysOnDeviceSession(calls, onPassphraseRequest);

    await session.createThpAppSession({ passphraseMode: 'prompt' });

    // The device announces the on-device entry over the ordinary ButtonRequest
    // channel, so the host is never asked for a value.
    expect(onPassphraseRequest).not.toHaveBeenCalled();
    expect(calls.map(call => call.name)).toEqual(['ThpCreateNewSession']);
    expect(calls[0].data).toEqual({ on_device: true, derive_cardano: false });
    expect(calls[0].data).not.toHaveProperty('passphrase');
  });

  // The 'empty' (standard wallet) path deliberately does NOT switch to
  // `on_device`. That flag means "the user types a passphrase on the device",
  // which cannot express "the empty-passphrase wallet" — the user is free to
  // type something else, and the standard-wallet path has no expected identity
  // to verify against, so binding the wrong wallet would be silent. Keep
  // sending `passphrase: ''` and let the firmware reject the call instead.
  test('empty mode still sends an empty passphrase and lets the firmware reject it', async () => {
    const calls: CallRecord[] = [];
    const onPassphraseRequest = jest.fn(async () => ({ passphrase: 'secret' }));
    const session = alwaysOnDeviceSession(calls, onPassphraseRequest);

    await session.createThpAppSession({ passphraseMode: 'empty' });

    expect(onPassphraseRequest).not.toHaveBeenCalled();
    expect(calls.map(call => call.name)).toEqual(['ThpCreateNewSession']);
    expect(calls[0].data).toEqual({ passphrase: '', derive_cardano: false });
    expect(calls[0].data).not.toHaveProperty('on_device');
  });

  test('handles Trezor Connect style button and PIN requests before final method response', async () => {
    const calls: CallRecord[] = [];
    const buttonRequests: Record<string, unknown>[] = [];
    const pinRequests: Record<string, unknown>[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'usb',
      coreFactory: createFactory(calls, [
        { type: 'ButtonRequest', message: { code: 'ButtonRequest_Address' } },
        { type: 'PinMatrixRequest', message: { type: 'PinMatrixRequestType_Current' } },
        { type: 'Address', message: { address: 'bc1qexampleaddress' } },
      ]),
      initializedState: {
        protocol: 'v1',
        features,
      },
      thp: {
        onButtonRequest: async payload => {
          buttonRequests.push(payload);
        },
        onPinMatrixRequest: async payload => {
          pinRequests.push(payload);
          return '1234';
        },
      } as any,
    });

    const response = await session.call('GetAddress', {
      address_n: [2147483732, 2147483648, 2147483648, 0, 0],
      coin_name: 'Bitcoin',
    });

    expect(response).toEqual({ type: 'Address', message: { address: 'bc1qexampleaddress' } });
    expect(calls.map(call => call.name)).toEqual(['GetAddress', 'ButtonAck', 'PinMatrixAck']);
    expect(calls[1].data).toEqual({});
    expect(calls[2].data).toEqual({ pin: '1234' });
    expect(buttonRequests).toEqual([{ code: 'ButtonRequest_Address' }]);
    expect(pinRequests).toEqual([{ type: 'PinMatrixRequestType_Current' }]);
  });

  test('notifies when a button request has completed after ButtonAck returns', async () => {
    const calls: CallRecord[] = [];
    const events: string[] = [];
    const session = new TrezorDeviceSession({
      transport: new EmptyTransport(),
      connectionType: 'usb',
      coreFactory: createFactory(calls, [
        { type: 'ButtonRequest', message: { code: 'ButtonRequest_Address' } },
        { type: 'Address', message: { address: 'bc1qexampleaddress' } },
      ]),
      initializedState: {
        protocol: 'v1',
        features,
      },
      thp: {
        onButtonRequest: async () => {
          events.push('button-request');
        },
        onButtonRequestComplete: async payload => {
          events.push(`button-complete:${String(payload.responseType)}`);
        },
      } as any,
    });

    const response = await session.call('GetAddress', {
      address_n: [2147483732, 2147483648, 2147483648, 0, 0],
      coin_name: 'Bitcoin',
    });

    expect(response).toEqual({ type: 'Address', message: { address: 'bc1qexampleaddress' } });
    expect(calls.map(call => call.name)).toEqual(['GetAddress', 'ButtonAck']);
    expect(events).toEqual(['button-request', 'button-complete:Address']);
  });
});
