/**
 * Ledger wrapper over adapter-core's log summarizer: adds PSBT input/output counts and the
 * unsigned txid, which need bitcoinjs-lib.
 */
import { summarizeForLog as summarizeForLogCore } from '@onekeyfe/hwk-adapter-core';
import { Psbt, Transaction } from 'bitcoinjs-lib';

import type { LogPayloadDescriber, LogSummaryOptions } from '@onekeyfe/hwk-adapter-core';

const HEX_RE = /^(0x)?[0-9a-fA-F]+$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function parsePsbt(input: string | Uint8Array): Psbt | undefined {
  if (typeof input !== 'string') return Psbt.fromBuffer(input);
  if (HEX_RE.test(input)) return Psbt.fromHex(input.replace(/^0x/i, ''));
  if (BASE64_RE.test(input)) return Psbt.fromBase64(input);
  return undefined;
}

export const describePsbtForLog: LogPayloadDescriber = (key, value) => {
  if (key !== 'psbt') return undefined;
  try {
    const psbt = parsePsbt(value);
    if (!psbt) return undefined;
    const unsignedTx = Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
    return `inputs=${psbt.inputCount} outputs=${psbt.txOutputs.length} txid=${unsignedTx.getId()}`;
  } catch {
    return undefined;
  }
};

/** JSON-safe, log-safe summary of `value`. Never throws. */
export function summarizeForLog(
  value: unknown,
  options: Omit<LogSummaryOptions, 'describePayload'> = {}
): unknown {
  return summarizeForLogCore(value, { ...options, describePayload: describePsbtForLog });
}
