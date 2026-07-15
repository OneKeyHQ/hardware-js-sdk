import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import KaspaSignTransaction from '../src/api/kaspa/KaspaSignTransaction';

// Mock the config module to avoid package.json resolution issues
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/data-manager/TransportManager', () => ({
  getMessageVersion: jest.fn(() => 'v2'),
}));

jest.mock('../src/device/Device', () => ({
  Device: jest.fn(),
}));

const PATH = "m/44'/111111'/0'/0/0";
const CHANGE_PATH = "m/44'/111111'/0'/0/1";
const SCRIPT = `20${'ab'.repeat(32)}ac`; // schnorr P2PK
const ECDSA_SCRIPT = `21${'ab'.repeat(33)}ab`; // ECDSA P2PK
const P2SH_SCRIPT = `aa20${'cd'.repeat(32)}87`; // KRC20-style commit script
const ADDRESS = 'kaspa:qr0lr4ml9fn3chekrqmjdkergxl93l4wrk3dankcgvjq776s9wn9jkdskewva';

const buildInput = (script?: string) => ({
  path: PATH,
  prevTxId: 'aa'.repeat(32),
  outputIndex: 0,
  sequenceNumber: 0,
  output: script !== undefined ? { satoshis: 200000, script } : { satoshis: 200000 },
});

const createMethod = (overrides: Record<string, unknown> = {}) =>
  new KaspaSignTransaction({
    id: 1,
    payload: {
      method: 'kaspaSignTransaction',
      version: 0,
      lockTime: 0,
      inputs: [buildInput(SCRIPT)],
      outputs: [{ satoshis: 100000, script: SCRIPT }],
      ...overrides,
    },
  });

const txRequest = (message: Record<string, unknown>) => ({ type: 'KaspaTxRequest', message });
const signedTx = (signature: string) => ({ type: 'KaspaSignedTx', message: { signature } });

describe('KaspaSignTransaction capability flags', () => {
  const CASES: [string, Record<string, unknown>, boolean, boolean][] = [
    ['script only (today callers)', {}, true, false],
    [
      'address only',
      { inputs: [buildInput()], outputs: [{ satoshis: 1, address: ADDRESS }] },
      false,
      true,
    ],
    [
      'script + address',
      { outputs: [{ satoshis: 1, script: SCRIPT, address: ADDRESS }] },
      true,
      true,
    ],
    [
      'ECDSA P2PK scripts',
      {
        inputs: [buildInput(ECDSA_SCRIPT)],
        outputs: [{ satoshis: 1, script: ECDSA_SCRIPT, address: ADDRESS }],
      },
      true,
      true,
    ],
    [
      'tx payload rules out legacy',
      { outputs: [{ satoshis: 1, script: SCRIPT, address: ADDRESS }], payload: 'aabb' },
      false,
      true,
    ],
    [
      'non-zero subNetworkID rules out legacy',
      {
        outputs: [{ satoshis: 1, script: SCRIPT, address: ADDRESS }],
        subNetworkID: `01${'0'.repeat(38)}`,
      },
      false,
      true,
    ],
    ['32-zero subNetworkID stays legacy-signable', { subNetworkID: '0'.repeat(32) }, true, false],
    [
      'non-default sigHashType forces blind signing',
      { outputs: [{ satoshis: 1, script: SCRIPT, address: ADDRESS }], sigHashType: 0x03 },
      true,
      false,
    ],
    [
      'P2SH input forces blind signing (KRC20 reveal)',
      {
        inputs: [buildInput(P2SH_SCRIPT)],
        outputs: [{ satoshis: 1, script: SCRIPT, address: ADDRESS }],
      },
      true,
      false,
    ],
    [
      'P2SH output forces blind signing (KRC20 commit)',
      { outputs: [{ satoshis: 1, script: P2SH_SCRIPT, address: ADDRESS }] },
      true,
      false,
    ],
    [
      'empty-string script treated as absent',
      { inputs: [buildInput('')], outputs: [{ satoshis: 1, script: '', address: ADDRESS }] },
      false,
      true,
    ],
  ];

  it.each(CASES)('%s', (_name, overrides, legacy, streaming) => {
    const method = createMethod(overrides);
    method.init();

    expect([method.supportsLegacy, method.supportsStreaming]).toEqual([legacy, streaming]);
  });

  it('rejects malformed refTxs entries at init', () => {
    expect(() =>
      createMethod({ refTxs: [{ version: 0, inputs: [], outputs: [] }] }).init()
    ).toThrow('txId');
  });

  it('throws when neither protocol fits', () => {
    expect(() => createMethod({ outputs: [{ satoshis: 1 }] }).init()).toThrow(
      'outputs require either address/addressN'
    );
  });
});

