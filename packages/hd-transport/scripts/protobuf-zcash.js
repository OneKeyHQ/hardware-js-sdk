const assert = require('assert');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

// Wire IDs come from firmware-pro2 01bf80cbe70c58bd0a91a4a504c7c730ef972892,
// sys/protobuf/onekey_protocol/legacy/messages.proto, matching the existing SDK schema.
const wireIds = require('./proto/zcash-wire-ids.json');

function applyZcashWireIds(schema) {
  const source = protobuf
    .parse(fs.readFileSync(path.join(__dirname, 'proto/messages_zcash.proto'), 'utf8'), {
      keepCase: true,
    })
    .root.lookup('hw.onekey.messages.zcash')
    .toJSON();
  for (const [name, definition] of Object.entries(source.nested)) {
    assert.deepStrictEqual(
      schema.nested[name],
      definition,
      `Zcash firmware contract drift: ${name}`
    );
  }
  const { values } = schema.nested.MessageType;
  for (const [name, id] of Object.entries(wireIds)) {
    if (Object.hasOwn(values, name)) assert.strictEqual(values[name], id, name);
    else assert(!Object.values(values).includes(id), `Duplicate Zcash wire ID: ${id}`);
  }
  // Chain IDs precede system IDs in the flattened firmware schema. Preserve that order.
  const result = {};
  let inserted = false;
  for (const [name, id] of Object.entries(values)) {
    if (!inserted && id >= 60000) {
      Object.assign(result, wireIds);
      inserted = true;
    }
    result[name] = id;
  }
  if (!inserted) Object.assign(result, wireIds);
  schema.nested.MessageType.values = result;
  return schema;
}

if (require.main === module) {
  const file = process.argv[2];
  const schema = applyZcashWireIds(JSON.parse(fs.readFileSync(file, 'utf8')));
  fs.writeFileSync(file, `${JSON.stringify(schema, null, 2)}\n`);
}

module.exports = { applyZcashWireIds };
