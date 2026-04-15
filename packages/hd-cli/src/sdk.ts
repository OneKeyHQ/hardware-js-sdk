/**
 * SDK Factory — creates and initializes the hardware SDK instance
 * for CLI usage with the appropriate transport.
 *
 * CRITICAL: Must register UI event handlers for PIN, Passphrase, and Button
 * confirmation. Without these, the SDK will hang waiting for responses.
 *
 * Passphrase architecture (from packages/core/src/core/index.ts):
 *
 *   useEmptyPassphrase = true
 *     → SDK registers onEmptyPassphraseHandler: responds { passphrase: '' } internally,
 *       REQUEST_PASSPHRASE UI event is NEVER emitted. Standard (no-passphrase) wallet.
 *
 *   useEmptyPassphrase = false (default)
 *     → SDK registers onDevicePassphraseHandler: ALWAYS emits REQUEST_PASSPHRASE UI event
 *       and waits for the CLI to call sdk.uiResponse(RECEIVE_PASSPHRASE).
 *       The CLI must respond with the actual passphrase value.
 *
 *   passphraseState
 *     → A device-side wallet identifier. Passed as an API call parameter (e.g. btcGetAddress).
 *       The SDK validates it in checkPassphraseStateSafety() BEFORE making the device call —
 *       if the device's current passphrase state doesn't match, error 112 is thrown.
 *       passphraseState does NOT suppress REQUEST_PASSPHRASE. The passphrase must still
 *       be provided by the handler on every call. passphraseState is purely a safety check
 *       to ensure the same wallet is being accessed across multiple calls.
 *
 * Reference: packages/core/src/core/index.ts lines 315-330, 489-508, 1059-1086
 */

