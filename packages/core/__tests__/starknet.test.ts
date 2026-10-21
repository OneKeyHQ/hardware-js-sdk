import {
  StarknetDAMode,
  StarknetPrivacyViewingKeyDerivation,
  StarknetPublicKeyType,
} from '@onekeyfe/hd-transport';

import StarknetExportPrivacyViewingKey from '../src/api/starknet/StarknetExportPrivacyViewingKey';
import StarknetGetAddress from '../src/api/starknet/StarknetGetAddress';
import StarknetGetPublicKey from '../src/api/starknet/StarknetGetPublicKey';
import StarknetSignTransaction from '../src/api/starknet/StarknetSignTransaction';
import { getLogBlockLabel } from '../src/events';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

type IStarknetMethod =
  | StarknetGetPublicKey
  | StarknetGetAddress
  | StarknetSignTransaction
  | StarknetExportPrivacyViewingKey;

const PATH = "m/44'/9004'/0'/0/0";
const ADDRESS_N = [0x8000002c, 0x8000232c, 0x80000000, 0, 0];
// OpenZeppelin account v1.0.0, one of the device's built-in classes
const OZ_CLASS_HASH = '0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564';
const PUBLIC_KEY = '0x75b8797ee6603cbd9585b6f4b30dea9b362642489ce3e3d578ee36223d7a7e4';
const SN_MAIN = '0x534e5f4d41494e';

const felt = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0');

const attachDevice = (method: IStarknetMethod, typedCall: jest.Mock) => {
  const commands = { typedCall };
  method.device = {
    commands,
    getCommands: () => commands,
    toMessageObject: () => ({}),
  } as unknown as Device;
  method.postMessage = jest.fn();
};

const createSignMethod = (payload: Record<string, unknown>) =>
  new StarknetSignTransaction({
    id: 1,
    payload: {
      method: 'starknetSignTransaction',
      path: PATH,
      chainId: SN_MAIN,
      nonce: '0x0',
      resourceBounds: {
        l1Gas: { maxAmount: '0x0', maxPricePerUnit: '0x0' },
        l2Gas: { maxAmount: '0x1c9c380', maxPricePerUnit: '0x5af3107a4000' },
        l1DataGas: { maxAmount: 1024, maxPricePerUnit: '0x2540be400' },
      },
      ...payload,
    },
  });

const signedTx = {
  type: 'StarknetSignedTx',
  message: { transaction_hash: 'AB'.repeat(32), signature: 'cd'.repeat(64) },
};

describe('StarknetGetPublicKey', () => {
  test('defaults to a displayed STARK key and returns 0x hex', async () => {
    const method = new StarknetGetPublicKey({
      id: 1,
      payload: { method: 'starknetGetPublicKey', path: PATH },
    });
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'StarknetPublicKey',
      message: { public_key: '07'.repeat(32) },
    });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ path: PATH, pub: `0x${'07'.repeat(32)}` });
    expect(typedCall).toHaveBeenCalledWith('StarknetGetPublicKey', 'StarknetPublicKey', {
      address_n: ADDRESS_N,
      show_display: true,
      type: StarknetPublicKeyType.STARK,
    });
  });

  test('asks the device once per bundle entry', async () => {
    const method = new StarknetGetPublicKey({
      id: 1,
      payload: {
        method: 'starknetGetPublicKey',
        bundle: [
          { path: PATH, showOnOneKey: false },
          {
            path: "m/44'/9004'/0'/0/1",
            showOnOneKey: false,
            publicKeyType: StarknetPublicKeyType.SECP256K1,
          },
        ],
      },
    });
    method.init();
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'StarknetPublicKey', message: { public_key: '01' } })
      .mockResolvedValueOnce({ type: 'StarknetPublicKey', message: { public_key: '02' } });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual([
      { path: PATH, pub: '0x01' },
      { path: "m/44'/9004'/0'/0/1", pub: '0x02' },
    ]);
    expect(typedCall.mock.calls[1][2].type).toBe(StarknetPublicKeyType.SECP256K1);
  });

  test('rejects an unknown key type', () => {
    const method = new StarknetGetPublicKey({
      id: 1,
      payload: { method: 'starknetGetPublicKey', path: PATH, publicKeyType: 7 },
    });
    expect(() => method.init()).toThrow('Invalid publicKeyType');
  });
});

