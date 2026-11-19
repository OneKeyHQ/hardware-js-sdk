'use strict';

// This is an integrity receipt for a local source-tree build, not an installer or trust service.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const Module = require('node:module');
const { createRequire, isBuiltin } = Module;

const SDK_SOURCE = 'b62d1005e1f97319d9fa8b550a60466099727f45';
const SDK_VERSION = '1.2.10';
const NODE_VERSION = '22.21.1';
const HELPERS = ['entry.cjs', 'runtime.cjs', 'pin.cjs'];
const GENERATED = new Set(['.git', 'node_modules', 'dist', 'lib', 'libDev', 'coverage', '.cache',
  '.yarn', '__pycache__', 'submodules', '.venv', '.runtime', '.pytest_cache']);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const check = condition => { if (!condition) throw new Error('Runtime integrity check failed'); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = value => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
function inside(root, file) {
  const actual = fs.realpathSync(file);
  check(actual === root || actual.startsWith(`${root}${path.sep}`));
  return actual;
}
function files(root, directory, excluded = new Set()) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    inside(root, file);
    const stat = fs.statSync(file);
    // Package-manager links are resolved separately, never followed as arbitrary tree edges.
    check(!entry.isSymbolicLink());
    if (stat.isDirectory()) result.push(...files(root, file, excluded));
    else { check(stat.isFile()); result.push(file); }
  }
  return result;
}
function sourceSnapshot(root) {
  root = fs.realpathSync(root);
  const git = args => childProcess.execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  // Pin ALL tracked repository inputs, including root TS/bundler/package-manager configs.
  git(['diff', '--quiet', SDK_SOURCE, '--', '.', ':(exclude)plugins/electrum']);
  const tracked = new Set(git(['ls-tree', '-r', '--name-only', SDK_SOURCE]).trim().split('\n')
    .filter(p => p && !p.startsWith('plugins/electrum/') && !p.startsWith('submodules/')));
  const inventory = {};
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (GENERATED.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file).split(path.sep).join('/');
      if (relative === 'plugins/electrum') {
        // Root allowJs/type-check globs can include the adapter's JS/JSON inputs too.
        for (const input of files(root, file, GENERATED)) {
          if (/\.(?:[cm]?js|jsx|tsx?|json)$/.test(input)) {
            inventory[path.relative(root, input).split(path.sep).join('/')] = hash(input);
          }
        }
        continue;
      }
      inside(root, file);
      if (entry.isSymbolicLink()) {
        check(tracked.has(relative));
        inventory[relative] = digest(fs.readlinkSync(file));
      } else if (entry.isDirectory()) scan(file);
      else {
        // Also reject ignored additions outside known generated outputs: they can affect globs/configs.
        check(entry.isFile() && tracked.has(relative));
        inventory[relative] = hash(file);
      }
    }
  }
  scan(root);
  // Tracked generated-looking inputs still belong in the receipt.
  for (const relative of tracked) {
    const source = path.join(root, relative);
    const file = inside(root, source);
    if (fs.lstatSync(source).isSymbolicLink()) inventory[relative] = digest(fs.readlinkSync(source));
    else { check(fs.statSync(file).isFile()); inventory[relative] = hash(file); }
  }
  return sorted(inventory);
}
function artifactSnapshot(root) {
  root = fs.realpathSync(root);
  const artifacts = {};
  const visited = new Set();
  const entryRequire = createRequire(path.join(root, 'plugins/electrum/.runtime/entry.cjs'));
  const entries = {};
  function visit(name, requester, optional = false) {
    if (isBuiltin(name)) return;
    let resolved;
    try {
      // Some declared dependencies (e.g. USB's @types packages) have no JS entry point.
      try { resolved = requester.resolve(`${name}/package.json`); }
      catch (error) {
        if (!['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code)) throw error;
        resolved = requester.resolve(name);
      }
    } catch (error) { if (optional && error.code === 'MODULE_NOT_FOUND') return; throw error; }
    resolved = inside(root, resolved);
    let directory = path.dirname(resolved);
    let candidate = path.join(directory, 'package.json');
    while (!fs.existsSync(candidate) || typeof JSON.parse(fs.readFileSync(candidate, 'utf8')).name !== 'string') {
      check(directory !== root);
      directory = path.dirname(directory);
      candidate = path.join(directory, 'package.json');
    }
    directory = inside(root, directory);
    if (visited.has(directory)) return;
    visited.add(directory);
    const manifestPath = path.join(directory, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (name.startsWith('@onekeyfe/hd-')) {
      const short = name.slice('@onekeyfe/'.length);
      const folder = { 'hd-core': 'core', 'hd-shared': 'shared' }[short] ?? short;
      check(directory === path.join(root, 'packages', folder));
      check(manifest.name === name && manifest.version === SDK_VERSION);
    }
    // Workspace runtime comes from dist. External packages can load JS/JSON/native/WASM/data
    // anywhere in their package, so bind the complete package rather than guessed extensions.
    const workspace = directory.startsWith(path.join(root, 'packages') + path.sep)
      && !directory.includes(`${path.sep}node_modules${path.sep}`);
    const packageFiles = workspace
      ? [manifestPath, ...files(root, path.join(directory, 'dist'))]
      : files(root, directory, new Set(['node_modules', '.git']));
    for (const file of packageFiles) {
      const actual = inside(root, file);
      artifacts[path.relative(root, actual).split(path.sep).join('/')] = hash(actual);
    }
    check(Object.hasOwn(artifacts, path.relative(root, resolved).split(path.sep).join('/')));
    const localRequire = createRequire(manifestPath);
    const dependencies = { ...manifest.peerDependencies, ...manifest.dependencies, ...manifest.optionalDependencies };
    for (const dependency of Object.keys(dependencies).sort()) {
      const optionalDependency = Object.hasOwn(manifest.optionalDependencies ?? {}, dependency)
        || manifest.peerDependenciesMeta?.[dependency]?.optional === true;
      visit(dependency, localRequire, optionalDependency);
    }
  }
  for (const name of ['@onekeyfe/hd-common-connect-sdk', '@onekeyfe/hd-transport-usb']) {
    entries[name] = path.relative(root, inside(root, entryRequire.resolve(name))).split(path.sep).join('/');
    visit(name, entryRequire);
    check(Object.hasOwn(artifacts, entries[name]));
  }
  return { entries, artifacts: sorted(artifacts) };
}
function capture(root, helperDirectory) {
  root = fs.realpathSync(root);
  const inputs = sourceSnapshot(root);
  const { entries, artifacts } = artifactSnapshot(root);
  return { schema: 1, sdkSource: SDK_SOURCE, sdkVersion: SDK_VERSION,
    sourceTree: root, lockSha256: inputs['yarn.lock'], inputs, entries, artifacts,
    node: fs.realpathSync(process.execPath), nodeSha256: hash(process.execPath),
    nodeVersion: NODE_VERSION, platform: process.platform, machine: process.arch,
    assets: Object.fromEntries(HELPERS.map(name => [name, hash(path.join(helperDirectory, name))])) };
}
function verifyRuntime(manifestPath, expectedHash, expectedRoot = path.resolve(__dirname, '../../..')) {
  const bytes = fs.readFileSync(manifestPath);
  check(/^[a-f0-9]{64}$/.test(expectedHash) && digest(bytes) === expectedHash);
  const data = JSON.parse(bytes);
  const root = fs.realpathSync(expectedRoot);
  check(data.schema === 1 && data.sdkSource === SDK_SOURCE && data.sdkVersion === SDK_VERSION);
  check(data.sourceTree === root && fs.realpathSync(data.sourceTree) === root);
  check(path.dirname(fs.realpathSync(manifestPath)) === path.join(root, 'plugins/electrum/.runtime'));
  check(data.nodeVersion === NODE_VERSION && process.version === `v${NODE_VERSION}`);
  check(data.node === fs.realpathSync(process.execPath) && data.nodeSha256 === hash(process.execPath));
  check(data.platform === process.platform && data.machine === process.arch);
  const current = capture(root, path.dirname(manifestPath));
  // Exact inventories reject additions, deletions, resolution changes and changed native dependencies.
  check(same(data, current));
  return data;
}
function guardLoads(data, helperDirectory) {
  const load = Module._load;
  Module._load = function pinnedLoad(request, parent, isMain) {
    if (!isBuiltin(request)) {
      const resolved = Module._resolveFilename(request, parent, isMain);
      const file = inside(data.sourceTree, resolved);
      const relative = path.relative(data.sourceTree, file).split(path.sep).join('/');
      const expected = data.artifacts[relative]
        ?? (path.dirname(file) === helperDirectory ? data.assets[path.basename(file)] : undefined);
      // An undeclared dependency must not silently escape the recorded package closure.
      check(expected && (Module._cache[resolved] || hash(file) === expected));
    }
    return load.call(this, request, parent, isMain);
  };
}
module.exports = { SDK_SOURCE, SDK_VERSION, NODE_VERSION, HELPERS, hash, digest,
  sourceSnapshot, artifactSnapshot, capture, verifyRuntime, guardLoads };

if (require.main === module) {
  try {
    const root = fs.realpathSync(process.argv[3]);
    const result = process.argv[2] === '--check-source' ? sourceSnapshot(root)
      : process.argv[2] === '--snapshot' ? capture(root, path.join(root, 'plugins/electrum/.runtime')) : null;
    check(result);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    process.exitCode = 1;
  }
}