// @ts-ignore - hd-common-connect-sdk may not have type declarations
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { DEVICE, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import * as readline from 'readline';

import { emitEvent } from './output';

import type { ConnectSettings, KnownDevice, UiEventMessage } from '@onekeyfe/hd-core';

export interface SDKOptions {
  connectId?: string;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
  /**
   * Passphrase for hidden wallet access.
   * Provided via --passphrase CLI flag or collected by agent via AskUserQuestion.
   * When set, the handler responds to every REQUEST_PASSPHRASE with this value.
   * Must NOT be combined with useEmptyPassphrase.
   */
  passphrase?: string;
}

/**
 * Prompt user for input in the terminal (hidden for PIN/passphrase).
 * Falls back to empty string in non-TTY (piped) mode.
 */
function promptUser(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.resolve('');
  }

  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // Use stderr so JSON stdout stays clean
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
 * Register UI event handlers for interactive device operations.
 *
 * Passphrase handler priority (REQUEST_PASSPHRASE):
 *   1. useEmptyPassphrase → SDK never fires this event (handled internally)
 *      This branch is defensive — should not be reached in normal flow.
 *   2. passphrase supplied (--passphrase flag / AskUserQuestion)
 *      → respond with the value directly, passphraseOnDevice: false
 *   3. Interactive terminal (TTY)
 *      → prompt user; empty input → on-device; non-empty → use value
 *   4. Non-TTY agent mode, no passphrase supplied
 *      → passphraseOnDevice: true (Pro/Touch device keyboard)
 *
 * NOTE: passphraseState is NOT checked here. It is a SDK-level validation
 * parameter passed to API calls (e.g. btcGetAddress). The SDK validates it
 * in checkPassphraseStateSafety() before the device call. It has no bearing
 * on what value to return in response to REQUEST_PASSPHRASE.
 */
function registerEventHandlers(sdk: typeof HardwareSDK, opts: SDKOptions): void {
  sdk.on(UI_EVENT, (message: UiEventMessage) => {
    // ── PIN Request ────────────────────────────────────────────────────────
    // Touch/Pro: PIN is entered on-device (device screen shows numpad).
    // Classic: PIN uses a matrix mapping entered on the host.
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      const pinType = message.payload?.type;

      if (pinType === 'ButtonRequest_PinEntry' || pinType === 'ButtonRequest_AttachPin') {
        // PIN entered directly on device screen (Touch/Pro) — no uiResponse needed
        emitEvent('pin_request', 'Please enter PIN on your device screen.', {
          inputMode: 'on_device',
        });
      } else if (!process.stdin.isTTY) {
        // Classic device in non-interactive (agent) mode: cannot collect PIN
        emitEvent(
          'pin_request',
          'Classic device requires PIN entry but no terminal is available.',
          { inputMode: 'host', error: true, code: 'PIN_INPUT_UNAVAILABLE' }
        );
        sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: '' });
      } else {
        // Classic device in interactive terminal: matrix PIN entry
        emitEvent('pin_request', 'PIN required. Please enter PIN on your device.', {
          inputMode: 'host',
        });
        promptUser('PIN (on-device numpad mapping): ', true).then(pin => {
          sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: pin });
        });
      }
    }

    // ── Passphrase Request ─────────────────────────────────────────────────
    // Fired by the SDK when the device needs a passphrase to derive the wallet.
    // useEmptyPassphrase=true bypasses this event entirely (SDK handles it
    // internally). For hidden wallets, this fires on every relevant API call.
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      if (opts.useEmptyPassphrase) {
        // Standard wallet — should not normally reach here (SDK skips this event
        // when useEmptyPassphrase is true), but handle defensively.
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: { value: '', passphraseOnDevice: false, save: false },
        });
      } else if (opts.passphrase !== undefined) {
        // Passphrase supplied via --passphrase flag or agent AskUserQuestion.
        // Use it directly for every REQUEST_PASSPHRASE event.
        emitEvent('passphrase_request', 'Using supplied passphrase for hidden wallet.', {
          inputMode: 'host',
        });
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: { value: opts.passphrase, passphraseOnDevice: false, save: false },
        });
      } else if (process.stdin.isTTY) {
        // Interactive terminal: prompt user. Empty input → on-device keyboard.
        emitEvent('passphrase_request', 'Passphrase required for hidden wallet.', {
          inputMode: 'prompt',
        });
        promptUser('Enter passphrase (or press Enter to enter on device screen): ').then(
          passphrase => {
            if (passphrase === '') {
              sdk.uiResponse({
                type: UI_RESPONSE.RECEIVE_PASSPHRASE,
                payload: { value: '', passphraseOnDevice: true, save: false },
              });
            } else {
              sdk.uiResponse({
                type: UI_RESPONSE.RECEIVE_PASSPHRASE,
                payload: { value: passphrase, passphraseOnDevice: false, save: false },
              });
            }
          }
        );
      } else {
        // Non-TTY agent mode without --passphrase: delegate to device screen.
        // Pro/Touch devices support on-device passphrase keyboard.
        // Classic devices do not — they will return an error.
        emitEvent(
          'passphrase_request',
          'Passphrase required. Please enter your passphrase on the device screen.',
          { inputMode: 'on_device' }
        );
        sdk.uiResponse({
          type: UI_RESPONSE.RECEIVE_PASSPHRASE,
          payload: { value: '', passphraseOnDevice: true, save: false },
        });
      }
    }

    // ── Passphrase On Device ───────────────────────────────────────────────
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE) {
      emitEvent('passphrase_on_device', 'Please enter passphrase on your device screen.');
    }

    // ── Button Confirmation ────────────────────────────────────────────────
    if (message.type === UI_REQUEST.REQUEST_BUTTON) {
      emitEvent('button_confirm', 'Please confirm the action on your device.');
    }
  });

  // Device connection events
  sdk.on(DEVICE.CONNECT, (device: KnownDevice) => {
    const name = device?.label || device?.name;
    if (name) emitEvent('device_connect', `Device connected: ${name}`, { name });
  });

  sdk.on(DEVICE.DISCONNECT, (device: KnownDevice) => {
    const name = device?.label || device?.name;
    if (name) emitEvent('device_disconnect', `Device disconnected: ${name}`, { name });
  });
}

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

/**
 * Pre-unlock Pro/Touch devices before SDK API calls that require passphrase state.
 *
 * Unlike the OneKey App (which has a UI-driven unlock flow before any wallet
 * operation), the CLI may invoke SDK methods on a cold/locked device. The SDK's
 * checkPassphraseStateSafety() calls GetPassphraseState internally, which returns
 * Failure_ActionCancelled (error 803) on locked Pro/Touch devices.
 *
 * This function mirrors what the App does implicitly: unlock first, then proceed.
 * Call it after createSDK() and before any SDK method that uses passphrase state
 * (i.e. signing, address generation, etc.).
 */
export async function ensureDeviceUnlocked(
  sdk: typeof HardwareSDK,
  connectId?: string
): Promise<void> {
  if (!connectId) return;

  const featuresResult = await sdk.getFeatures(connectId);
  if (!featuresResult?.success || !featuresResult.payload) return;

  const features = featuresResult.payload;
  const deviceType = features.onekey_device_type?.toLowerCase();
  const isProOrTouch = deviceType === 'touch' || deviceType === 'pro';

  if (isProOrTouch && features.unlocked === false) {
    // Device is locked — unlock via PIN entry (handled on-device for Pro/Touch).
    // Without this, GetPassphraseState will fail with error 803.
    await sdk.deviceUnlock(connectId);
  }
}