describe('StarknetGetAddress', () => {
  test('sends fixed-width felts and returns the device address', async () => {
    const method = new StarknetGetAddress({
      id: 1,
      payload: {
        method: 'starknetGetAddress',
        path: PATH,
        showOnOneKey: false,
        classHash: OZ_CLASS_HASH,
        contractAddressSalt: PUBLIC_KEY,
        constructorCalldata: [PUBLIC_KEY],
      },
    });
    method.init();
    const address = `0x00f1ae5f5976da6f374a5cc06c77bf9c9f7341e02be6913889fccc382bf09673`;
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'StarknetAddress', message: { address } });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ path: PATH, address });
    expect(typedCall).toHaveBeenCalledWith('StarknetGetAddress', 'StarknetAddress', {
      address_n: ADDRESS_N,
      show_display: false,
      public_key_type: StarknetPublicKeyType.STARK,
      class_hash: felt(OZ_CLASS_HASH),
      contract_address_salt: felt(PUBLIC_KEY),
      constructor_calldata: [felt(PUBLIC_KEY)],
    });
  });

  test.each([
    ['a non-hex felt', { classHash: 'not-hex' }, 'classHash must be a hex string'],
    ['an empty felt', { contractAddressSalt: '0x' }, 'contractAddressSalt is empty'],
    ['a felt over 32 bytes', { classHash: `0x1${'0'.repeat(64)}` }, 'classHash exceeds 32 bytes'],
  ])('rejects %s', (_label, overrides, message) => {
    const method = new StarknetGetAddress({
      id: 1,
      payload: {
        method: 'starknetGetAddress',
        path: PATH,
        classHash: OZ_CLASS_HASH,
        contractAddressSalt: PUBLIC_KEY,
        constructorCalldata: [PUBLIC_KEY],
        ...overrides,
      },
    });
    expect(() => method.init()).toThrow(message);
  });
});

describe('StarknetSignTransaction', () => {
  test('streams invoke calldata in the slices the device asks for', async () => {
    const calldata = Array.from({ length: 40 }, (_, i) => `0x${i.toString(16)}`);
    const method = createSignMethod({
      invokeV3: { senderAddress: '0x123', calldata },
    });
    method.init();

    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'StarknetCalldataRequest', message: { offset: 0, count: 32 } })
      .mockResolvedValueOnce({ type: 'StarknetCalldataRequest', message: { offset: 32, count: 8 } })
      .mockResolvedValueOnce(signedTx);
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({
      transactionHash: `0x${'ab'.repeat(32)}`,
      signature: `0x${'cd'.repeat(64)}`,
    });

    expect(typedCall.mock.calls[0]).toEqual([
      'StarknetSignTx',
      ['StarknetSignedTx', 'StarknetCalldataRequest'],
      {
        address_n: ADDRESS_N,
        public_key_type: StarknetPublicKeyType.STARK,
        version: 3,
        chain_id: felt(SN_MAIN),
        nonce: felt('0'),
        resource_bounds: {
          l1_gas: { max_amount: '0', max_price_per_unit: '0'.repeat(32) },
          l2_gas: {
            max_amount: '30000000',
            max_price_per_unit: '5af3107a4000'.padStart(32, '0'),
          },
          l1_data_gas: {
            max_amount: '1024',
            max_price_per_unit: '2540be400'.padStart(32, '0'),
          },
        },
        tip: '0',
        paymaster_data: [],
        nonce_data_availability_mode: StarknetDAMode.STARKNET_DA_MODE_L1,
        fee_data_availability_mode: StarknetDAMode.STARKNET_DA_MODE_L1,
        invoke_v3: {
          sender_address: felt('0x123'),
          calldata_count: 40,
          account_deployment_data: [],
          proof_facts: [],
        },
      },
    ]);
    expect(typedCall.mock.calls[1]).toEqual([
      'StarknetCalldataAck',
      ['StarknetSignedTx', 'StarknetCalldataRequest'],
      { calldata: calldata.slice(0, 32).map(felt) },
    ]);
    expect(typedCall.mock.calls[2][2]).toEqual({ calldata: calldata.slice(32).map(felt) });
    expect(typedCall).toHaveBeenCalledTimes(3);
  });

  test('passes privacy fields through for a proven transaction', () => {
    const method = createSignMethod({
      privacyViewingKeyDerivation:
        StarknetPrivacyViewingKeyDerivation.STARKNET_PRIVACY_VIEWING_KEY_DERIVATION_ACCOUNT_LEAF_V1,
      invokeV3: { senderAddress: '0x123', calldata: ['0x1'], proofFacts: ['0xaa', '0xbb'] },
    });
    method.init();

    expect(method.params.privacy_viewing_key_derivation_version).toBe(
      StarknetPrivacyViewingKeyDerivation.STARKNET_PRIVACY_VIEWING_KEY_DERIVATION_ACCOUNT_LEAF_V1
    );
    expect(method.params.invoke_v3?.proof_facts).toEqual([felt('0xaa'), felt('0xbb')]);
  });

  test('signs a deploy account transaction without calldata requests', async () => {
    const method = createSignMethod({
      deployAccountV3: {
        classHash: OZ_CLASS_HASH,
        contractAddressSalt: PUBLIC_KEY,
        constructorCalldata: [PUBLIC_KEY],
        expectedContractAddress: '0xf1ae5f',
      },
    });
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce(signedTx);
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({
      transactionHash: `0x${'ab'.repeat(32)}`,
      signature: `0x${'cd'.repeat(64)}`,
    });
    expect(typedCall.mock.calls[0][2].deploy_account_v3).toEqual({
      class_hash: felt(OZ_CLASS_HASH),
      contract_address_salt: felt(PUBLIC_KEY),
      constructor_calldata: [felt(PUBLIC_KEY)],
      expected_contract_address: felt('0xf1ae5f'),
    });
    expect(typedCall.mock.calls[0][2].invoke_v3).toBeUndefined();
  });

  test.each([
    ['neither transaction type', {}],
    [
      'both transaction types',
      {
        invokeV3: { senderAddress: '0x1', calldata: ['0x1'] },
        deployAccountV3: { classHash: '0x1', contractAddressSalt: '0x1', constructorCalldata: [] },
      },
    ],
  ])('rejects %s', (_label, payload) => {
    expect(() => createSignMethod(payload).init()).toThrow(
      'Exactly one of invokeV3 or deployAccountV3 is required'
    );
  });

  test.each([
    [
      'a max amount above uint64',
      { l1Gas: { maxAmount: '18446744073709551616', maxPricePerUnit: '0x0' } },
      'resourceBounds.l1Gas.maxAmount exceeds uint64',
    ],
    [
      'a negative max amount',
      { l1Gas: { maxAmount: -1, maxPricePerUnit: '0x0' } },
      'resourceBounds.l1Gas.maxAmount must be an unsigned integer',
    ],
    [
      'a price above u128',
      { l1Gas: { maxAmount: 0, maxPricePerUnit: `0x1${'0'.repeat(32)}` } },
      'resourceBounds.l1Gas.maxPricePerUnit exceeds 16 bytes',
    ],
  ])('rejects %s', (_label, bounds, message) => {
    const method = createSignMethod({
      resourceBounds: {
        l1Gas: { maxAmount: 0, maxPricePerUnit: '0x0' },
        l2Gas: { maxAmount: 0, maxPricePerUnit: '0x0' },
        l1DataGas: { maxAmount: 0, maxPricePerUnit: '0x0' },
        ...bounds,
      },
      invokeV3: { senderAddress: '0x1', calldata: ['0x1'] },
    });
    expect(() => method.init()).toThrow(message);
  });

  test('keeps a uint64 above 2^53 exact', () => {
    const method = createSignMethod({
      tip: '0xffffffffffffffff',
      invokeV3: { senderAddress: '0x1', calldata: ['0x1'] },
    });
    method.init();
    expect(method.params.tip).toBe('18446744073709551615');
  });

  test.each([
    ['out of order', { offset: 1, count: 1 }],
    ['past the end', { offset: 0, count: 3 }],
    ['empty', { offset: 0, count: 0 }],
  ])('rejects a device calldata request %s', async (_label, message) => {
    const method = createSignMethod({
      invokeV3: { senderAddress: '0x1', calldata: ['0x1', '0x2'] },
    });
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({ type: 'StarknetCalldataRequest', message });
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow('calldata felts at offset');
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('rejects a signature returned before the whole calldata was sent', async () => {
    const method = createSignMethod({
      invokeV3: { senderAddress: '0x1', calldata: ['0x1', '0x2'] },
    });
    method.init();
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'StarknetCalldataRequest', message: { offset: 0, count: 1 } })
      .mockResolvedValueOnce(signedTx);
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow('device signed before receiving the whole calldata');
  });
});

