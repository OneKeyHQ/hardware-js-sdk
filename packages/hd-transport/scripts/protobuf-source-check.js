const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../../..');
const [
  v1Source = path.join(root, 'submodules/firmware/common/protob'),
  v2Source = path.join(root, 'submodules/firmware-pro2/sys/protobuf/onekey_protocol'),
] = process.argv.slice(2);
assert(
  fs.existsSync(v1Source),
  'V1 protobuf source is missing; provide its directory as the first argument'
);
assert(
  fs.existsSync(path.join(v2Source, 'latest')),
  'Pro2 protobuf source is missing; provide onekey_protocol as the second argument'
);

const cache = path.join(root, 'node_modules/.cache/protobuf-source-check');
fs.mkdirSync(cache, { recursive: true });
const scratch = fs.mkdtempSync(path.join(cache, 'run-'));
const target = path.join(scratch, 'sdk');
const transport = path.join(target, 'packages/hd-transport');
fs.mkdirSync(path.join(transport, 'src/types'), { recursive: true });
fs.mkdirSync(path.join(transport, 'src/serialization/protobuf'), { recursive: true });
fs.mkdirSync(path.join(target, 'packages/core/src/data/messages'), { recursive: true });
fs.cpSync(__dirname, path.join(transport, 'scripts'), { recursive: true });
fs.cpSync(
  path.join(root, 'packages/core/src/data/messages'),
  path.join(target, 'packages/core/src/data/messages'),
  { recursive: true }
);
for (const file of [
  'package.json',
  'packages/hd-transport/package.json',
  'packages/hd-transport/src/serialization/protobuf/legacy-protocol-info.json',
])
  fs.copyFileSync(path.join(root, file), path.join(target, file));
const internal = 'packages/hd-test-api/proto';
if (fs.existsSync(path.join(root, internal)))
  fs.cpSync(path.join(root, internal), path.join(target, internal), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(target, 'node_modules'), 'dir');
const log = fs.openSync(path.join(scratch, 'generation.log'), 'w');
let generated;
try {
  generated = spawnSync(
    'yarn',
    ['--cwd', transport, 'update:protobuf', path.resolve(v1Source), '.', 'typescript'],
    {
      cwd: target,
      env: { ...process.env, PROTOBUF_FIRMWARE_PRO2_DIR: path.resolve(v2Source) },
      stdio: ['ignore', log, log],
    }
  );
} finally {
  fs.closeSync(log);
}
assert.strictEqual(generated.status, 0, `Source generation failed; see ${scratch}/generation.log`);
const files = [
  'packages/core/src/data/messages/messages.json',
  'packages/core/src/data/messages/messages-protocol-v2.json',
  'packages/hd-transport/messages.json',
  'packages/hd-transport/messages-protocol-v2.json',
  'packages/hd-transport/src/types/messages.ts',
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rows = files.map(file => {
  const actual = fs.readFileSync(path.join(target, file));
  const expectedFile =
    file === 'packages/hd-transport/messages.json' && !fs.existsSync(path.join(root, file))
      ? 'packages/core/src/data/messages/messages.json'
      : file;
  const expected = fs.readFileSync(path.join(root, expectedFile));
  return {
    file,
    equal: actual.equals(expected),
    expectedHash: hash(expected),
    generatedHash: hash(actual),
  };
});
fs.writeFileSync(
  path.join(scratch, 'report.json'),
  `${JSON.stringify({ v1Source, v2Source, files: rows }, null, 2)}\n`
);
rows.forEach(row => console.log(`${row.equal ? 'PASS' : 'FAIL'} ${row.file}`));
console.log(`Source reproduction report: ${scratch}/report.json`);
if (rows.some(row => !row.equal)) process.exitCode = 1;
