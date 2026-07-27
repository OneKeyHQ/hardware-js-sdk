/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const playgroundDist = path.join(repoRoot, 'packages/connect-examples/expo-playground/dist');
const expoExampleRoot = path.join(repoRoot, 'packages/connect-examples/expo-example');
const expoExampleBuild = path.join(expoExampleRoot, 'web-build');
const expoExampleDist = path.join(playgroundDist, 'expo-example');

const commitSha =
  process.env.COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.EXPO_PUBLIC_COMMIT_SHA ||
  '';
const shortCommitSha = commitSha ? commitSha.slice(0, 7) : 'dev';
const shouldRunForVercelOnly = process.argv.includes('--if-vercel');

if (shouldRunForVercelOnly && process.env.VERCEL !== '1') {
  console.log('[vercel-build] skip expo-example output: not running on Vercel');
  process.exit(0);
}

function run(command, args, options = {}) {
  console.log(`\n[vercel-build] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      COMMIT_SHA: commitSha,
      EXPO_PUBLIC_COMMIT_SHA: shortCommitSha,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function assertPathExists(target, label) {
  if (!fs.existsSync(target)) {
    throw new Error(`${label} not found: ${target}`);
  }
}

function copyDirectory(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

run('yarn', ['--cwd', expoExampleRoot, 'expo', 'export:web'], {
  env: {
    NODE_ENV: 'production',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
  },
});

assertPathExists(playgroundDist, 'expo-playground dist');
assertPathExists(path.join(expoExampleBuild, 'index.html'), 'expo-example index.html');

fs.copyFileSync(path.join(expoExampleBuild, 'index.html'), path.join(expoExampleBuild, '404.html'));
fs.writeFileSync(
  path.join(expoExampleBuild, 'commit-info.json'),
  `${JSON.stringify(
    {
      commit: shortCommitSha,
      fullCommit: commitSha || shortCommitSha,
      buildTarget: 'vercel',
      timestamp: new Date().toISOString(),
    },
    null,
    2
  )}\n`
);

copyDirectory(expoExampleBuild, expoExampleDist);

console.log('\n[vercel-build] output ready:');
console.log(`  - playground: ${playgroundDist}`);
console.log(`  - expo-example: ${expoExampleDist}`);
