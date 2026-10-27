import MoneroKeyImageSync from '../src/api/monero/MoneroKeyImageSync';
import { getMoneroVersionRange } from '../src/api/monero/helpers';
import { toHardened } from '../src/api/helpers/pathUtils';

import type { Device } from '../src/device/Device';
import type { MoneroTransferDetails } from '@onekeyfe/hd-transport';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const ACCOUNT_0 = [toHardened(44), toHardened(128), toHardened(0)];
const ENC_KEY = 'ee'.repeat(32);
const key = (byte: number) => byte.toString(16).padStart(2, '0').repeat(32);
const indexKey = (index: number) => index.toString(16).padStart(64, '0');

// Expected values from an independent Keccak-256 over the firmware layout
// (apps/monero/xmr/key_image.py compute_hash): out_key || tx_pub_key ||
// additional_tx_pub_keys || uvarint(internal_output_index); the init hash is
// keccak over the concatenated per-transfer digests (key_image_sync.py).
const VECTOR_TRANSFERS = [
  { outKey: key(1), txPubKey: key(2), internalOutputIndex: 0 },
  { outKey: key(3), txPubKey: key(4), additionalTxPubKeys: [key(5)], internalOutputIndex: 300 },
];
const VECTOR_HASH = '66dfea8ea33dd0b1165d4729e71117f796eb43d58e452e7c3885d9de859d43c3';

type StepMessage = { tdis?: MoneroTransferDetails[] };

// Fake device: one encrypted key image per transfer, tagged by its out_key.
const fakeDevice = (type: string, _resType: string, msg?: StepMessage) => {
  switch (type) {
    case 'MoneroKeyImageExportInitRequest':
      return Promise.resolve({ type: 'MoneroKeyImageExportInitAck', message: {} });
    case 'MoneroKeyImageSyncStepRequest':
      return Promise.resolve({
        type: 'MoneroKeyImageSyncStepAck',
        message: {
          kis: (msg?.tdis ?? []).map(td => ({
            iv: td.out_key?.slice(0, 24),
            blob: `b0${td.out_key}`,
          })),
        },
      });
    case 'MoneroKeyImageSyncFinalRequest':
      return Promise.resolve({ type: 'MoneroKeyImageSyncFinalAck', message: { enc_key: ENC_KEY } });
    default:
      return Promise.reject(new Error(`unexpected ${type}`));
  }
};

const createTypedCall = () => jest.fn(fakeDevice);

const attachDevice = (method: MoneroKeyImageSync, typedCall: jest.Mock) => {
  const commands = { typedCall };
  method.device = {
    commands,
    getCommands: () => commands,
    toMessageObject: () => ({}),
  } as unknown as Device;
  method.postMessage = jest.fn();
};

const createMethod = (payload: Record<string, unknown>) =>
  new MoneroKeyImageSync({ id: 1, payload: { method: 'moneroKeyImageSync', ...payload } });

const transferAt = (index: number) => ({
  outKey: indexKey(index),
  txPubKey: key(0xaa),
  internalOutputIndex: index,
});

