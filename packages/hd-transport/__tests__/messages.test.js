const {
  createMessageFromName,
  createMessageFromType,
  parseConfigure,
} = require('../src/serialization/protobuf/messages');
// const json = require('./data/messages.json');

const json = {
  nested: {
    Initialize: {
      fields: {
        session_id: {
          type: 'bytes',
          id: 1,
        },
        _skip_passphrase: {
          type: 'bool',
          id: 2,
          options: {
            deprecated: true,
          },
        },
        derive_cardano: {
          type: 'bool',
          id: 3,
        },
      },
    },
    TxAckInput: {
      options: {
        '(wire_type)': 22,
      },
      fields: {
        tx: {
          rule: 'required',
          type: 'TxAckInputWrapper',
          id: 1,
        },
      },
      nested: {
        TxAckInputWrapper: {
          fields: {
            input: {
              rule: 'required',
              type: 'TxInput',
              id: 2,
            },
          },
        },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 0,
      },
    },
  },
};

describe('messages', () => {
  test('createMessageFromName (common case)', () => {
    const messages = parseConfigure(json);
    const name = 'Initialize';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('createMessageFromType (common case)', () => {
    const messages = parseConfigure(json);
    expect(() => createMessageFromType(messages, 0)).not.toThrow();
  });

  test('createMessageFromName (wire_type case)', () => {
    const messages = parseConfigure(json);
    const name = 'TxAckInput';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('[compatibility]: descriptors as string', () => {
    const messages = parseConfigure(JSON.stringify(json));
    const name = 'TxAckInput';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });
});
