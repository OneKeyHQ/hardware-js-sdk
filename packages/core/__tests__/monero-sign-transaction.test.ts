import MoneroSignTransaction from '../src/api/monero/MoneroSignTransaction';
import { getMoneroVersionRange } from '../src/api/monero/helpers';
import { toHardened } from '../src/api/helpers/pathUtils';

import type { Device } from '../src/device/Device';
import type {
  MoneroTransactionDestinationEntry,
  MoneroTransactionSourceEntry,
} from '@onekeyfe/hd-transport';
import type { MoneroSignTransactionResult } from '../src/types/api/moneroSignTransaction';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const ACCOUNT_0 = [toHardened(44), toHardened(128), toHardened(0)];
const key = (byte: number) => byte.toString(16).padStart(2, '0').repeat(32);

// Original order. Sorted descending: input 1 (f0..), input 2 (0aff..ff), input 0 (0aff..fe).
// Inputs 0 and 2 differ only in the last byte.
const KEY_IMAGES = [
  '0a'.concat('ff'.repeat(30), 'fe'),
  'f0'.concat('00'.repeat(31)),
  '0a'.concat('ff'.repeat(31)),
];
const SORTED_ORIG_INDICES = [1, 2, 0];
// Prefix bytes ordered against the key images, so sorting whole vinis would differ.
const VINI_PREFIXES = ['0210ff', '021000', '021080'];
const SE_SPEND_TOKEN = 'f1'.repeat(107);
const OPENING_KEY = '0e'.repeat(32);

const ring = (base: number) =>
  Array.from({ length: 16 }, (_, i) => ({
    idx: base + i,
    key: { dest: key(i + 1), commitment: key(i + 0x40) },
  }));

const sourceEntry = (index: number): MoneroTransactionSourceEntry => ({
  outputs: ring(1000 * (index + 1)),
  real_output: 3,
  real_out_tx_key: key(0x91),
  real_out_additional_tx_keys: [],
  real_output_in_tx_index: index,
  amount: `${index + 1}000000000000`,
  rct: true,
  // The fake device keys its replies on the mask.
  mask: key(0xa0 + index),
  subaddr_minor: 0,
});

const destination = (byte: number, amount: string): MoneroTransactionDestinationEntry => ({
  amount,
  addr: { spend_public_key: key(byte), view_public_key: key(byte + 1) },
  is_subaddress: false,
  is_integrated: false,
});

const RECIPIENT = destination(0x31, '2500000000000');
const CHANGE = destination(0x41, '3400000000000');

const tsxData = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  client_version: 3,
  hard_fork: 16,
  unlock_time: 0,
  num_inputs: 3,
  mixin: 15,
  fee: '100000000',
  account: 0,
  minor_indices: [0],
  outputs: [CHANGE, RECIPIENT],
  change_dts: CHANGE,
  rsig_data: { rsig_type: 3, bp_version: 4, grouping: [2] },
  integrated_indices: [],
  ...overrides,
});

const INPUTS = [0, 1, 2].map(sourceEntry);

const inputIndexOf = (src?: MoneroTransactionSourceEntry) =>
  [0, 1, 2].find(i => src?.mask === key(0xa0 + i)) as number;

type FakeOptions = {
  offloadType?: number;
  keyImages?: string[];
  rsigOnOutputs?: number[];
  openingKey?: string | null;
  finalAck?: Record<string, unknown>;
};

type FakeMessage = {
  src_entr?: MoneroTransactionSourceEntry;
  orig_idx?: number;
  dst_entr?: MoneroTransactionDestinationEntry;
};

