'use strict';
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const pin = require('../helper/pin.cjs');

function fixture(t, substituteSDK = false) {
  const root = fs.mkdtempSync(path.join(__dirname, '.pin-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (name, value) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  };
  put('package.json', '{}');
  put('yarn.lock', 'synthetic-lock');
  put('tsconfig.json', '{"compilerOptions":{"allowJs":true}}');
  put('build/rollup.config.js', 'module.exports = {};');
  const sources = ['package.json', 'yarn.lock', 'tsconfig.json', 'build/rollup.config.js',
    'packages/hd-common-connect-sdk/package.json', 'packages/hd-transport-usb/package.json'];
  const git = mock.method(childProcess, 'execFileSync', (command, args) => {
    assert.equal(command, 'git');
    if (args[0] === 'diff') {
      assert.deepEqual(args, ['diff', '--quiet', pin.SDK_SOURCE, '--', '.', ':(exclude)plugins/electrum']);
      return '';
    }
    assert.deepEqual(args, ['ls-tree', '-r', '--name-only', pin.SDK_SOURCE]);
    return sources.join('\n');
  });
  t.after(() => git.mock.restore());
  const runtime = path.join(root, 'plugins/electrum/.runtime');
  for (const name of pin.HELPERS) put(`plugins/electrum/.runtime/${name}`, fs.readFileSync(path.join(__dirname, '../helper', name)));
  put('packages/hd-common-connect-sdk/package.json', JSON.stringify({ name: '@onekeyfe/hd-common-connect-sdk',
    version: pin.SDK_VERSION, main: 'dist/index.js', dependencies: { 'synthetic-dependency': '1.0.0', 'synthetic-types': '1.0.0' } }));
  put('packages/hd-common-connect-sdk/dist/index.js',
    `require('node:fs').writeFileSync(${JSON.stringify(path.join(root, 'imported'))}, 'yes'); module.exports = {default: {init() {throw Error('no hardware init');}}};`);
  put('packages/hd-transport-usb/package.json', JSON.stringify({ name: '@onekeyfe/hd-transport-usb',
    version: pin.SDK_VERSION, main: 'dist/index.js' }));
  put('packages/hd-transport-usb/dist/index.js', 'module.exports = class Usb {};');
  put('node_modules/synthetic-dependency/prebuilds/synthetic.node', 'synthetic-native-addon-bytes');
  put('node_modules/synthetic-dependency/package.json', JSON.stringify({ name: 'synthetic-dependency', version: '1.0.0', main: 'index.js' }));
  put('node_modules/synthetic-dependency/index.js', 'module.exports = 1;');
  put('node_modules/synthetic-types/package.json', '{"name":"synthetic-types","types":"index.d.ts"}');
  put('node_modules/synthetic-types/index.d.ts', 'export type Synthetic = string;');
  fs.mkdirSync(path.join(root, 'node_modules/@onekeyfe'), { recursive: true });
  for (const name of ['hd-common-connect-sdk', 'hd-transport-usb']) {
    if (substituteSDK && name === 'hd-common-connect-sdk') {
      put(`node_modules/@onekeyfe/${name}/package.json`, JSON.stringify({ name: `@onekeyfe/${name}`,
        version: pin.SDK_VERSION, main: 'index.js' }));
      put(`node_modules/@onekeyfe/${name}/index.js`, 'module.exports = {};');
      continue;
    }
    fs.symlinkSync(path.join(root, 'packages', name), path.join(root, 'node_modules/@onekeyfe', name), 'junction');
  }
  const data = pin.capture(root, runtime);
  const manifest = path.join(runtime, 'runtime.json');
  const receipt = JSON.stringify(data);
  fs.writeFileSync(manifest, receipt);
  const digest = pin.digest(receipt);
  return { root, runtime, put, data, manifest, digest, sources };
}
function verify(f) { return pin.verifyRuntime(f.manifest, f.digest, f.root); }
function rewrite(f, mutate) {
  const data = JSON.parse(fs.readFileSync(f.manifest, 'utf8'));
  mutate(data);
  const receipt = JSON.stringify(data);
  fs.writeFileSync(f.manifest, receipt);
  f.digest = pin.digest(receipt);
}

test('receipt captures effective source/config inputs, dependency graph and native assets', t => {
  const f = fixture(t);
  assert.deepEqual(verify(f), f.data);
  assert.equal(f.data.entries['@onekeyfe/hd-common-connect-sdk'], 'packages/hd-common-connect-sdk/dist/index.js');
  assert.equal(f.data.inputs['tsconfig.json'], pin.hash(path.join(f.root, 'tsconfig.json')));
  assert.equal(f.data.inputs['build/rollup.config.js'], pin.hash(path.join(f.root, 'build/rollup.config.js')));
  assert.equal(typeof f.data.artifacts['node_modules/synthetic-dependency/index.js'], 'string');
  assert.equal(typeof f.data.artifacts['node_modules/synthetic-types/index.d.ts'], 'string');
  assert.equal(typeof f.data.artifacts['node_modules/synthetic-dependency/prebuilds/synthetic.node'], 'string');
});

test('matching version labels cannot substitute an npm SDK for the pinned workspace', t => {
  assert.throws(() => fixture(t, true));
});

test('changed SDK, JS dependency or native dependency rejects the receipt', async t => {
  for (const name of ['packages/hd-common-connect-sdk/dist/index.js', 'node_modules/synthetic-dependency/index.js',
    'node_modules/synthetic-dependency/prebuilds/synthetic.node']) {
    await t.test(name, t => {
      const f = fixture(t);
      f.put(name, 'tampered');
      assert.throws(() => verify(f));
    });
  }
});

test('added/deleted dependency artifacts and changed package resolution reject the receipt', async t => {
  for (const mode of ['added', 'deleted', 'resolution']) {
    await t.test(mode, t => {
      const f = fixture(t);
      if (mode === 'added') f.put('node_modules/synthetic-dependency/extra.js', 'module.exports=2;');
      if (mode === 'deleted') fs.unlinkSync(path.join(f.root, 'node_modules/synthetic-dependency/index.js'));
      if (mode === 'resolution') {
        f.put('node_modules/synthetic-dependency/other.js', 'module.exports=2;');
        f.put('node_modules/synthetic-dependency/package.json', '{"name":"synthetic-dependency","main":"other.js"}');
      }
      assert.throws(() => verify(f));
    });
  }
});

test('tampered manifest, Node binary/version, source tree, lock and receipt fields fail closed', async t => {
  const mutations = {
    manifest: f => fs.appendFileSync(f.manifest, ' '),
    nodeVersion: f => rewrite(f, d => { d.nodeVersion = '0.0.0'; }),
    nodeBinary: f => rewrite(f, d => { d.nodeSha256 = '0'.repeat(64); }),
    nodePath: f => rewrite(f, d => { d.node = path.join(f.root, 'wrong-node'); }),
    sourceTree: f => rewrite(f, d => { d.sourceTree = path.dirname(f.root); }),
    lockLabel: f => rewrite(f, d => { d.lockSha256 = '0'.repeat(64); }),
    lockBytes: f => f.put('yarn.lock', 'changed-lock'),
    extraField: f => rewrite(f, d => { d.unchecked = true; }),
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, t => { const f = fixture(t); mutate(f); assert.throws(() => verify(f)); });
  }
});

test('root TS/build configuration drift and untracked/ignored effective inputs reject', async t => {
  for (const name of ['tsconfig.json', 'build/rollup.config.js', 'new-root-config.json',
    'packages/new-source.ts', '.env.synthetic']) {
    await t.test(name, t => {
      const f = fixture(t);
      f.put(name, 'changed input');
      assert.throws(() => verify(f));
      if (!f.sources.includes(name)) assert.throws(() => pin.sourceSnapshot(f.root));
    });
  }
});

test('startup validates receipt before loading even the mock SDK; no real import claimed', t => {
  const f = fixture(t);
  function launch() {
    // Model only git metadata in this file fixture; Node resolves real mock package files itself.
    const driver = `const cp = require('node:child_process');
      cp.execFileSync = (cmd, args) => args[0] === 'diff' ? '' : ${JSON.stringify(f.sources.join('\n'))};
      process.argv = [process.execPath, ${JSON.stringify(path.join(f.runtime, 'entry.cjs'))},
        '--manifest', ${JSON.stringify(f.manifest)}, '--manifest-sha256', ${JSON.stringify(f.digest)}, '--smoke'];
      require(process.argv[1]);`;
    return childProcess.spawnSync(process.execPath, ['-e', driver], { encoding: 'utf8' });
  }
  const clean = launch();
  assert.equal(clean.status, 0);
  assert.equal(JSON.parse(clean.stdout).imports, true);
  assert.equal(fs.existsSync(path.join(f.root, 'imported')), true);
  fs.unlinkSync(path.join(f.root, 'imported'));
  f.put('node_modules/synthetic-dependency/index.js', 'tampered dependency');
  const bad = launch();
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, '');
  assert.equal(bad.stderr, '');
  assert.equal(fs.existsSync(path.join(f.root, 'imported')), false);
  f.put('node_modules/synthetic-dependency/index.js', 'module.exports = 1;');
  f.put('node_modules/unrecorded/package.json', '{"name":"unrecorded","main":"index.js"}');
  f.put('node_modules/unrecorded/index.js', 'module.exports = 1;');
  const common = 'packages/hd-common-connect-sdk/dist/index.js';
  f.put(common, `require('unrecorded'); require('node:fs').writeFileSync(${JSON.stringify(path.join(f.root, 'imported'))}, 'yes');`);
  const receipt = JSON.stringify(pin.capture(f.root, f.runtime));
  fs.writeFileSync(f.manifest, receipt);
  f.digest = pin.digest(receipt);
  const unrecorded = launch();
  assert.equal(unrecorded.status, 1);
  assert.equal(unrecorded.stdout, '');
  assert.equal(fs.existsSync(path.join(f.root, 'imported')), false);
});
