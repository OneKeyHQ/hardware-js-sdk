/**
 * Secure passphrase input via the system pinentry program
 * (pinentry-mac / pinentry / pinentry-gnome3 / pinentry-qt).
 *
 * The passphrase is entered in an OS dialog and returned as a string —
 * it never appears in the terminal, shell history, process arguments,
 * or env vars. Commands are piped over stdin so the dialog configuration
 * (description, prompt) doesn't show up in argv either.
 *
 * Ported from app-monorepo apps/cli/src/utils/pinentry.ts; kept as a
 * standalone module so the pure parser functions can be unit-tested
 * without touching the SDK, child processes, or hardware.
 */

import { execFile, execFileSync } from 'node:child_process';

const PINENTRY_PROGRAMS = ['pinentry-mac', 'pinentry', 'pinentry-gnome3', 'pinentry-qt'];

// Assuan protocol percent-encodes %, CR, and LF in D data lines.
// Without decoding, a passphrase containing `%` would be silently corrupted
// (e.g. `a%b` -> `a%25b`), deriving a wrong passphraseState and exposing a
// different — empty — hidden wallet.
export function decodeAssuanData(encoded: string): string {
  return encoded.replace(/%([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

// Parse pinentry stdout into either a passphrase or a cancellation signal.
// Handles two edge cases beyond the basic `D <data>` shape:
//   1. Multi-line D responses — long passphrases past Assuan's ~1000-byte
//      line limit get split across several `D` lines and must be concatenated
//      *before* percent-decoding (a split inside `%XX` would otherwise corrupt
//      the byte).
//   2. CRLF line endings — pinentry-mac uses LF, but pinentry-gnome3/qt may
//      emit CRLF; splitting on `\r?\n` strips the trailing CR that would
//      otherwise become a literal trailing byte in the passphrase.
export function parsePinentryStdout(stdout: string): {
  data?: string;
  cancelled: boolean;
} {
  // Pinentry error code 83886179 is the canonical "user cancelled" signal —
  // surfaces either as a non-zero exit or as an ERR line.
  const cancelled = stdout.includes('ERR 83886179') || stdout.includes('Operation cancelled');

  const dataChunks = stdout
    .split(/\r?\n/)
    .filter(l => l.startsWith('D '))
    .map(l => l.slice(2));

  if (dataChunks.length > 0) {
    return { data: decodeAssuanData(dataChunks.join('')), cancelled };
  }
  return { cancelled };
}

export function findPinentry(): string | null {
  for (const prog of PINENTRY_PROGRAMS) {
    try {
      const result = execFileSync('which', [prog], {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (result.trim()) return prog;
    } catch {
      // Program not found — try the next one.
    }
  }
  return null;
}

export interface PinentryResult {
  value: string;
  passphraseOnDevice: boolean;
}

// CLI-variant policy differs from app-monorepo: we fall back to on-device
// entry instead of rejecting, because `onekey-hw` is used by AI agents that
// can't recover from a thrown error mid-flow. The device screen is always
// a valid second path.
export function promptPassphraseViaPinentry(): Promise<PinentryResult> {
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
        const { data, cancelled } = parsePinentryStdout(stdout ?? '');

        if (error) {
          if (error.killed || cancelled) {
            process.stderr.write(
              '[onekey-hw] Passphrase entry cancelled, falling back to on-device.\n'
            );
            resolve({ value: '', passphraseOnDevice: true });
            return;
          }
          reject(error);
          return;
        }

        if (data !== undefined) {
          resolve({ value: data, passphraseOnDevice: false });
          return;
        }

        if (cancelled) {
          process.stderr.write(
            '[onekey-hw] Passphrase entry cancelled, falling back to on-device.\n'
          );
          resolve({ value: '', passphraseOnDevice: true });
          return;
        }

        // Empty passphrase (OK pressed with no input) — on-device fallback.
        resolve({ value: '', passphraseOnDevice: true });
      }
    );

    child.stdin?.write(commands);
    child.stdin?.end();
  });
}