describe('MoneroKeyImageSync', () => {
  test('uses the Monero device rules of the other Monero methods', () => {
    const method = createMethod({ path: "m/44'/128'/0'", transfers: [transferAt(0)] });
    method.init();

    expect(method.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(method.strictCheckDeviceSupport).toBe(true);
    expect(method.checkDeviceId).toBe(true);
    expect(method.getVersionRange()).toEqual(getMoneroVersionRange());
  });

  test('commits to the transfers with the firmware hash and returns the key images', async () => {
    const method = createMethod({
      path: "m/44'/128'/0'",
      networkType: 2,
      transfers: VECTOR_TRANSFERS,
    });
    method.init();
    const typedCall = createTypedCall();
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({
      encKey: ENC_KEY,
      keyImages: [
        { iv: key(1).slice(0, 24), blob: `b0${key(1)}` },
        { iv: key(3).slice(0, 24), blob: `b0${key(3)}` },
      ],
    });
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'MoneroKeyImageExportInitRequest',
      'MoneroKeyImageSyncStepRequest',
      'MoneroKeyImageSyncFinalRequest',
    ]);
    expect(typedCall.mock.calls[0]).toEqual([
      'MoneroKeyImageExportInitRequest',
      'MoneroKeyImageExportInitAck',
      { num: 2, hash: VECTOR_HASH, address_n: ACCOUNT_0, network_type: 2, subs: [] },
    ]);
    expect(typedCall.mock.calls[1][2]).toEqual({
      tdis: [
        {
          out_key: key(1),
          tx_pub_key: key(2),
          additional_tx_pub_keys: [],
          internal_output_index: 0,
          sub_addr_major: 0,
          sub_addr_minor: 0,
        },
        {
          out_key: key(3),
          tx_pub_key: key(4),
          additional_tx_pub_keys: [key(5)],
          internal_output_index: 300,
          sub_addr_major: 0,
          sub_addr_minor: 0,
        },
      ],
    });
    expect(typedCall.mock.calls[2][2]).toEqual({});
  });

  test('hashes an output index above 2^31 as a full varint', async () => {
    const method = createMethod({
      path: "m/44'/128'/0'",
      transfers: [{ outKey: key(1), txPubKey: key(2), internalOutputIndex: 2 ** 35 + 5 }],
    });
    method.init();
    const typedCall = createTypedCall();
    attachDevice(method, typedCall);

    await method.run();
    // uvarint(2^35 + 5) = 85 80 80 80 80 01
    expect(typedCall.mock.calls[0][2]).toMatchObject({
      hash: '38d7a92307938e332a62a5c8acb706638dd07a0cbb38c6cbbd8cb90049dd2d5c',
    });
  });

  test('normalizes hex keys and keeps the subaddress index', () => {
    const method = createMethod({
      path: [toHardened(44), toHardened(128), toHardened(3)],
      transfers: [
        {
          outKey: `0x${key(0xab).toUpperCase()}`,
          txPubKey: key(0xcd),
          internalOutputIndex: 1,
          subAddrMajor: 2,
          subAddrMinor: 7,
        },
      ],
    });
    method.init();

    expect(method.params.address_n).toEqual([toHardened(44), toHardened(128), toHardened(3)]);
    expect(method.params.network_type).toBe(0);
    expect(method.params.tdis[0]).toMatchObject({
      out_key: key(0xab),
      sub_addr_major: 2,
      sub_addr_minor: 7,
    });
  });

  test('sends transfers in steps of 10 and keeps the key images in order', async () => {
    const transfers = Array.from({ length: 23 }, (_, i) => transferAt(i));
    const method = createMethod({ path: "m/44'/128'/0'", transfers });
    method.init();
    const typedCall = createTypedCall();
    attachDevice(method, typedCall);

    const result = (await method.run()) as { keyImages: { blob: string }[] };

    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'MoneroKeyImageExportInitRequest',
      'MoneroKeyImageSyncStepRequest',
      'MoneroKeyImageSyncStepRequest',
      'MoneroKeyImageSyncStepRequest',
      'MoneroKeyImageSyncFinalRequest',
    ]);
    expect(typedCall.mock.calls[0][2]).toMatchObject({ num: 23 });
    const steps = typedCall.mock.calls.slice(1, 4).map(call => call[2].tdis);
    expect(steps.map(step => step.length)).toEqual([10, 10, 3]);
    expect(steps.flat().map((td: MoneroTransferDetails) => td.internal_output_index)).toEqual(
      transfers.map(transfer => transfer.internalOutputIndex)
    );
    expect(result.keyImages.map(ki => ki.blob)).toEqual(
      transfers.map(transfer => `b0${transfer.outKey}`)
    );
  });

  const withTransfer = (fields: Record<string, unknown>) => ({
    transfers: [{ ...transferAt(0), ...fields }],
  });

  test.each([
    ['missing transfers', {}, /Missing required parameter: transfers/],
    ['empty transfers', { transfers: [] }, /"transfers" is empty/],
    ['a non-array transfers', { transfers: 'abc' }, /\[transfers\]/],
    ['a short outKey', withTransfer({ outKey: key(1).slice(2) }), /\.outKey must be/],
    ['a non-hex txPubKey', withTransfer({ txPubKey: 'zz'.repeat(32) }), /\.txPubKey must be/],
    [
      'a short additional key',
      withTransfer({ additionalTxPubKeys: ['00'] }),
      /\.additionalTxPubKeys\[0\] must be/,
    ],
    [
      'a non-array additionalTxPubKeys',
      withTransfer({ additionalTxPubKeys: key(5) }),
      /\.additionalTxPubKeys must be an array/,
    ],
    [
      'a missing output index',
      { transfers: [{ outKey: key(1), txPubKey: key(2) }] },
      /\.internalOutputIndex must be/,
    ],
    ['a negative output index', withTransfer({ internalOutputIndex: -1 }), /internalOutputIndex/],
    [
      'a fractional output index',
      withTransfer({ internalOutputIndex: 1.5 }),
      /internalOutputIndex/,
    ],
    [
      'an out of range subaddress',
      withTransfer({ subAddrMajor: 2 ** 32 }),
      /\.subAddrMajor must be/,
    ],
    ['an unknown network type', { transfers: [transferAt(0)], networkType: 3 }, /network type/],
  ])('rejects %s', (_, params, message) => {
    expect(() => createMethod({ path: "m/44'/128'/0'", ...params }).init()).toThrow(message);
  });

  test('fails when a step returns fewer key images than transfers', async () => {
    const method = createMethod({ path: "m/44'/128'/0'", transfers: VECTOR_TRANSFERS });
    method.init();
    const typedCall = jest.fn((type: string, resType: string, msg?: StepMessage) =>
      type === 'MoneroKeyImageSyncStepRequest'
        ? Promise.resolve({ type: resType, message: { kis: [{ iv: '00', blob: '00' }] } })
        : fakeDevice(type, resType, msg)
    );
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow(/Expected array length of 2/);
  });

  test('fails when the device omits the encryption key', async () => {
    const method = createMethod({ path: "m/44'/128'/0'", transfers: VECTOR_TRANSFERS });
    method.init();
    const typedCall = jest.fn((type: string, resType: string, msg?: StepMessage) =>
      type === 'MoneroKeyImageSyncFinalRequest'
        ? Promise.resolve({ type: resType, message: { enc_key: null } })
        : fakeDevice(type, resType, msg)
    );
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow(/encKey/);
  });
});