const createFakeDevice = (options: FakeOptions = {}) => {
  const keyImages = options.keyImages ?? KEY_IMAGES;
  let outputIndex = 0;
  return (type: string, _resType: string, msg?: FakeMessage) => {
    const reply = (message: Record<string, unknown>) =>
      Promise.resolve({ type: type.replace(/Request$/, 'Ack'), message });
    switch (type) {
      case 'MoneroTransactionInitRequest':
        return reply({
          hmacs: ['c1'.repeat(32), 'c2'.repeat(32)],
          rsig_data: { offload_type: options.offloadType ?? 0, grouping: [] },
        });
      case 'MoneroTransactionSetInputRequest': {
        const i = inputIndexOf(msg?.src_entr);
        return reply({
          vini: `${VINI_PREFIXES[i]}${keyImages[i]}`,
          vini_hmac: key(0xb0 + i),
          pseudo_out: key(0xc0 + i),
          pseudo_out_hmac: key(0xd0 + i),
          pseudo_out_alpha: key(0xe0 + i),
          spend_key: `${SE_SPEND_TOKEN}0${i}`,
        });
      }
      case 'MoneroTransactionInputViniRequest':
      case 'MoneroTransactionAllInputsSetRequest':
        return reply({});
      case 'MoneroTransactionSetOutputRequest': {
        const i = outputIndex++;
        const withRsig = (options.rsigOnOutputs ?? [1]).includes(i);
        return reply({
          tx_out: `0${i}`.repeat(34),
          vouti_hmac: key(0x70 + i),
          out_pk: `${key(0x80 + i)}${key(0x90 + i)}`,
          ecdh_info: `e${i}`.repeat(8),
          rsig_data: withRsig
            ? { rsig: 'bb'.repeat(32 * 6 + 2), grouping: [], rsig_parts: [] }
            : null,
        });
      }
      case 'MoneroTransactionAllOutSetRequest':
        return reply({
          extra: `01${key(0x55)}020901${'00'.repeat(8)}`,
          tx_prefix_hash: key(0x56),
          rv: { txn_fee: 100000000, message: key(0x56), rv_type: 6 },
          full_message_hash: key(0x57),
        });
      case 'MoneroTransactionSignInputRequest':
        return reply({
          signature: `5${msg?.orig_idx}`.repeat(40),
          pseudo_out: key(0x60 + (msg?.orig_idx ?? 0)),
        });
      case 'MoneroTransactionFinalRequest':
        return reply({
          opening_key: options.openingKey === undefined ? OPENING_KEY : options.openingKey,
          salt: key(0x11),
          rand_mult: key(0x12),
          tx_enc_keys: 'ab'.repeat(48),
          ...options.finalAck,
        });
      default:
        return Promise.reject(new Error(`unexpected ${type}`));
    }
  };
};

const attachDevice = (method: MoneroSignTransaction, typedCall: jest.Mock) => {
  const commands = { typedCall };
  method.device = {
    commands,
    getCommands: () => commands,
    toMessageObject: () => ({}),
  } as unknown as Device;
  method.postMessage = jest.fn();
};

const createMethod = (payload: Record<string, unknown>) =>
  new MoneroSignTransaction({
    id: 1,
    payload: {
      method: 'moneroSignTransaction',
      path: "m/44'/128'/0'",
      tsxData: tsxData(),
      inputs: INPUTS,
      ...payload,
    },
  });

const runWith = (options: FakeOptions = {}, payload: Record<string, unknown> = {}) => {
  const method = createMethod(payload);
  method.init();
  const typedCall = jest.fn(createFakeDevice(options));
  attachDevice(method, typedCall);
  const run = method.run();
  return { method, typedCall, run };
};

const callsOf = (typedCall: jest.Mock, type: string) =>
  typedCall.mock.calls.filter(call => call[0] === type).map(call => call[2]);

