import { spawn } from 'child_process';

import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';

import type { IHwkErrorPayload } from '@onekeyfe/hwk-adapter-core';
import type { BleDebugLogger } from './debugLog';

export type WindowsBlePairingDecision = 'confirm' | 'cancel';

export interface WindowsBlePairingRequest {
  id: string;
  vendor: string;
  /** Numeric comparison only. Never persist or log this value. */
  pin: string;
  /** Close the prompt immediately when aborted; ignore any later UI answer. */
  signal: AbortSignal;
}

export interface WindowsBlePairingOptions {
  /** Absolute path to the SDK's helper, copied outside Electron's ASAR. */
  helperPath: string;
  /** Resolve only after the user compares the code and confirms or cancels. */
  onPairingRequest(request: WindowsBlePairingRequest): Promise<WindowsBlePairingDecision>;
}

type HelperEvent =
  | { type: 'diag'; t_ms: number; msg: string }
  | { type: 'link'; connected: boolean }
  | { type: 'pairing-result'; status: number }
  | { type: 'pairing'; pin: string }
  | { type: 'paired' | 'already-paired' }
  | { type: 'error'; message: string };

function isHelperEvent(value: unknown): value is HelperEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  switch (event.type) {
    case 'diag':
      return typeof event.t_ms === 'number' && typeof event.msg === 'string';
    case 'link':
      return typeof event.connected === 'boolean';
    case 'pairing-result':
      return typeof event.status === 'number' && Number.isInteger(event.status);
    case 'pairing':
      return typeof event.pin === 'string';
    case 'paired':
    case 'already-paired':
      return true;
    case 'error':
      return typeof event.message === 'string';
    default:
      return false;
  }
}

const PAIR_TIMEOUT_MS = 60_000;
const PAIR_COMPLETION_TIMEOUT_MS = 30_000;
const PAIR_DECLINE_GRACE_MS = 5000;

function helperFailure(message: string): IHwkErrorPayload {
  const status = /DevicePairingResultStatus\((\d+)\)/.exec(message)?.[1];
  return status === undefined
    ? { code: HardwareErrorCode.BleConnectFailed, message, params: { phase: 'pairing' } }
    : {
        code: HardwareErrorCode.BlePairingTimeout,
        message,
        params: { phase: 'pairing', pairingStatus: Number(status) },
      };
}

