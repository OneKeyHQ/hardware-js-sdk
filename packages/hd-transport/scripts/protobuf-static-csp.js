// Run after lerna run build, with --disallow-code-generation-from-strings.
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const { readFileSync } = require('fs');
const { build } = require('tsup');
const protobuf = require('protobufjs/light');
const { default: transport } = require('../dist');

const v1 = require('../../core/src/data/messages/messages.json');
const legacy = require('../../core/src/data/messages/messages_legacy_v1.json');
const v2 = require('../messages-protocol-v2.json');

const schemas = [v1, legacy, v2];
function collectTypes(namespace) {
  return [
    ...(namespace instanceof protobuf.Type ? [namespace] : []),
    ...(namespace.nestedArray || []).flatMap(collectTypes),
  ];
}
let blocked = 0;
const dynamic = () => {
  blocked += 1;
  throw new Error('Unexpected dynamic protobuf setup');
};
protobuf.Type.prototype.setup = dynamic;
protobuf.Type.generateConstructor = dynamic;
let count = 0;
for (const schema of schemas) {
  const root = transport.parseConfigure(schema);
  for (const type of collectTypes(root)) {
    // Missing required fields can throw; no constructor or codec may fall back to codegen.
    for (const operation of [
      () => type.fromObject({}),
      () => type.encode(type.create()).finish(),
      () => type.decode(new Uint8Array()),
      () => type.verify({}),
      () => type.toObject(type.create()),
    ]) {
      try {
        operation();
      } catch (error) {
        if (error instanceof EvalError) throw error;
      }
      count += 1;
    }
  }
}
assert.strictEqual(blocked, 0);
console.log(`CSP static protobuf: ${count} operations, no dynamic setup`);

async function checkBrowser() {
  const outDir = path.resolve(__dirname, '../../../node_modules/.cache/protobuf-static/browser');
  await build({
    entry: { browser: path.resolve(__dirname, '../dist/index.js') },
    outDir,
    format: ['iife'],
    globalName: 'transport',
    platform: 'browser',
    noExternal: [/.*/],
    splitting: false,
    silent: true,
    config: false,
  });
  const code = readFileSync(path.join(outDir, 'browser.global.js'), 'utf8');
  const context = vm.createContext(
    { schemas },
    { codeGeneration: { strings: false, wasm: false } }
  );
  vm.runInContext(code, context);
  const operations = vm.runInContext(
    `
      let count = 0;
      function visit(namespace) {
        if (namespace.fields) {
          if (!Object.hasOwn(namespace, 'encode')) throw Error('Missing static codec');
          for (const operation of [
            () => namespace.fromObject({}),
            () => namespace.encode(namespace.create()).finish(),
            () => namespace.decode(new Uint8Array()),
            () => namespace.verify({}),
            () => namespace.toObject(namespace.create())
          ]) {
            try { operation(); } catch (error) {
              if (error instanceof EvalError) throw error;
            }
            count += 1;
          }
        }
        for (const child of namespace.nestedArray || []) visit(child);
      }
      for (const schema of schemas) visit(transport.default.parseConfigure(schema));
      count;
    `,
    context
  );
  assert.strictEqual(operations, count);
  console.log(`Browser CSP: ${operations} operations, ${code.length} bytes before minification`);
}
checkBrowser().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
