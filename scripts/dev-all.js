/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const buildTimeoutMs = 120_000;
const pollIntervalMs = 100;

const webSdkDependencyOutputs = [
  'packages/shared/dist/index.js',
  'packages/hd-transport/dist/index.js',
  'packages/core/dist/index.js',
  'packages/hd-transport-http/dist/index.js',
  'packages/hd-transport-web-device/dist/index.js',
];

const dependencyWatcherArgs = [
  'lerna',
  'run',
  'dev',
  '--parallel',
  '--ignore',
  'expo-example',
  '--ignore',
  'hardware-example',
  '--ignore',
  'onekey-hardware-playground',
  '--ignore',
  '@onekeyfe/hd-web-sdk',
];

const children = new Set();
let shuttingDown = false;

function startProcess(args) {
  const child = spawn(yarnCommand, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

function stopChildren(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill(signal);
  }
}

function waitForFreshDependencyOutputs(startedAt, dependencyWatchers) {
  const outputPaths = webSdkDependencyOutputs.map(relativePath =>
    path.join(workspaceRoot, relativePath)
  );

  return new Promise((resolve, reject) => {
    let pollTimer;

    const cleanup = () => {
      clearTimeout(timeout);
      clearTimeout(pollTimer);
      dependencyWatchers.removeListener('exit', handleWatcherExit);
    };

    const handleWatcherExit = code => {
      cleanup();
      reject(new Error(`Dependency watchers exited before Web SDK startup (code ${code})`));
    };

    const timeout = setTimeout(() => {
      const missingOrStale = outputPaths
        .filter(outputPath => {
          try {
            return fs.statSync(outputPath).mtimeMs < startedAt;
          } catch (_error) {
            return true;
          }
        })
        .map(outputPath => path.relative(workspaceRoot, outputPath));

      cleanup();
      reject(
        new Error(`Timed out waiting for initial dependency builds: ${missingOrStale.join(', ')}`)
      );
    }, buildTimeoutMs);

    const poll = () => {
      const isReady = outputPaths.every(outputPath => {
        try {
          return fs.statSync(outputPath).mtimeMs >= startedAt;
        } catch (_error) {
          return false;
        }
      });

      if (isReady) {
        cleanup();
        resolve();
        return;
      }

      pollTimer = setTimeout(poll, pollIntervalMs);
    };

    dependencyWatchers.once('exit', handleWatcherExit);
    poll();
  });
}

async function main() {
  const startedAt = Date.now();
  const dependencyWatchers = startProcess(dependencyWatcherArgs);

  await waitForFreshDependencyOutputs(startedAt, dependencyWatchers);

  console.log('Web SDK dependencies are ready. Starting hd-web-sdk watcher...');
  const webSdkWatcher = startProcess(['dev:web']);
  dependencyWatchers.once('exit', code => {
    if (shuttingDown) return;
    console.error(`Dependency watchers exited unexpectedly (code ${code})`);
    process.exitCode = code ?? 1;
    stopChildren();
  });
  webSdkWatcher.once('exit', code => {
    if (shuttingDown) return;
    process.exitCode = code ?? 1;
    stopChildren();
  });
}

process.once('SIGINT', () => stopChildren('SIGINT'));
process.once('SIGTERM', () => stopChildren('SIGTERM'));

main().catch(error => {
  console.error(error.message);
  stopChildren();
  process.exitCode = 1;
});
