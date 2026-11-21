const assert = require('assert');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

function applyProtocolV2Additions(schema) {
  const additions = protobuf
    .parse(fs.readFileSync(path.join(__dirname, 'proto/messages_v2_additions.proto'), 'utf8'), {
      keepCase: true,
    })
    .root.toJSON().nested;
  for (const [name, definition] of Object.entries(additions)) {
    const target = schema.nested[name];
    assert(target, `Missing Protocol V2 definition: ${name}`);
    for (const [key, id] of Object.entries(definition.values || {})) {
      if (Object.hasOwn(target.values, key)) assert.strictEqual(target.values[key], id, key);
      else {
        assert(
          !Object.values(target.values).includes(id),
          `Protocol V2 enum collision: ${name}.${key}`
        );
        target.values[key] = id;
      }
    }
    for (const [key, field] of Object.entries(definition.fields || {})) {
      if (Object.hasOwn(target.fields, key))
        assert.deepStrictEqual(
          target.fields[key],
          field,
          `Protocol V2 field drift: ${name}.${key}`
        );
      else {
        assert(
          !Object.values(target.fields).some(existing => existing.id === field.id),
          `Protocol V2 field collision: ${name}.${key}`
        );
        target.fields[key] = field;
      }
    }
  }
  return schema;
}

if (require.main === module) {
  const file = process.argv[2];
  const schema = applyProtocolV2Additions(JSON.parse(fs.readFileSync(file, 'utf8')));
  fs.writeFileSync(file, `${JSON.stringify(schema, null, 2)}\n`);
}

module.exports = { applyProtocolV2Additions };