describe('KaspaSignTransaction protocol negotiation', () => {
  let mockTypedCall: jest.Mock;
  let mockDevice: any;

  beforeEach(() => {
    mockTypedCall = jest.fn();
    mockDevice = { commands: { typedCall: mockTypedCall } };
  });

  const runMethod = (overrides: Record<string, unknown> = {}) => {
    const method = createMethod(overrides);
    method.device = mockDevice;
    method.init();
    return method.run();
  };

  it('streaming: superset first packet, device-driven flow, real message bodies', async () => {
    mockTypedCall
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0 }))
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_OUTPUT', request_index: 0 }))
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_OUTPUT', request_index: 1 }))
      .mockResolvedValueOnce(
        txRequest({
          request_type: 'KASPA_TX_FINISHED',
          signature: { signature_index: 0, signature: 'deadbeef' },
        })
      );

    // Production shape: string amounts / sequence / lockTime.
    const result = await runMethod({
      lockTime: '0',
      inputs: [
        {
          path: PATH,
          prevTxId: 'aa'.repeat(32),
          outputIndex: 1,
          sequenceNumber: '0',
          output: { satoshis: '990096458', script: SCRIPT },
        },
      ],
      outputs: [
        { satoshis: '100000000', script: SCRIPT, address: ADDRESS },
        // Change outputs also need script for the tx to stay legacy-signable.
        { satoshis: '890094182', script: SCRIPT, addressN: CHANGE_PATH },
      ],
      // Without refTxs a legacy-capable tx prefers blind signing instead.
      refTxs: [
        {
          txId: 'aa'.repeat(32),
          version: 0,
          inputs: [],
          outputs: [{ satoshis: '990096458', script: SCRIPT }],
        },
      ],
    });

    expect(result).toEqual([{ index: 0, signature: 'deadbeef' }]);

    // Superset first packet: legacy prehash plus streaming metadata.
    const [type, resTypes, first] = mockTypedCall.mock.calls[0];
    expect(type).toBe('KaspaSignTx');
    expect(resTypes).toEqual(['KaspaTxRequest', 'KaspaTxInputRequest', 'KaspaSignedTx']);
    expect(typeof first.raw_message).toBe('string');
    expect(first).toMatchObject({ input_count: 1, output_count: 2, payload_length: 0 });

    expect(mockTypedCall.mock.calls[1][0]).toBe('KaspaTxAckInput');
    expect(mockTypedCall.mock.calls[1][2]).toMatchObject({
      previous_outpoint: { tx_id: 'aa'.repeat(32), index: 1 },
      amount: '990096458',
      sequence: '0',
      sig_op_count: 1,
      script_type: 'KASPA_SPEND_P2PK_SCHNORR',
    });
    expect(mockTypedCall.mock.calls[2][0]).toBe('KaspaTxAckOutput');
    expect(mockTypedCall.mock.calls[2][2]).toMatchObject({
      script_type: 'KASPA_PAYTOADDRESS',
      amount: '100000000',
      address: ADDRESS,
      address_n: [],
    });
    const changeAck = mockTypedCall.mock.calls[3][2];
    expect(changeAck.script_type).toBe('KASPA_PAYTOCHANGE');
    expect(changeAck.address).toBeUndefined();
    expect(changeAck.address_n.every((n: unknown) => typeof n === 'number')).toBe(true);
  });

  it('legacy: plain packet without streaming fields, input-by-input loop', async () => {
    mockTypedCall
      .mockResolvedValueOnce({
        type: 'KaspaTxInputRequest',
        message: { request_index: 1, signature: 'sig0' },
      })
      .mockResolvedValueOnce(signedTx('sig1'));

    const result = await runMethod({ inputs: [buildInput(SCRIPT), buildInput(SCRIPT)] });

    expect(result).toEqual([
      { index: 0, signature: 'sig0' },
      { index: 1, signature: 'sig1' },
    ]);

    // No output_count → new firmware falls back to blind signing too.
    const first = mockTypedCall.mock.calls[0][2];
    expect(typeof first.raw_message).toBe('string');
    expect(first.output_count).toBeUndefined();
    expect(mockTypedCall.mock.calls[1][0]).toBe('KaspaTxInputAck');
    expect(typeof mockTypedCall.mock.calls[1][2].raw_message).toBe('string');
  });

  it('prefers blind signing when refTxs is absent on a legacy-capable tx', async () => {
    mockTypedCall.mockResolvedValueOnce(signedTx('sig0'));

    const result = await runMethod({
      outputs: [{ satoshis: 100000, script: SCRIPT, address: ADDRESS }],
    });

    expect(result).toEqual([{ index: 0, signature: 'sig0' }]);

    // Streaming needs prev-tx data the caller did not provide: send the plain
    // legacy packet so every firmware generation blind-signs instead.
    const first = mockTypedCall.mock.calls[0][2];
    expect(first.output_count).toBeUndefined();
    expect(typeof first.raw_message).toBe('string');
  });

  it('KRC20-style P2SH input blind-signs even with addresses present', async () => {
    mockTypedCall.mockResolvedValueOnce(signedTx('sig0'));

    const result = await runMethod({
      inputs: [buildInput(P2SH_SCRIPT)],
      outputs: [{ satoshis: 100000, script: SCRIPT, address: ADDRESS }],
    });

    expect(result).toEqual([{ index: 0, signature: 'sig0' }]);
    expect(mockTypedCall.mock.calls[0][2].output_count).toBeUndefined();
  });

  it('collects out-of-order streaming signatures with the last one on FINISHED', async () => {
    mockTypedCall
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 1 }))
      .mockResolvedValueOnce(
        txRequest({
          request_type: 'KASPA_TX_INPUT',
          request_index: 0,
          signature: { signature_index: 1, signature: 'sig1' },
        })
      )
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_OUTPUT', request_index: 0 }))
      .mockResolvedValueOnce(
        txRequest({
          request_type: 'KASPA_TX_FINISHED',
          signature: { signature_index: 0, signature: 'sig0' },
        })
      );

    const result = await runMethod({
      inputs: [buildInput(SCRIPT), buildInput(SCRIPT)],
      outputs: [{ satoshis: 100000, script: SCRIPT, address: ADDRESS }],
    });

    expect(result).toEqual([
      { index: 0, signature: 'sig0' },
      { index: 1, signature: 'sig1' },
    ]);
  });

  it('streams the payload in byte-offset chunks', async () => {
    mockTypedCall
      .mockResolvedValueOnce(
        txRequest({ request_type: 'KASPA_TX_PAYLOAD', request_index: 0, request_payload_length: 4 })
      )
      .mockResolvedValueOnce(
        txRequest({ request_type: 'KASPA_TX_PAYLOAD', request_index: 4, request_payload_length: 2 })
      )
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0 }))
      .mockResolvedValueOnce(
        txRequest({
          request_type: 'KASPA_TX_FINISHED',
          signature: { signature_index: 0, signature: 'sig0' },
        })
      );

    const result = await runMethod({
      inputs: [buildInput()],
      outputs: [{ satoshis: 100000, address: ADDRESS }],
      payload: 'aabbccddeeff',
    });

    expect(result).toEqual([{ index: 0, signature: 'sig0' }]);
    expect(mockTypedCall.mock.calls[0][2].payload_length).toBe(6);
    expect(mockTypedCall.mock.calls[1][2]).toEqual({ payload_chunk: 'aabbccdd' });
    expect(mockTypedCall.mock.calls[2][2]).toEqual({ payload_chunk: 'eeff' });
  });

  it('maps the old-firmware decode failure to 407 but keeps other errors intact', async () => {
    const streamingOnly = {
      inputs: [buildInput()],
      outputs: [{ satoshis: 100000, address: ADDRESS }],
    };

    // Old firmware cannot decode a packet without raw_message → actionable 407.
    mockTypedCall.mockRejectedValueOnce(
      ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Failure_DataError,Failed to decode message'
      )
    );
    await expect(runMethod(streamingOnly)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodNeedUpgradeFirmware,
    });
    // A streaming-only tx must not offer a (wrong) legacy prehash.
    expect(mockTypedCall.mock.calls[0][2].raw_message).toBeUndefined();

    // User cancellation must pass through untouched.
    mockTypedCall.mockRejectedValueOnce(ERRORS.TypedError(HardwareErrorCode.ActionCancelled));
    await expect(runMethod(streamingOnly)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });
  });

  it('fails cleanly on protocol violations from the device', async () => {
    // Streams against a legacy-only packet (no output_count sent).
    mockTypedCall.mockResolvedValueOnce(
      txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0 })
    );
    await expect(runMethod()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });

    // Answers legacy against a streaming-only packet (no prehash material).
    mockTypedCall.mockResolvedValueOnce({
      type: 'KaspaTxInputRequest',
      message: { request_index: 1 },
    });
    await expect(
      runMethod({ inputs: [buildInput()], outputs: [{ satoshis: 100000, address: ADDRESS }] })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });

    const superset = { outputs: [{ satoshis: 100000, script: SCRIPT, address: ADDRESS }] };

    // Out-of-range input index.
    mockTypedCall.mockResolvedValueOnce(
      txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 5 })
    );
    await expect(runMethod(superset)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });

    // Fewer signatures than inputs.
    mockTypedCall.mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_FINISHED' }));
    await expect(runMethod(superset)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });

    // Previous-transaction request without the matching refTxs entry: must
    // fail clearly, never answered with current-tx data.
    mockTypedCall.mockResolvedValueOnce(
      txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0, prev_tx_id: 'bb'.repeat(32) })
    );
    await expect(runMethod(superset)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
  });

  it('answers previous-transaction requests from refTxs', async () => {
    const PREV_ID = 'bb'.repeat(32);
    mockTypedCall
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_PREV_META', prev_tx_id: PREV_ID }))
      .mockResolvedValueOnce(
        txRequest({ request_type: 'KASPA_TX_OUTPUT', request_index: 0, prev_tx_id: PREV_ID })
      )
      .mockResolvedValueOnce(
        txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0, prev_tx_id: PREV_ID })
      )
      .mockResolvedValueOnce(txRequest({ request_type: 'KASPA_TX_INPUT', request_index: 0 }))
      .mockResolvedValueOnce(
        txRequest({
          request_type: 'KASPA_TX_FINISHED',
          signature: { signature_index: 0, signature: 'sig0' },
        })
      );

    const result = await runMethod({
      outputs: [{ satoshis: 100000, script: SCRIPT, address: ADDRESS }],
      refTxs: [
        {
          txId: PREV_ID,
          version: 0,
          inputs: [{ prevTxId: 'cc'.repeat(32), outputIndex: 2, sequenceNumber: 0 }],
          outputs: [{ satoshis: '200000', script: SCRIPT }],
        },
      ],
    });

    expect(result).toEqual([{ index: 0, signature: 'sig0' }]);

    expect(mockTypedCall.mock.calls[1][0]).toBe('KaspaTxAckPrevMeta');
    expect(mockTypedCall.mock.calls[1][2]).toMatchObject({
      version: 0,
      input_count: 1,
      output_count: 1,
      lock_time: 0,
      payload_length: 0,
    });
    expect(mockTypedCall.mock.calls[2][0]).toBe('KaspaTxAckPrevOutput');
    expect(mockTypedCall.mock.calls[2][2]).toMatchObject({
      amount: '200000',
      script_version: 0,
      script_public_key: SCRIPT,
    });
    expect(mockTypedCall.mock.calls[3][0]).toBe('KaspaTxAckPrevInput');
    expect(mockTypedCall.mock.calls[3][2]).toMatchObject({
      previous_outpoint: { tx_id: 'cc'.repeat(32), index: 2 },
      sequence: 0,
    });
    // Back to the current transaction after the previous one is streamed.
    expect(mockTypedCall.mock.calls[4][0]).toBe('KaspaTxAckInput');
  });
});

