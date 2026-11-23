import transport from '@onekeyfe/hd-transport';

import StarknetSignTransaction from '../src/api/starknet/StarknetSignTransaction';
import messagesJson from '../src/data/messages/messages-protocol-v2.json';

import type * as protobuf from 'protobufjs/light';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// Encodes what the SDK methods build through the real protobuf encoder and the
// shipped protocol V2 schema, so field types, enums and wire ids are pinned.
const {
  createMessageFromName,
  decodeProtobuf: decode,
  encodeProtobuf: encode,
  parseConfigure,
} = transport;
const messages = parseConfigure(messagesJson as protobuf.INamespace);

const roundTrip = (name: string, data: Record<string, unknown>) => {
  const { Message } = createMessageFromName(messages, name);
  return decode(Message, encode(Message, data));
};

const buildSignParams = (payload: Record<string, unknown>) => {
  const method = new StarknetSignTransaction({
    id: 1,
    payload: {
      method: 'starknetSignTransaction',
      path: "m/44'/9004'/0'/0/0",
      chainId: '0x534e5f4d41494e',
      nonce: '0x1',
      resourceBounds: {
        l1Gas: { maxAmount: '0x0', maxPricePerUnit: '0x0' },
        l2Gas: { maxAmount: '0x1c9c380', maxPricePerUnit: '0x5af3107a4000' },
        l1DataGas: { maxAmount: '0x400', maxPricePerUnit: '0x2540be400' },
      },
      ...payload,
    },
  });
  method.init();
  return method.params;
};

describe('Starknet protobuf messages (protocol V2)', () => {
  test.each([
    ['StarknetGetPublicKey', 12500],
    ['StarknetPublicKey', 12501],
    ['StarknetSignTx', 12502],
    ['StarknetSignedTx', 12503],
    ['StarknetExportPrivacyViewingKey', 12504],
    ['StarknetPrivacyViewingKey', 12505],
    ['StarknetGetAddress', 12506],
    ['StarknetAddress', 12507],
    ['StarknetCalldataRequest', 12508],
    ['StarknetCalldataAck', 12509],
  ])('%s has wire type %d', (name, typeId) => {
    expect(createMessageFromName(messages, name).messageTypeId).toBe(typeId);
  });

  test('an invoke built by the SDK encodes and decodes unchanged', () => {
    const params = buildSignParams({
      tip: '0xffffffffffffffff',
      invokeV3: { senderAddress: '0x123', calldata: ['0x1', '0x2'], proofFacts: ['0xaa'] },
    });
    const decoded = roundTrip('StarknetSignTx', params as unknown as Record<string, unknown>);

    expect(decoded.chain_id).toBe(params.chain_id);
    expect(decoded.nonce).toBe(params.nonce);
    expect(String(decoded.tip)).toBe('18446744073709551615');
    expect(String(decoded.resource_bounds.l2_gas.max_amount)).toBe('30000000');
    expect(decoded.resource_bounds.l2_gas.max_price_per_unit).toBe(
      params.resource_bounds.l2_gas.max_price_per_unit
    );
    expect(decoded.invoke_v3).toEqual({
      sender_address: params.invoke_v3?.sender_address,
      calldata_count: 2,
      account_deployment_data: [],
      proof_facts: params.invoke_v3?.proof_facts,
    });
  });

  test('a zero felt still goes out as a non-empty byte string', () => {
    const params = buildSignParams({
      nonce: '0x0',
      invokeV3: { senderAddress: '0x1', calldata: ['0x0'] },
    });
    const decoded = roundTrip('StarknetSignTx', params as unknown as Record<string, unknown>);
    expect(decoded.nonce).toBe('00'.repeat(32));
  });

  test('a calldata ack carries the felts as bytes', () => {
    const calldata = [`${'00'.repeat(31)}01`, 'ff'.repeat(32)];
    expect(roundTrip('StarknetCalldataAck', { calldata })).toEqual({ calldata });
  });
});
