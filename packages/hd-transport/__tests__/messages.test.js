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

const v1Messages = require('../messages.json');
const v2Messages = require('../messages-protocol-v2.json');

describe('messages', () => {
  test('V1 GetPassphraseState includes attach-to-pin request flags', () => {
    const fields = v1Messages.nested.GetPassphraseState.fields;

    expect(fields._only_main_pin).toMatchObject({ id: 2, type: 'bool' });
    expect(fields.allow_create_attach_pin).toMatchObject({ id: 3, type: 'bool' });
  });

  test('Protocol V2 firmware targets exclude CRATE and use the firmware enum order', () => {
    expect(v2Messages.nested.DeviceFirmwareTargetType.values).toEqual({
      FW_MGMT_TARGET_INVALID: 0,
      FW_MGMT_TARGET_ROMLOADER: 1,
      FW_MGMT_TARGET_BOOTLOADER: 2,
      FW_MGMT_TARGET_APPLICATION_P1: 3,
      FW_MGMT_TARGET_APPLICATION_P2: 4,
      FW_MGMT_TARGET_COPROCESSOR: 5,
      FW_MGMT_TARGET_SE01: 6,
      FW_MGMT_TARGET_SE02: 7,
      FW_MGMT_TARGET_SE03: 8,
      FW_MGMT_TARGET_SE04: 9,
    });
  });

  test('createMessageFromName (common case)', () => {
    const messages = parseConfigure(json);
    const name = 'Initialize';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('createMessageFromType (common case)', () => {
    const messages = parseConfigure(json);
    expect(() => createMessageFromType(messages, 0)).not.toThrow();
  });

  test('createMessageFromType throws a readable error for unknown ids', () => {
    const messages = parseConfigure(json);

    expect(() => createMessageFromType(messages, 99999)).toThrow(
      'MessageType id "99999" is not defined in protobuf schema'
    );
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

  test('createMessageFromName throws when message type id is missing', () => {
    const messages = parseConfigure(json);

    expect(() => createMessageFromName(messages, 'TxAckInputWrapper')).toThrow(
      'MessageType for "TxAckInputWrapper" is not defined in protobuf schema'
    );
  });
});