describe('MoneroSignTransaction', () => {
  test('uses the Monero device rules of the other Monero methods', () => {
    const method = createMethod({});
    method.init();

    expect(method.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(method.strictCheckDeviceSupport).toBe(true);
    expect(method.checkDeviceId).toBe(true);
    expect(method.getVersionRange()).toEqual(getMoneroVersionRange());
  });

  test('runs the whole protocol in order and returns the raw parts', async () => {
    const { typedCall, run } = runWith({}, { networkType: 1 });
    const result = await run;

    expect(typedCall.mock.calls.map(call => [call[0], call[1]])).toEqual([
      ['MoneroTransactionInitRequest', 'MoneroTransactionInitAck'],
      ['MoneroTransactionSetInputRequest', 'MoneroTransactionSetInputAck'],
      ['MoneroTransactionSetInputRequest', 'MoneroTransactionSetInputAck'],
      ['MoneroTransactionSetInputRequest', 'MoneroTransactionSetInputAck'],
      ['MoneroTransactionInputViniRequest', 'MoneroTransactionInputViniAck'],
      ['MoneroTransactionInputViniRequest', 'MoneroTransactionInputViniAck'],
      ['MoneroTransactionInputViniRequest', 'MoneroTransactionInputViniAck'],
      ['MoneroTransactionAllInputsSetRequest', 'MoneroTransactionAllInputsSetAck'],
      ['MoneroTransactionSetOutputRequest', 'MoneroTransactionSetOutputAck'],
      ['MoneroTransactionSetOutputRequest', 'MoneroTransactionSetOutputAck'],
      ['MoneroTransactionAllOutSetRequest', 'MoneroTransactionAllOutSetAck'],
      ['MoneroTransactionSignInputRequest', 'MoneroTransactionSignInputAck'],
      ['MoneroTransactionSignInputRequest', 'MoneroTransactionSignInputAck'],
      ['MoneroTransactionSignInputRequest', 'MoneroTransactionSignInputAck'],
      ['MoneroTransactionFinalRequest', 'MoneroTransactionFinalAck'],
    ]);
    expect(typedCall.mock.calls[0][2]).toEqual({
      version: 0,
      address_n: ACCOUNT_0,
      network_type: 1,
      tsx_data: tsxData(),
    });
    expect(callsOf(typedCall, 'MoneroTransactionSetInputRequest')).toEqual(
      INPUTS.map(src_entr => ({ src_entr }))
    );
    for (const type of [
      'MoneroTransactionAllInputsSetRequest',
      'MoneroTransactionAllOutSetRequest',
      'MoneroTransactionFinalRequest',
    ]) {
      expect(callsOf(typedCall, type)).toEqual([{}]);
    }

    expect(result).toEqual<MoneroSignTransactionResult>({
      origIndices: SORTED_ORIG_INDICES,
      vinis: SORTED_ORIG_INDICES.map(i => `${VINI_PREFIXES[i]}${KEY_IMAGES[i]}`),
      pseudoOuts: SORTED_ORIG_INDICES.map(i => key(0x60 + i)),
      signatures: SORTED_ORIG_INDICES.map(i => `5${i}`.repeat(40)),
      txOuts: ['00'.repeat(34), '01'.repeat(34)],
      outPks: [`${key(0x80)}${key(0x90)}`, `${key(0x81)}${key(0x91)}`],
      ecdhInfos: ['e0'.repeat(8), 'e1'.repeat(8)],
      rsig: 'bb'.repeat(32 * 6 + 2),
      extra: `01${key(0x55)}020901${'00'.repeat(8)}`,
      txPrefixHash: key(0x56),
      fullMessageHash: key(0x57),
      rv: { txnFee: '100000000', message: key(0x56), rvType: 6 },
      openingKey: OPENING_KEY,
      salt: key(0x11),
      randMult: key(0x12),
      txEncKeys: 'ab'.repeat(48),
    });
  });

  test('sorts inputs by key image, descending, and hands back what each input got', async () => {
    const { typedCall, run } = runWith();
    await run;

    const vinis = callsOf(typedCall, 'MoneroTransactionInputViniRequest');
    expect(vinis).toEqual(
      SORTED_ORIG_INDICES.map(i => ({
        src_entr: INPUTS[i],
        vini: `${VINI_PREFIXES[i]}${KEY_IMAGES[i]}`,
        vini_hmac: key(0xb0 + i),
        pseudo_out: key(0xc0 + i),
        pseudo_out_hmac: key(0xd0 + i),
        orig_idx: i,
      }))
    );
    const signs = callsOf(typedCall, 'MoneroTransactionSignInputRequest');
    expect(signs).toEqual(
      SORTED_ORIG_INDICES.map(i => ({
        src_entr: INPUTS[i],
        vini: `${VINI_PREFIXES[i]}${KEY_IMAGES[i]}`,
        vini_hmac: key(0xb0 + i),
        // SetInputAck values; the corrected pseudo-out only comes back in SignInputAck.
        pseudo_out: key(0xc0 + i),
        pseudo_out_hmac: key(0xd0 + i),
        pseudo_out_alpha: key(0xe0 + i),
        spend_key: `${SE_SPEND_TOKEN}0${i}`,
        orig_idx: i,
      }))
    );
    const keyImages = vinis.map(({ vini }) => vini.slice(-64));
    expect([...keyImages].sort().reverse()).toEqual(keyImages);
  });

  test('resends the same source and destination entries in every step', async () => {
    const { typedCall, run } = runWith();
    await run;

    const byInput = (type: string) =>
      new Map(callsOf(typedCall, type).map(({ src_entr }) => [inputIndexOf(src_entr), src_entr]));
    const setInputs = byInput('MoneroTransactionSetInputRequest');
    const vinis = byInput('MoneroTransactionInputViniRequest');
    const signs = byInput('MoneroTransactionSignInputRequest');
    [0, 1, 2].forEach(i => {
      expect(setInputs.get(i)).toEqual(INPUTS[i]);
      expect(vinis.get(i)).toBe(setInputs.get(i));
      expect(signs.get(i)).toBe(setInputs.get(i));
    });

    const initOutputs = typedCall.mock.calls[0][2].tsx_data.outputs;
    expect(callsOf(typedCall, 'MoneroTransactionSetOutputRequest')).toEqual([
      { dst_entr: CHANGE, dst_entr_hmac: 'c1'.repeat(32) },
      { dst_entr: RECIPIENT, dst_entr_hmac: 'c2'.repeat(32) },
    ]);
    callsOf(typedCall, 'MoneroTransactionSetOutputRequest').forEach(({ dst_entr }, i) => {
      expect(dst_entr).toBe(initOutputs[i]);
    });
  });

  test('drops null fields once so every step encodes the same entries', async () => {
    const input = { ...INPUTS[0], multisig_kLRki: null, real_out_tx_key: undefined };
    const { typedCall, run } = runWith(
      { keyImages: KEY_IMAGES },
      {
        tsxData: tsxData({ num_inputs: 1, payment_id: null, change_dts: null }),
        inputs: [input],
      }
    );
    await run;

    const init = typedCall.mock.calls[0][2];
    expect(init.tsx_data).not.toHaveProperty('payment_id');
    expect(init.tsx_data).not.toHaveProperty('change_dts');
    const sent = [
      'MoneroTransactionSetInputRequest',
      'MoneroTransactionInputViniRequest',
      'MoneroTransactionSignInputRequest',
    ].map(type => callsOf(typedCall, type)[0].src_entr);
    expect(sent[0]).not.toHaveProperty('multisig_kLRki');
    expect(sent[0]).not.toHaveProperty('real_out_tx_key');
    expect(sent[1]).toBe(sent[0]);
    expect(sent[2]).toBe(sent[0]);
  });

  test('refuses a device that offloads the range proof to the host', async () => {
    const { typedCall, run } = runWith({ offloadType: 1 });

    await expect(run).rejects.toThrow(/range proof.*not supported/);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual(['MoneroTransactionInitRequest']);
  });

  test('stops before the vini step when two inputs share a key image', async () => {
    const { typedCall, run } = runWith({
      keyImages: [KEY_IMAGES[0], KEY_IMAGES[1], KEY_IMAGES[0]],
    });

    await expect(run).rejects.toThrow(/same key image/);
    expect(callsOf(typedCall, 'MoneroTransactionInputViniRequest')).toEqual([]);
  });

  test.each([
    ['no range proof', { rsigOnOutputs: [] }, /one aggregated range proof, got 0/],
    ['two range proofs', { rsigOnOutputs: [0, 1] }, /one aggregated range proof, got 2/],
    ['no opening key', { openingKey: null }, /opening_key/],
    ['no salt', { finalAck: { salt: null } }, /missing salt/],
    ['no rand_mult', { finalAck: { rand_mult: null } }, /missing rand_mult/],
    ['no tx_enc_keys', { finalAck: { tx_enc_keys: '' } }, /missing tx_enc_keys/],
  ])('fails when the device returns %s', async (_, options, message) => {
    const { run } = runWith(options);
    await expect(run).rejects.toThrow(message);
  });

  test('fails when the device returns fewer output HMACs than outputs', async () => {
    const method = createMethod({});
    method.init();
    const fake = createFakeDevice();
    const typedCall = jest.fn((type: string, resType: string, msg?: FakeMessage) =>
      type === 'MoneroTransactionInitRequest'
        ? Promise.resolve({ type: resType, message: { hmacs: ['c1'.repeat(32)], rsig_data: null } })
        : fake(type, resType, msg)
    );
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow(/output HMACs/);
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  const withRsig = (rsigData: Record<string, unknown> | null) => ({
    tsxData: tsxData({ rsig_data: rsigData }),
  });

  test.each([
    ['an undefined tsxData', { tsxData: undefined }, /tsxData must be an object/],
    ['a non-object tsxData', { tsxData: [] }, /tsxData must be an object/],
    ['undefined inputs', { inputs: undefined }, /inputs must be a non-empty array/],
    ['empty inputs', { inputs: [] }, /"inputs" is empty/],
    [
      'a non-object input',
      { inputs: [INPUTS[0], null, INPUTS[2]] },
      /inputs\[1\] must be an object/,
    ],
    ['a short path', { path: "m/44'/128'" }, /Not a valid path/],
    ['an unknown network type', { networkType: 3 }, /network type/],
    ['num_inputs not matching the inputs', { tsxData: tsxData({ num_inputs: 2 }) }, /num_inputs/],
    ['a single output', { tsxData: tsxData({ outputs: [CHANGE] }) }, /at least 2 outputs/],
    ['a missing hard_fork', { tsxData: tsxData({ hard_fork: undefined }) }, /hard_fork/],
    ['a zero hard_fork', { tsxData: tsxData({ hard_fork: 0 }) }, /hard_fork/],
    ['missing rsig_data', withRsig(null), /bp_version must be 4/],
    ['Bulletproofs v1', withRsig({ rsig_type: 3, bp_version: 3, grouping: [2] }), /bp_version/],
    [
      'grouping short of the outputs',
      withRsig({ rsig_type: 3, bp_version: 4, grouping: [1] }),
      /grouping must add up/,
    ],
    [
      'an empty batch',
      withRsig({ rsig_type: 3, bp_version: 4, grouping: [0, 2] }),
      /grouping must add up/,
    ],
    ['missing grouping', withRsig({ rsig_type: 3, bp_version: 4 }), /grouping must add up/],
  ])('rejects %s', (_, params, message) => {
    expect(() => createMethod(params).init()).toThrow(message);
  });

  test('accepts the outputs split into several batches', () => {
    const method = createMethod(withRsig({ rsig_type: 3, bp_version: 4, grouping: [1, 1] }));
    expect(() => method.init()).not.toThrow();
    expect(method.params.address_n).toEqual(ACCOUNT_0);
    expect(method.params.network_type).toBe(0);
  });
});