describe('StarknetExportPrivacyViewingKey', () => {
  test('defaults to the account-leaf v1 derivation and returns 0x hex', async () => {
    const method = new StarknetExportPrivacyViewingKey({
      id: 1,
      payload: {
        method: 'starknetExportPrivacyViewingKey',
        path: PATH,
        chainId: SN_MAIN,
        accountAddress: '0x123',
        poolAddress: '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a',
      },
    });
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'StarknetPrivacyViewingKey',
      message: { viewing_key: '0e'.repeat(32) },
    });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ viewingKey: `0x${'0e'.repeat(32)}` });
    expect(typedCall.mock.calls[0][2]).toEqual({
      address_n: ADDRESS_N,
      public_key_type: StarknetPublicKeyType.STARK,
      chain_id: felt(SN_MAIN),
      account_address: felt('0x123'),
      pool_address: felt('0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a'),
      derivation_version:
        StarknetPrivacyViewingKeyDerivation.STARKNET_PRIVACY_VIEWING_KEY_DERIVATION_ACCOUNT_LEAF_V1,
    });
  });
});

describe('Starknet log blocking', () => {
  test.each(['starknetSignTransaction', 'starknetExportPrivacyViewingKey'])(
    'keeps %s payloads out of SDK logs',
    method => {
      expect(getLogBlockLabel({ payload: { method } })).toBe(method);
    }
  );
});
