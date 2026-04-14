/**
 * Output formatting for human/agent modes.
 *
 * - Agent mode (piped / AI agent): structured JSON on stdout, JSON events on stderr
 * - Human mode (TTY / --human): colored formatted output on stdout, colored prompts on stderr
 */

import chalk from 'chalk';
import { writeSync } from 'fs';

export type OutputMode = 'human' | 'agent';
export type EventType =
  | 'pin_request'
  | 'passphrase_request'
  | 'passphrase_on_device'
  | 'button_confirm'
  | 'device_connect'
  | 'device_disconnect'
  | 'passphrase_state_ready';

let currentMode: OutputMode = 'agent';

export function detectAndSetMode(opts: { human?: boolean }): OutputMode {
  if (opts.human) {
    currentMode = 'human';
  } else {
    currentMode = process.stdout.isTTY ? 'human' : 'agent';
  }
  return currentMode;
}

export function getMode(): OutputMode {
  return currentMode;
}

// --- stdout: final result ---
// Returns `never` because it always calls process.exit.
export function outputResult(result: unknown): never {
  if (currentMode === 'agent') {
    // Use synchronous write to guarantee output is flushed before process.exit().
    // console.log() buffers async writes — they can be silently dropped when
    // process.exit() fires immediately after (common in piped/agent contexts).
    writeSync(1, JSON.stringify(result, null, 2) + '\n');
  } else {
    formatHumanResult(result);
  }

  if (
    result &&
    typeof result === 'object' &&
    'success' in result &&
    (result as { success: boolean }).success === false
  ) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function formatHumanResult(result: unknown): void {
  if (!result || typeof result !== 'object') {
    process.stdout.write(`${String(result)}\n`);
    return;
  }

  const obj = result as Record<string, unknown>;
  const isSuccess = obj.success !== false;

  if (!isSuccess) {
    const payload = obj.payload as Record<string, unknown> | undefined;
    process.stderr.write(`${chalk.red(`✘ Error: ${payload?.error || 'Unknown error'}`)}\n`);
    if (payload?.code) {
      process.stderr.write(`${chalk.dim(`  Code: ${payload.code}`)}\n`);
    }
    return;
  }

  process.stdout.write(`${chalk.green('✔ Success')}\n`);
  const payload = obj.payload ?? obj;
  formatHumanData(payload, 2);
}

function formatHumanData(data: unknown, indent: number): void {
  if (data === null || data === undefined) {
    process.stdout.write(`${' '.repeat(indent) + chalk.dim('—')}\n`);
    return;
  }
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    process.stdout.write(`${' '.repeat(indent) + String(data)}\n`);
    return;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      process.stdout.write(`${' '.repeat(indent) + chalk.dim('(no results)')}\n`);
      return;
    }
    data.forEach((item, i) => {
      process.stdout.write(`${' '.repeat(indent) + chalk.cyan(`[${i}]`)}\n`);
      formatHumanData(item, indent + 2);
    });
    return;
  }
  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        process.stdout.write(`${' '.repeat(indent) + chalk.dim(`${key}:`)}\n`);
        formatHumanData(value, indent + 2);
      } else if (Array.isArray(value)) {
        process.stdout.write(`${' '.repeat(indent) + chalk.dim(`${key}:`)}\n`);
        formatHumanData(value, indent + 2);
      } else {
        process.stdout.write(
          `${' '.repeat(indent) + chalk.dim(`${key}:`)} ${String(value ?? '—')}\n`
        );
      }
    }
  }
}

// --- stderr: device events ---
export function emitEvent(
  type: EventType,
  message: string,
  detail?: Record<string, unknown>
): void {
  if (currentMode === 'agent') {
    const event = { event: type, message, ...(detail ? { detail } : {}) };
    process.stderr.write(`${JSON.stringify(event)}\n`);
  } else {
    const prefix = chalk.yellow('[onekey-hw]');
    process.stderr.write(`${prefix} ${message}\n`);
  }
}
