import * as protobuf from 'protobufjs/light';
import transport from '@onekeyfe/hd-transport';

import messagesJson from '../src/data/messages/messages-protocol-v2.json';

// Round-trips the Zcash messages through the SDK's real protobuf encoder and
// decoder against the shipped protocol V2 schema, pinning wire ids and defaults.
const {
  createMessageFromName,
  decodeProtobuf: decode,
  encodeProtobuf: encode,
  parseConfigure,
} = transport;
const messages = parseConfigure(messagesJson as protobuf.INamespace);

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

const roundTrip = (name: string, data: Record<string, unknown>) => {
  const { Message, messageTypeId } = createMessageFromName(messages, name);
  const encoded = encode(Message, data);
  const bytes = new Uint8Array(encoded.toBuffer());
  return { messageTypeId, ids: wireFieldIds(bytes), decoded: decode(Message, encoded) };
};

describe('Zcash protobuf messages (protocol V2)', () => {
  test.each([
    ['ZcashGetAddress', 12400],
    ['ZcashAddress', 12401],
    ['ZcashSignPczt', 12402],
    ['ZcashSignedPczt', 12403],
    ['ZcashPcztChunkRequest', 12404],
    ['ZcashPcztChunkAck', 12405],
    ['ZcashSignedPcztChunkRequest', 12406],
  ])('%s has wire type %d', (name, typeId) => {
    expect(createMessageFromName(messages, name).messageTypeId).toBe(typeId);
  });

  test.each(['ZcashSignPczt', 'ZcashSignedPczt'])('%s round trips length and bytes', name => {
    const chunk = 'ab'.repeat(1024);
    const { ids, decoded } = roundTrip(name, { pczt_length: 4096, pczt_initial_chunk: chunk });
    expect(ids).toEqual([1, 2]);
    expect(decoded).toEqual({ pczt_length: 4096, pczt_initial_chunk: chunk });
  });

  test('ZcashPcztChunkAck round trips the data chunk', () => {
    const { ids, decoded } = roundTrip('ZcashPcztChunkAck', { data_chunk: '00ff10' });
    expect(ids).toEqual([1]);
    expect(decoded).toEqual({ data_chunk: '00ff10' });
  });

  test.each(['ZcashPcztChunkRequest', 'ZcashSignedPcztChunkRequest'])(
    '%s round trips the chunk length',
    name => {
      const { ids, decoded } = roundTrip(name, { chunk_length: 1024 });
      expect(ids).toEqual([1]);
      expect(decoded).toEqual({ chunk_length: 1024 });
    }
  );

  test('ZcashGetAddress encodes every field with its schema id', () => {
    const { ids, decoded } = roundTrip('ZcashGetAddress', {
      address_n: [2147483680, 2147483781, 2147483648],
      show_display: true,
      include_seed_fingerprint: true,
      include_ufvk: true,
      diversifier_index: 0xffffffff,
      address_type: 2,
      scope: 1,
    });
    // address_n is unpacked: one tag per element.
    expect(ids).toEqual([1, 1, 1, 2, 3, 4, 5, 6, 7]);
    expect(decoded).toEqual({
      address_n: [2147483680, 2147483781, 2147483648],
      show_display: true,
      include_seed_fingerprint: true,
      include_ufvk: true,
      diversifier_index: 0xffffffff,
      address_type: 'UNIFIED_ORCHARD',
      scope: 'INTERNAL',
    });
  });

  test('ZcashGetAddress enum values match the schema', () => {
    const addressType = messages.lookupEnum('ZcashAddressType').values;
    const scope = messages.lookupEnum('ZcashAddressScope').values;
    expect(addressType).toEqual({
      UNIFIED_ORCHARD_P2PKH: 0,
      TRANSPARENT_P2PKH: 1,
      UNIFIED_ORCHARD: 2,
    });
    expect(scope).toEqual({ EXTERNAL: 0, INTERNAL: 1 });
  });

  test('ZcashGetAddress omits unset optional fields and keeps schema defaults', () => {
    const { Message } = createMessageFromName(messages, 'ZcashGetAddress');
    const { ids } = roundTrip('ZcashGetAddress', { address_n: [2147483680] });
    expect(ids).toEqual([1]);
    expect(Message.fields.diversifier_index.defaultValue).toBe(0);
    expect(Message.fields.address_type.defaultValue).toBe(0);
    expect(Message.fields.scope.defaultValue).toBe(0);
    const empty = Message.decode(new Uint8Array(0)) as unknown as Record<string, unknown>;
    expect(empty.diversifier_index).toBe(0);
    expect(empty.address_type).toBe(0);
    expect(empty.scope).toBe(0);
  });

  test('ZcashAddress decodes optional ufvk and seed fingerprint', () => {
    const fingerprint = '0f'.repeat(32);
    const full = roundTrip('ZcashAddress', {
      address: 'u1abc',
      ufvk: 'uview1abc',
      seed_fingerprint: fingerprint,
    });
    expect(full.ids).toEqual([1, 2, 3]);
    expect(full.decoded).toEqual({
      address: 'u1abc',
      ufvk: 'uview1abc',
      seed_fingerprint: fingerprint,
    });

    const minimal = roundTrip('ZcashAddress', { address: 't1abc' });
    expect(minimal.ids).toEqual([1]);
    expect(minimal.decoded).toEqual({ address: 't1abc', ufvk: null, seed_fingerprint: null });
  });

  test('required fields are enforced on decode', () => {
    const { Message } = createMessageFromName(messages, 'ZcashSignedPczt');
    expect(() => Message.decode(new Uint8Array(0))).toThrow(/missing required/);
  });
});
