/**
 * SDK Factory — creates and initializes the hardware SDK instance
 * for CLI usage with the appropriate transport.
 *
 * CRITICAL: Must register UI event handlers for PIN, Passphrase, and Button
 * confirmation. Without these, the SDK will hang waiting for responses.
 *
 * Reference: packages/core/src/core/index.ts (event registration pattern)
 */

// @ts-ignore - hd-common-connect-sdk may not have type declarations
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { DEVICE, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { NodeHidPlugin } from '@onekeyfe/hd-transport-node-hid';
import * as http from 'http';
import * as readline from 'readline';

import type { ConnectSettings } from '@onekeyfe/hd-core';

export interface SDKOptions {
  json?: boolean;
  connectId?: string;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}

/**
 * Prompt user for input in the terminal (hidden for PIN).
 * Falls back to empty string in non-TTY (piped) mode.
 */
function promptUser(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    // Non-interactive mode: return empty (agent should handle via uiResponse)
    return Promise.resolve('');
  }

  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // Use stderr so JSON stdout stays clean
    });

    if (hidden) {
      // Mute output for PIN entry
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
          // Ctrl+C
          process.exit(1);
        } else if (c === '\u007F' || c === '\b') {
          // Backspace
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
 * Register UI event handlers for interactive device operations.
 *
 * The SDK emits events when the device needs user interaction:
 * - PIN entry (entered on device screen for Touch/Pro, or via matrix for Classic)
 * - Passphrase input (for hidden wallets)
 * - Button confirmation (user must physically press on device)
 *
 * Reference: packages/core/src/core/index.ts lines 315-330, 1021-1098
 */
function registerEventHandlers(sdk: typeof HardwareSDK, opts: SDKOptions): void {
  sdk.on(UI_EVENT, (message: any) => {
    // PIN Request
    // For Touch/Pro devices, PIN is entered on-device (device screen shows numpad).
    // For Classic devices, PIN uses a matrix mapping.
    // In CLI context, we auto-acknowledge since PIN entry happens on-device.
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      const pinType = message.payload?.type;

      if (pinType === 'ButtonRequest_PinEntry' || pinType === 'ButtonRequest_AttachPin') {
        // PIN is entered directly on device screen (Touch/Pro)
        process.stderr.write('[onekey-hw] Please enter PIN on your device screen...\n');
        // No uiResponse needed — device handles PIN input internally
      } else {
        // Classic devices: PIN entry via matrix
        // In CLI mode, prompt user or let agent handle
        process.stderr.write('[onekey-hw] PIN required. Please enter PIN on your device.\n');
        promptUser('PIN (on-device numpad mapping): ', true).then(pin => {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: pin,
          });
        });
      }
    }

    // Passphrase Request
    // User must provide passphrase for hidden wallet access.
    // Passphrase can be entered on-device (Touch/Pro) or via host.
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      if (opts.useEmptyPassphrase) {
        // Standard wallet (no passphrase)
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: {
            value: '',
            passphraseOnDevice: false,
            save: false,
          },
        });
      } else {
        process.stderr.write('[onekey-hw] Passphrase required for hidden wallet.\n');
        promptUser('Enter passphrase (or press Enter for on-device entry): ').then(passphrase => {
          if (passphrase === '') {
            // Enter on device
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: '',
                passphraseOnDevice: true,
                save: false,
              },
            });
          } else {
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: passphrase,
                passphraseOnDevice: false,
                save: false,
              },
            });
          }
        });
      }
    }

    // Passphrase On Device
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE) {
      process.stderr.write('[onekey-hw] Please enter passphrase on your device screen...\n');
    }

    // Button Confirmation
    // User must physically press confirm/reject on the device.
    if (message.type === UI_REQUEST.REQUEST_BUTTON) {
      process.stderr.write('[onekey-hw] Please confirm the action on your device...\n');
    }
  });

  // Device connection events
  sdk.on(DEVICE.CONNECT, (device: any) => {
    if (!opts.json) {
      process.stderr.write(`[onekey-hw] Device connected: ${device?.name || 'Unknown'}\n`);
    }
  });

  sdk.on(DEVICE.DISCONNECT, (device: any) => {
    if (!opts.json) {
      process.stderr.write(`[onekey-hw] Device disconnected: ${device?.name || 'Unknown'}\n`);
    }
  });
}

/**
 * Probe whether OneKey Bridge is running on localhost:21320.
 * Returns true if reachable within 2 seconds, false otherwise.
 */
function isBridgeRunning(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:21320/', { timeout: 2000 }, res => {
      // Any response (even redirect) means Bridge is alive
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function createSDK(opts: SDKOptions) {
  const settings: Partial<ConnectSettings> = {
    debug: false,
    fetchConfig: true,
  };

  // Auto-detect transport:
  //   1. Bridge running → use HTTP transport (recommended, works on all platforms)
  //   2. Bridge not running + macOS → warn user to install Bridge
  //   3. Bridge not running + Linux/Windows → use node-hid direct USB HID
  //
  // Why Bridge first: On macOS, the HID framework hides the vendor-defined
  // interface (usagePage 0xFF00) that OneKey devices use for communication.
  // Only libusb (used by Bridge) can access it. node-hid works on Linux/Windows
  // where all HID interfaces are visible.
  let plugin;
  const bridgeAvailable = await isBridgeRunning();
  if (bridgeAvailable) {
    settings.env = 'node';
    process.stderr.write('[onekey-hw] Using OneKey Bridge transport\n');
  } else if (process.platform === 'darwin') {
    // macOS: node-hid cannot access the correct USB interface — Bridge is required
    settings.env = 'lowlevel';
    plugin = NodeHidPlugin;
    process.stderr.write(
      '[onekey-hw] Warning: OneKey Bridge not detected.\n' +
        '[onekey-hw] On macOS, Bridge is required for device communication.\n' +
        '[onekey-hw] Install from: https://onekey.so/download\n' +
        '[onekey-hw] Falling back to direct USB (limited functionality).\n'
    );
  } else {
    // Linux/Windows: node-hid direct USB works
    settings.env = 'lowlevel';
    plugin = NodeHidPlugin;
    process.stderr.write('[onekey-hw] Using direct USB transport (node-hid)\n');
  }

  await HardwareSDK.init(settings, undefined, plugin);

  // Register event handlers AFTER init
  registerEventHandlers(HardwareSDK, opts);

  return HardwareSDK;
}
