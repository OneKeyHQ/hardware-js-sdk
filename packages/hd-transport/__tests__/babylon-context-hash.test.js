const { parseConfigure, createMessageFromName } = require('../src/serialization/protobuf/messages');
const { encode } = require('../src/serialization/protobuf/encode');
const { decode } = require('../src/serialization/protobuf/decode');
const schema = require('../../core/src/data/messages/messages.json');

describe('Babylon Protocol V1 wire contract', () => {
  const root = parseConfigure(schema);

  test.each([
    ['BITCOIN_MAINNET', 0],
    ['BITCOIN_TESTNET', 1],
    ['BITCOIN_SIGNET', 2],
    ['BITCOIN_REGTEST', 3],
  ])('encodes %s as wire value %i', (network, networkId) => {
    const { Message, messageTypeId } = createMessageFromName(root, 'BabylonDeriveContextHash');
    const encoded = encode(Message, {
      address_n: [2147483732, 2147483648, 2147483648, 0, 0],
      script_type: 'SPENDWITNESS',
      app_name: '746573742d617070',
      context: 'deadbeef',
      network,
    });
    const decoded = Message.decode(new Uint8Array(encoded.toBuffer()));
    expect(messageTypeId).toBe(10054);
    expect(decoded.network).toBe(networkId);
    expect(Buffer.from(decoded.app_name).toString('ascii')).toBe('test-app');
    expect(Buffer.from(decoded.context).toString('hex')).toBe('deadbeef');
    expect(Message.fieldsArray.map(field => [field.name, field.id])).toEqual([
      ['address_n', 1],
      ['script_type', 2],
      ['app_name', 3],
      ['context', 4],
      ['network', 5],
    ]);
  });

  test('decodes the 32-byte response', () => {
    const { Message, messageTypeId } = createMessageFromName(root, 'BabylonDerivedContextHash');
    const response = { secret: '00'.repeat(32) };
    expect(messageTypeId).toBe(10055);
    expect(Message.fields.secret.id).toBe(1);
    expect(decode(Message, encode(Message, response))).toEqual(response);
  });
});