describe('KaspaSignTransaction wire encoding', () => {
  // Encode through the real protobuf descriptor to lock in the two facts the
  // mocked tests cannot prove: unset optional fields stay off the wire (the
  // output_count protocol discriminator), and string uint64 values encode.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const protobuf = require('protobufjs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const messagesJson = require('../src/data/messages/messages.json');

  it('unset streaming fields stay off the wire; string uint64 values encode', () => {
    const root = protobuf.Root.fromJSON(messagesJson);
    const KaspaSignTx = root.lookupType('KaspaSignTx');

    const wireFieldIds = (buf: Uint8Array) => {
      const reader = protobuf.Reader.create(buf);
      const ids: number[] = [];
      while (reader.pos < reader.len) {
        const tag = reader.uint32();
        // eslint-disable-next-line no-bitwise
        ids.push(tag >>> 3);
        // eslint-disable-next-line no-bitwise
        reader.skipType(tag & 7);
      }
      return ids;
    };

    const base = {
      address_n: [2147483692, 2147483759, 2147483648, 0, 0],
      scheme: 'schnorr',
      prefix: 'kaspa',
      input_count: 1,
    };

    const legacyIds = wireFieldIds(
      KaspaSignTx.encode(
        KaspaSignTx.fromObject({ ...base, raw_message: Buffer.from('aabbcc', 'hex') })
      ).finish()
    );
    expect(legacyIds).toContain(2); // raw_message present
    expect(legacyIds.filter((id: number) => id >= 7)).toEqual([]); // no streaming fields

    const streamingIds = wireFieldIds(
      KaspaSignTx.encode(
        KaspaSignTx.fromObject({ ...base, output_count: 2, lock_time: '0', gas: '0' })
      ).finish()
    );
    expect(streamingIds).toContain(7); // output_count — the protocol discriminator
    expect(streamingIds).not.toContain(2); // no raw_message
  });

  it('decodes enum fields to string names via the real transport decoder', () => {
    // signTxStream compares request_type against string literals
    // ('KASPA_TX_OUTPUT', ...); pin the decoder behavior that guarantees it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { decode } = require('../../hd-transport/src/serialization/protobuf/decode');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const ByteBuffer = require('bytebuffer');

    const root = protobuf.Root.fromJSON(messagesJson);
    const KaspaTxRequest = root.lookupType('KaspaTxRequest');

    // Enums travel as numbers on the wire (KASPA_TX_OUTPUT = 1).
    const encoded = KaspaTxRequest.encode(
      KaspaTxRequest.fromObject({ request_type: 1, request_index: 0 })
    ).finish();

    const message = decode(KaspaTxRequest, ByteBuffer.wrap(Buffer.from(encoded)));
    expect(message.request_type).toBe('KASPA_TX_OUTPUT');
    // Absent optional sub-message must decode to null, not crash the decoder
    // (the device's first request legitimately carries no signature).
    expect(message.signature).toBeNull();
  });
});
