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

import * as readline from 'node:readline';
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { DEVICE, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { promptPassphraseViaPinentry } from './pinentry';

import type { ConnectSettings } from '@onekeyfe/hd-core';
import type { PinentryResult } from './pinentry';

export interface SDKOptions {
  connectId?: string;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}

/**
 * Current per-invocation CLI options. Event handlers read from this object
 * so that invoking createSDK() with different opts never results in stale
 * closure captures — the SDK is a singleton, but opts can change per call.
 */
let currentOpts: SDKOptions = {};

/**
 * Promise-singleton that resolves to the initialised SDK. Set on first call,
 * reused by all subsequent (and concurrent) callers.
 *
 * Using a Promise instead of a boolean flag eliminates the race where two
 * concurrent createSDK() calls could both pass the "initialised?" check
 * before the flag was set, then both run init() — each call replaces the
 * internal Core/Connector at the hd-core layer and leaks USB handles.
 *
 * Mirrors app-monorepo's apps/cli/src/commands/device/hardware-sdk.ts
 * (sdkReadyPromise). Cleared by disposeSDK() so REPL/test harnesses can
 * re-init cleanly after an explicit tear-down.
 */
let sdkReadyPromise: Promise<typeof HardwareSDK> | null = null;

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

/**
 * Prompt user to select wallet type (aligns with app-monorepo flow):
 *   1. Standard wallet (no passphrase)
 *   2. Hidden wallet — enter passphrase via pinentry (secure OS dialog)
 *   3. Hidden wallet — enter passphrase on device screen
 */
function resolvePassphraseByChoice(
  choice: '1' | '2' | '3'
): Promise<PinentryResult> {
  if (choice === '1') return Promise.resolve({ value: '', passphraseOnDevice: false });
  if (choice === '2') return promptPassphraseViaPinentry();
  return Promise.resolve({ value: '', passphraseOnDevice: true });
}

function promptPassphraseMode(): Promise<PinentryResult> {
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

function registerEventHandlers(sdk: typeof HardwareSDK): void {
  sdk.on(UI_EVENT, (message: any) => {
    // PIN Request — always on-device for CLI security (no terminal echo).
    // The sentinel '@@ONEKEY_INPUT_PIN_IN_DEVICE' makes DeviceCommands send
    // `BixinPinInputOnDevice` so the device switches to on-device PIN entry.
    // Sending an empty string would be treated as a wrong (empty) PIN and
    // would consume a PIN retry on Classic/1S/Mini/Pure.
    // Touch/Pro never emit PinMatrixRequest — they handle PIN on touchscreen
    // before this code path runs, so the sentinel is harmless there.
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      process.stderr.write('[onekey-hw] Please enter PIN on your device screen...\n');
      sdk.uiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      });
    }

    // Passphrase Request
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      // 1. Explicit --use-empty-passphrase: auto-respond
      if (currentOpts.useEmptyPassphrase) {
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: { value: '', passphraseOnDevice: false, save: false },
        });
        return;
      }

      // 2. Interactive: 1/2/3 selection
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

async function initSDK(): Promise<typeof HardwareSDK> {
  const settings: Partial<ConnectSettings> = {
    debug: false,
    fetchConfig: true,
    env: 'node-usb',
  };
  await HardwareSDK.init(settings);

  // Defensive: strip any stale listeners (e.g. left over from a previous
  // dispose/init cycle in a long-running process) before wiring ours.
  // Mirrors app-monorepo's cleanupHardwareSDKInstance() which removes
  // listeners for ALL events at once.
  // @ts-expect-error CoreApi types require an event name; passing none
  // removes listeners for ALL events (Node.js EventEmitter semantics).
  HardwareSDK.removeAllListeners();
  registerEventHandlers(HardwareSDK);

  return HardwareSDK;
}

export async function createSDK(opts: SDKOptions): Promise<typeof HardwareSDK> {
  // Always refresh opts — event handlers read from the module-level ref,
  // so subsequent createSDK() calls pick up new opts without re-registering.
  currentOpts = opts;

  if (!sdkReadyPromise) {
    sdkReadyPromise = initSDK();
  }
  return sdkReadyPromise;
}

/**
 * Release the SDK and clear the singleton. Must be called before the CLI
 * process exits — the USB transport holds open handles (event listeners,
 * polling timers) that otherwise keep Node.js alive for ~26s.
 *
 * Safe to call multiple times (no-op after the first successful call).
 */
export async function disposeSDK(): Promise<void> {
  if (!sdkReadyPromise) return;
  try {
    const sdk = await sdkReadyPromise;
    sdk.dispose();
  } catch {
    // ignore errors during cleanup
  } finally {
    sdkReadyPromise = null;
    currentOpts = {};
  }
}
