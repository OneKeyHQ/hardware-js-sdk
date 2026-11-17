const { parseConfigure, createMessageFromName } = require('../src/serialization/protobuf/messages');
const { encode } = require('../src/serialization/protobuf/encode');
const schema = require('../../core/src/data/messages/messages.json');

describe('Solana off-chain message Protocol V1 wire contract', () => {
  const root = parseConfigure(schema);

  test('encodes required signers as field 6', () => {
    const { Message } = createMessageFromName(root, 'SolanaSignOffChainMessage');
    const requiredSigners = ['11'.repeat(32), '22'.repeat(32)];
    const encoded = Buffer.from(
      encode(Message, {
        address_n: [0x8000002c, 0x800001f5, 0x80000000, 0x80000000],
        message: '01020304',
        message_version: 'MESSAGE_VERSION_1',
        required_signers: requiredSigners,
      }).toBuffer()
    );

    // Check the wire tag independently of the SDK schema: field 6, wire type 2.
    const expectedSignersPayload = Buffer.concat(
      requiredSigners.map(signer =>
        Buffer.concat([Buffer.from([0x32, 0x20]), Buffer.from(signer, 'hex')])
      )
    );
    expect(encoded.subarray(-expectedSignersPayload.length)).toEqual(expectedSignersPayload);

    const decoded = Message.decode(new Uint8Array(encoded));
    expect(decoded.required_signers.map(signer => Buffer.from(signer).toString('hex'))).toEqual(
      requiredSigners
    );
  });
});
