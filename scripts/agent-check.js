#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/restrict-plus-operands, no-continue */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const validProfiles = new Set(['commit', 'pr']);

function formatDuration(durationMs) {
  return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;
}

function createLogDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const logDirectory = path.join(rootDir, 'node_modules', '.cache', 'agent-checks', timestamp);
  fs.mkdirSync(logDirectory, { recursive: true });
  return logDirectory;
}

function resolveCommand(command) {
  if (process.platform === 'win32' && command === 'yarn') {
    return 'yarn.cmd';
  }
  return command;
}

function parseProfile(argv) {
  const profileIndex = argv.findIndex(arg => arg === '--profile');
  const inlineProfile = argv.find(arg => arg.startsWith('--profile='));
  const profile = inlineProfile?.slice('--profile='.length) || argv[profileIndex + 1] || 'commit';
  if (!validProfiles.has(profile)) {
    throw new Error(`Invalid profile "${profile}". Expected commit or pr.`);
  }
  return profile;
}

function run(logDirectory, label, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(resolveCommand(command), args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
    maxBuffer: 1024 * 1024 * 50,
  });
  const durationMs = Date.now() - startedAt;
  const fileName = `${label.replace(/[^a-zA-Z0-9._-]/gu, '_')}.log`;
  const logPath = path.join(logDirectory, fileName);
  fs.writeFileSync(
    logPath,
    [
      `$ ${[command, ...args].join(' ')}`,
      `exitCode: ${String(result.status)}`,
      `duration: ${formatDuration(durationMs)}`,
      `spawnError: ${result.error?.message || ''}`,
      '',
      '--- stdout ---',
      result.stdout || '',
      '',
      '--- stderr ---',
      result.stderr || '',
    ].join('\n')
  );
  const relativeLogPath = path.relative(rootDir, logPath);
  const passed = !result.error && result.status === 0;
  console.log(
    `${passed ? 'PASS' : 'FAIL'} ${label} (${formatDuration(durationMs)}) log: ${relativeLogPath}`
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}; see ${relativeLogPath}`);
  }
}

function gitLines(args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout.split(/\r?\n/u).filter(Boolean);
}

function changedFiles() {
  return [
    ...new Set([
      ...gitLines(['diff', '--name-only', '--diff-filter=ACMR']),
      ...gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
      ...gitLines(['ls-files', '--others', '--exclude-standard']),
    ]),
  ].toSorted();
}

function readPackage(packageDirectory) {
  const manifestPath = path.join(rootDir, packageDirectory, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function affectedPackageDirectories(files) {
  return [
    ...new Set(
      files.flatMap(file => {
        const match = /^(packages\/[^/]+)\//u.exec(file);
        return match ? [match[1]] : [];
      })
    ),
  ].toSorted();
}

function main() {
  const profile = parseProfile(process.argv.slice(2));
  const files = changedFiles();
  const logDirectory = createLogDirectory();

  run(logDirectory, 'agent context', process.execPath, ['scripts/agent-context-check.js']);
  run(logDirectory, 'diff whitespace', 'git', ['diff', '--check']);

  const lintFiles = files.filter(
    file =>
      /\.(?:cjs|js|jsx|mjs|ts|tsx)$/u.test(file) && !/(?:^|\/)(?:dist|build|coverage)\//u.test(file)
  );
  if (lintFiles.length > 0) {
    run(logDirectory, 'changed-file lint', 'yarn', ['eslint', '--quiet', ...lintFiles]);
  }

  for (const packageDirectory of affectedPackageDirectories(files)) {
    const manifest = readPackage(packageDirectory);
    if (!manifest) {
      continue;
    }
    if (manifest.scripts?.test) {
      run(logDirectory, `${manifest.name} test`, 'yarn', [
        '--cwd',
        packageDirectory,
        'test',
        '--runInBand',
      ]);
    }
    if (manifest.scripts?.build) {
      run(logDirectory, `${manifest.name} build`, 'yarn', ['--cwd', packageDirectory, 'build']);
    }
  }

  if (profile === 'pr') {
    run(logDirectory, 'package versions', 'yarn', ['check-versions']);
    run(logDirectory, 'full lint', 'yarn', ['lint', '--quiet'], {
      env: {
        NODE_OPTIONS: '--max-old-space-size=8192',
      },
    });
    run(logDirectory, 'full test', 'yarn', ['test']);
    run(logDirectory, 'full build', 'yarn', ['build']);
  }

  console.log(`\nPASS agent:check ${profile}`);
}

try {
  main();
} catch (error) {
  console.error(`\nFAIL agent:check: ${error.message}`);
  process.exitCode = 1;
}