/** Internal WinRT process protocol. No Electron window, IPC, or global UI decision slot. */
export function pairWindowsBleDevice(
  options: WindowsBlePairingOptions,
  target: { id: string; vendor: string; address: string },
  signal: AbortSignal,
  logger?: BleDebugLogger
): Promise<'paired' | 'already-paired'> {
  return new Promise((resolve, reject) => {
    const log = (event: string, data?: Record<string, unknown>) => {
      try {
        logger?.({ level: 'info', scope: 'windows-pairing', event, data });
      } catch {
        // Diagnostics cannot change the pairing outcome.
      }
    };
    const prompt = new AbortController();
    const child = spawn(options.helperPath, ['pair', '--address', target.address], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let settled = false;
    let failure: IHwkErrorPayload | undefined;
    let outcome: 'paired' | 'already-paired' | undefined;
    let waitingForDecision = false;
    let decisionSent = false;
    let stdout = '';
    let confirmationTimer: ReturnType<typeof setTimeout> | undefined;
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const clearDisconnect = () => {
      clearTimeout(disconnectTimer);
      disconnectTimer = undefined;
    };
    const stopWaiting = () => {
      waitingForDecision = false;
      clearTimeout(confirmationTimer);
      clearDisconnect();
    };
    const lockFailure = (error: IHwkErrorPayload) => {
      failure ??= error;
      stopWaiting();
      prompt.abort();
    };
    const decline = (error: IHwkErrorPayload) => {
      if (settled || failure) return;
      lockFailure(error);
      clearTimeout(timer);
      clearTimeout(completionTimer);
      child.stdin?.write('cancel\n', error => {
        if (error) child.kill();
      });
      killTimer = setTimeout(() => child.kill(), PAIR_DECLINE_GRACE_MS);
    };
    const timeout = (message: string, params: Record<string, unknown> = {}) =>
      decline({
        code: HardwareErrorCode.BlePairingTimeout,
        message,
        params: { phase: 'pairing', timedOut: true, ...params },
      });
    const timer = setTimeout(
      () => timeout(`BLE pairing timed out after ${PAIR_TIMEOUT_MS}ms`),
      PAIR_TIMEOUT_MS
    );
    const cancel = () =>
      decline({
        code: HardwareErrorCode.BlePairingCancelled,
        message: 'BLE pairing declined by user',
        params: { phase: 'pairing' },
      });
    const decide = (decision: WindowsBlePairingDecision) => {
      if (settled || failure || prompt.signal.aborted || decisionSent) return;
      decisionSent = true;
      stopWaiting();
      if (decision !== 'confirm') {
        cancel();
        return;
      }
      clearTimeout(timer);
      completionTimer = setTimeout(
        () =>
          timeout(
            `BLE pairing did not complete ${PAIR_COMPLETION_TIMEOUT_MS}ms after confirmation`
          ),
        PAIR_COMPLETION_TIMEOUT_MS
      );
      child.stdin?.write('confirm\n', error => {
        if (error) {
          decline({
            code: HardwareErrorCode.BleConnectFailed,
            message: 'BLE pairing helper could not receive confirmation',
            params: { phase: 'pairing' },
          });
        }
      });
    };
    const finish = (error?: IHwkErrorPayload) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', cancel);
      clearTimeout(timer);
      clearTimeout(completionTimer);
      clearTimeout(killTimer);
      stopWaiting();
      prompt.abort();
      const reason = failure ?? error;
      if (reason) reject(createHwkError(reason));
      else if (outcome) resolve(outcome);
      else
        reject(
          createHwkError({
            code: HardwareErrorCode.BlePairingTimeout,
            message: 'BLE pairing did not complete',
            params: { phase: 'pairing' },
          })
        );
    };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();

    const endDisconnected = () => {
      if (!waitingForDecision) return;
      decline({
        code: HardwareErrorCode.BlePairingTimeout,
        message: 'BLE pairing ended because the device disconnected',
        params: { phase: 'pairing', deviceDisconnected: true },
      });
    };
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      let newline = stdout.indexOf('\n');
      while (newline >= 0) {
        const line = stdout.slice(0, newline).trim();
        stdout = stdout.slice(newline + 1);
        newline = stdout.indexOf('\n');
        if (!line) continue;
        let event: unknown;
        try {
          event = JSON.parse(line);
        } catch {
          log('helper.stdout.invalid');
          continue;
        }
        if (!isHelperEvent(event)) {
          log('helper.event.invalid');
          continue;
        }
        // The PIN is delivered only to the UI callback, never to diagnostics.
        log('helper.event', { type: event.type });
        if (event.type === 'pairing' && !failure && !decisionSent && !prompt.signal.aborted) {
          if (waitingForDecision) continue;
          waitingForDecision = true;
          confirmationTimer = setTimeout(
            () => timeout('BLE pairing confirmation timed out', { confirmationTimedOut: true }),
            target.vendor === 'ledger' ? 30_000 : PAIR_TIMEOUT_MS
          );
          const { pin } = event;
          // Catch a throwing or rejected host callback and decline the WinRT deferral.
          void Promise.resolve()
            .then(() => {
              if (prompt.signal.aborted) return 'cancel' as const;
              return options.onPairingRequest({
                id: target.id,
                vendor: target.vendor,
                pin,
                signal: prompt.signal,
              });
            })
            .then(decide, () => decide('cancel'));
        } else if (event.type === 'link') {
          if (event.connected) clearDisconnect();
          else if (waitingForDecision && !failure && !disconnectTimer) {
            if (target.vendor === 'trezor') {
              disconnectTimer = setTimeout(endDisconnected, 1000);
            } else endDisconnected();
          }
        } else if (event.type === 'pairing-result') {
          log('helper.result', { status: event.status });
          if (event.status === 0 || event.status === 3) {
            stopWaiting();
            prompt.abort();
          } else {
            lockFailure(
              helperFailure(`pairing failed with status DevicePairingResultStatus(${event.status})`)
            );
            killTimer ??= setTimeout(() => child.kill(), PAIR_DECLINE_GRACE_MS);
          }
        } else if (event.type === 'error') {
          lockFailure(helperFailure(event.message));
          killTimer ??= setTimeout(() => child.kill(), PAIR_DECLINE_GRACE_MS);
        } else if (event.type === 'paired' || event.type === 'already-paired') {
          outcome = event.type;
          stopWaiting();
          prompt.abort();
        } else if (event.type === 'diag') {
          log('helper.diag', { elapsedMs: event.t_ms, message: event.msg });
        }
      }
    });
    // Drain stderr without duplicating diagnostics or exposing unstructured output.
    child.stderr?.on('data', () => undefined);
    child.stdin?.on('error', () => {
      if (settled) return;
      lockFailure({
        code: HardwareErrorCode.BleConnectFailed,
        message: 'BLE pairing helper input pipe closed',
        params: { phase: 'pairing' },
      });
      child.kill();
    });
    child.on('error', error =>
      finish({
        code: HardwareErrorCode.BleConnectFailed,
        message: `BLE pairing helper failed to run: ${error.message}`,
        params: { phase: 'pairing' },
      })
    );
    // close follows stdout drainage; exit can precede the final paired event.
    child.on('close', code => {
      log('helper.closed', { code });
      finish(
        code === 0
          ? undefined
          : helperFailure(`BLE pairing helper exited with code ${code ?? 'unknown'}`)
      );
    });
  });
}
