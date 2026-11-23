// Run after yarn --cwd packages/hd-transport build, with --disallow-code-generation-from-strings.
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const { readFileSync } = require('fs');
const { build } = require('tsup');

const { default: transport } = require('../dist');
const v1 = require('../../core/src/data/messages/messages.json');
const legacy = require('../../core/src/data/messages/messages_legacy_v1.json');
const v2 = require('../messages-protocol-v2.json');
const protocolInfo = require('../src/serialization/protobuf/legacy-protocol-info.json');

const distJsSource = readFileSync(path.resolve(__dirname, '../dist/index.js'), 'utf8');
assert.strictEqual(
  /require\(['"]@bufbuild\/protobuf/.test(distJsSource),
  false,
  'dist/index.js must inline @bufbuild/protobuf without external subpath requires'
);
const distDtsSource = readFileSync(path.resolve(__dirname, '../dist/index.d.ts'), 'utf8');
assert.strictEqual(
  distDtsSource.includes('@bufbuild/protobuf'),
  false,
  'dist/index.d.ts must not expose @bufbuild/protobuf types'
);

const schemas = [v1, legacy, v2, protocolInfo];

let count = 0;
for (const schema of schemas) {
  const root = transport.parseTransportConfigure(schema);
  for (const type of root.listTypes()) {
    const encoded = transport.encodeProtobuf(type, {});
    const decoded = transport.decodeProtobuf(type, encoded);
    assert.strictEqual(typeof decoded, 'object');
    count += 1;
  }
}
console.log(`CSP @bufbuild/protobuf: ${count} message round-trips, zero dynamic codegen`);

async function checkBrowserBundle() {
  const outDir = path.resolve(__dirname, '../../../node_modules/.cache/protobuf-static/browser');
  await build({
    entry: { browser: path.resolve(__dirname, '../dist/index.js') },
    outDir,
    format: ['iife'],
    globalName: 'transport',
    platform: 'browser',
    noExternal: [/.*/],
    splitting: false,
    sourcemap: false,
    dts: false,
    clean: true,
    silent: true,
  });

  const bundleSource = readFileSync(path.join(outDir, 'browser.global.js'), 'utf8');
  assert.strictEqual(
    bundleSource.includes('protobufjs'),
    false,
    'Browser bundle must not include protobufjs'
  );

  for (const includeTextGlobals of [true, false]) {
    const context = vm.createContext(
      {
        console,
        Uint8Array,
        Int8Array,
        Uint16Array,
        Int16Array,
        Uint32Array,
        Int32Array,
        Float32Array,
        Float64Array,
        DataView,
        ArrayBuffer,
        BigInt,
        ...(includeTextGlobals ? { TextEncoder, TextDecoder } : {}),
        setTimeout,
        clearTimeout,
      },
      { codeGeneration: { strings: false, wasm: false } }
    );
    context.globalThis = context;
    context.self = context;
    context.window = context;

    vm.runInContext(bundleSource, context, { filename: 'browser.global.js' });
    const browserTransport = context.transport.default;

    const v1Root = browserTransport.parseTransportConfigure(v1);
    const v2Root = browserTransport.parseTransportConfigure(v2);

    const v1Envelope = browserTransport.ProtocolV1.encodeEnvelope(v1Root, 'Ping', {
      message: '\ufeffcsp-v1-🚀中文',
    });
    const v1Decoded = browserTransport.ProtocolV1.decodeMessage(v1Root, v1Envelope.toString('hex'));
    assert.strictEqual(v1Decoded.type, 'Ping');
    assert.strictEqual(v1Decoded.message.message, '\ufeffcsp-v1-🚀中文');

    const v2Frame = browserTransport.ProtocolV2.encodeFrame(
      { protocolV1: v1Root, protocolV2: v2Root },
      'Ping',
      { message: '\ufeffcsp-v2-🚀中文' },
      { seq: 1 }
    );
    const v2Decoded = browserTransport.ProtocolV2.decodeFrame(
      { protocolV1: v1Root, protocolV2: v2Root },
      v2Frame
    );
    assert.strictEqual(v2Decoded.type, 'Ping');
    assert.strictEqual(v2Decoded.message.message, '\ufeffcsp-v2-🚀中文');
  }

  console.log(
    `CSP browser IIFE bundle (${(bundleSource.length / 1024).toFixed(
      1
    )} KB): zero protobufjs, V1/V2 round-trip passed (with & without TextEncoder/TextDecoder)`
  );
}

checkBrowserBundle().catch(error => {
  console.error(error);
  process.exit(1);
});
