/**
 * SDK Factory — creates and initializes the hardware SDK instance
 * for CLI usage with the appropriate transport.
 *
 * Passphrase flow aligns with app-monorepo CLI:
 *   - Standard wallet: --use-empty-passphrase, auto-respond
 *   - Hidden wallet: interactive 1/2/3 selection (standard / pinentry / on-device)
 *   - Session caching: passphraseState + sessionId stored in OS keychain,
 *     preloaded via preloadSessionCache on next invocation
 */

import { execFile, execFileSync } from 'node:child_process';
import * as readline from 'readline';

// @ts-ignore - hd-common-connect-sdk may not have type declarations
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { DEVICE, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import type { ConnectSettings } from '@onekeyfe/hd-core';

export interface SDKOptions {
  connectId?: string;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}

// ---------------------------------------------------------------------------
// Passphrase provider — module-level, async-capable
// ---------------------------------------------------------------------------

type IPassphraseProvider = () =>
  | { value: string; passphraseOnDevice: boolean }
  | Promise<{ value: string; passphraseOnDevice: boolean }>;

let passphraseProvider: IPassphraseProvider | undefined;

function setPassphraseProvider(provider: IPassphraseProvider | undefined): void {
  passphraseProvider = provider;
}


// ---------------------------------------------------------------------------
// Pinentry — secure passphrase input via native OS dialog
// ---------------------------------------------------------------------------

const PINENTRY_PROGRAMS = ['pinentry-mac', 'pinentry', 'pinentry-gnome3', 'pinentry-qt'];

function findPinentry(): string | null {
  for (const prog of PINENTRY_PROGRAMS) {
    try {
      const result = execFileSync('which', [prog], {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (result.trim()) return prog;
    } catch {
      // not found
    }
  }
  return null;
}

function promptPassphraseViaPinentry(): Promise<{
  value: string;
  passphraseOnDevice: boolean;
}> {
  return new Promise((resolve, reject) => {
    const pinentryBin = findPinentry();
    if (!pinentryBin) {
      process.stderr.write('[onekey-hw] No pinentry found, falling back to on-device entry.\n');
      resolve({ value: '', passphraseOnDevice: true });
      return;
    }

    const commands = [
      'SETDESC OneKey Hardware Wallet',
      'SETPROMPT Enter passphrase',
      'GETPIN',
      'BYE',
    ].join('\n');

    const child = execFile(
      pinentryBin,
      [],
      { timeout: 120_000, encoding: 'utf-8' },
      (error, stdout) => {
        if (error) {
          if (error.killed || (stdout && stdout.includes('ERR 83886179'))) {
            process.stderr.write(
              '[onekey-hw] Passphrase entry cancelled, falling back to on-device.\n'
            );
            resolve({ value: '', passphraseOnDevice: true });
            return;
          }
          reject(error);
          return;
        }

        const dataLine = stdout.split('\n').find(l => l.startsWith('D '));
        if (dataLine) {
          resolve({ value: dataLine.slice(2), passphraseOnDevice: false });
          return;
        }

        if (stdout.includes('ERR 83886179') || stdout.includes('Operation cancelled')) {
          process.stderr.write(
            '[onekey-hw] Passphrase entry cancelled, falling back to on-device.\n'
          );
          resolve({ value: '', passphraseOnDevice: true });
          return;
        }

        // Empty passphrase — on-device
        resolve({ value: '', passphraseOnDevice: true });
      }
    );

    child.stdin?.write(commands);
    child.stdin?.end();
  });
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

function promptUser(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.resolve('');
  }

  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    if (hidden) {
      process.stderr.write(question);
      const { stdin } = process;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);

      let input = '';
      const onData = (char: Buffer) => {
        const c = char.toString('utf8');
        if (c === '\n' || c === '\r' || c === '\u0004') {
          if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
          stdin.removeListener('data', onData);
          process.stderr.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit(1);
        } else if (c === '\u007F' || c === '\b') {
          input = input.slice(0, -1);
        } else {
          input += c;
          process.stderr.write('*');
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Prompt user to select wallet type (aligns with app-monorepo flow):
 *   1. Standard wallet (no passphrase)
 *   2. Hidden wallet — enter passphrase via pinentry (secure OS dialog)
 *   3. Hidden wallet — enter passphrase on device screen
 */
function resolvePassphraseByChoice(
  choice: '1' | '2' | '3'
): Promise<{ value: string; passphraseOnDevice: boolean }> {
  if (choice === '1') return Promise.resolve({ value: '', passphraseOnDevice: false });
  if (choice === '2') return promptPassphraseViaPinentry();
  return Promise.resolve({ value: '', passphraseOnDevice: true });
}

function promptPassphraseMode(): Promise<{
  value: string;
  passphraseOnDevice: boolean;
}> {
  if (!process.stdin.isTTY) {
    return Promise.resolve({ value: '', passphraseOnDevice: true });
  }

  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });

    const prompt = () => {
      process.stderr.write(
        [
          '[onekey-hw] Select wallet type:',
          '  1. Standard wallet (no passphrase)',
          '  2. Hidden wallet — enter passphrase on this computer (pinentry)',
          '  3. Hidden wallet — enter passphrase on device screen',
          '',
        ].join('\n')
      );

      rl.question('Enter selection [1/2/3]: ', answer => {
        const n = answer.trim() as '1' | '2' | '3';
        if (n === '1' || n === '2' || n === '3') {
          rl.close();
          resolvePassphraseByChoice(n).then(resolve);
          return;
        }
        process.stderr.write('Invalid selection. Enter 1, 2, or 3.\n');
        prompt();
      });
    };
    prompt();
  });
}


// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function registerEventHandlers(sdk: typeof HardwareSDK, opts: SDKOptions): void {
  sdk.on(UI_EVENT, (message: any) => {
    // PIN Request
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      const pinType = message.payload?.type;
      if (pinType === 'ButtonRequest_PinEntry' || pinType === 'ButtonRequest_AttachPin') {
        process.stderr.write('[onekey-hw] Please enter PIN on your device screen...\n');
      } else {
        process.stderr.write('[onekey-hw] PIN required. Please enter PIN on your device.\n');
        promptUser('PIN (on-device numpad mapping): ', true).then(pin => {
          sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: pin });
        });
      }
    }

    // Passphrase Request
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      // 1. Explicit --use-empty-passphrase: auto-respond
      if (opts.useEmptyPassphrase) {
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: { value: '', passphraseOnDevice: false, save: false },
        });
        return;
      }

      // 2. External provider set (e.g. by session.ts during resolvePassphraseState)
      if (passphraseProvider) {
        const resultOrPromise = passphraseProvider();
        const respond = (result: { value: string; passphraseOnDevice: boolean }) => {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: result.value,
              passphraseOnDevice: result.passphraseOnDevice,
              save: false,
            },
          });
        };
        if (resultOrPromise instanceof Promise) {
          resultOrPromise.then(respond).catch(() => {
            process.stderr.write(
              '[onekey-hw] Passphrase provider failed, falling back to on-device.\n'
            );
            respond({ value: '', passphraseOnDevice: true });
          });
        } else {
          respond(resultOrPromise);
        }
        return;
      }

      // 3. Interactive: 1/2/3 selection
      promptPassphraseMode()
        .then(result => {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: result.value,
              passphraseOnDevice: result.passphraseOnDevice,
              save: false,
            },
          });
        })
        .catch(() => {
          process.stderr.write(
            '[onekey-hw] Passphrase prompt failed, falling back to on-device.\n'
          );
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: { value: '', passphraseOnDevice: true, save: false },
          });
        });
    }

    // Passphrase On Device
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE) {
      process.stderr.write('[onekey-hw] Please enter passphrase on your device screen...\n');
    }

    // Button Confirmation
    if (message.type === UI_REQUEST.REQUEST_BUTTON) {
      process.stderr.write('[onekey-hw] Please confirm the action on your device...\n');
    }
  });

  sdk.on(DEVICE.CONNECT, (device: any) => {
    const name = device?.label || device?.name;
    if (name) process.stderr.write(`[onekey-hw] Device connected: ${name}\n`);
  });

  sdk.on(DEVICE.DISCONNECT, (device: any) => {
    const name = device?.label || device?.name;
    if (name) process.stderr.write(`[onekey-hw] Device disconnected: ${name}\n`);
  });
}

// ---------------------------------------------------------------------------
// SDK Factory
// ---------------------------------------------------------------------------

export async function createSDK(opts: SDKOptions) {
  const settings: Partial<ConnectSettings> = {
    debug: false,
    fetchConfig: true,
  };
  settings.env = 'node-usb';

  await HardwareSDK.init(settings);
  registerEventHandlers(HardwareSDK, opts);

  return HardwareSDK;
}
