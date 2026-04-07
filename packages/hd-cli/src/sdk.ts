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
import { UsbPlugin } from '@onekeyfe/hd-transport-usb';
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

  // Device connection events — only show when device has a known name
  sdk.on(DEVICE.CONNECT, (device: any) => {
    const name = device?.label || device?.name;
    if (name) {
      process.stderr.write(`[onekey-hw] Device connected: ${name}\n`);
    }
  });

  sdk.on(DEVICE.DISCONNECT, (device: any) => {
    const name = device?.label || device?.name;
    if (name) {
      process.stderr.write(`[onekey-hw] Device disconnected: ${name}\n`);
    }
  });
}

export async function createSDK(opts: SDKOptions) {
  const settings: Partial<ConnectSettings> = {
    debug: false,
    fetchConfig: true,
  };

  // Direct USB via libusb — works on macOS, Linux, Windows
  settings.env = 'lowlevel';
  const plugin = UsbPlugin;

  await HardwareSDK.init(settings, undefined, plugin);

  // Register event handlers AFTER init
  registerEventHandlers(HardwareSDK, opts);

  return HardwareSDK;
}
