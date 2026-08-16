const { mergeProtobufSchemas } = require('../src/serialization/protobuf/schema-extension');

describe('protobuf schema extensions', () => {
  const productionSchema = {
    nested: {
      MessageType: { values: { MessageType_Ping: 1 } },
      Ping: { fields: { message: { type: 'string', id: 1 } } },
    },
  };

  test('merges additional messages without mutating production input', () => {
    const merged = mergeProtobufSchemas(productionSchema, [
      {
        nested: {
          MessageType: { values: { MessageType_DebugLinkDecision: 100 } },
          DebugLinkDecision: { fields: { yes_no: { type: 'bool', id: 1 } } },
        },
      },
    ]);

    expect(merged.nested.MessageType.values).toEqual({
      MessageType_Ping: 1,
      MessageType_DebugLinkDecision: 100,
    });
    expect(productionSchema.nested.MessageType.values).toEqual({ MessageType_Ping: 1 });
  });

  test('rejects an extension that replaces a production message ID', () => {
    expect(() =>
      mergeProtobufSchemas(productionSchema, [
        { nested: { MessageType: { values: { MessageType_Ping: 99 } } } },
      ])
    ).toThrow('nested.MessageType.values.MessageType_Ping');
  });
});
