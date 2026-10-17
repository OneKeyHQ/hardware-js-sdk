import { HardwareErrorCode, createHwkError } from '../types/errors';

/** Nesting deeper than any wallet payload; bounds the walk's recursion. */
const MAX_CBOR_DEPTH = 64;
/** Larger than any QR or USB payload a wallet sends, including big PSBTs. */
const DEFAULT_MAX_CBOR_BYTES = 8 * 1024 * 1024;

/** Argument bytes for additional info 24, 25, 26 and 27. */
const ARGUMENT_BYTES = [1, 2, 4, 8];

function malformed(reason: string): Error {
  return createHwkError({
    code: HardwareErrorCode.InvalidParams,
    message: `Malformed CBOR payload: ${reason}`,
  });
}

/**
 * Walks CBOR from an untrusted source (a scanned QR code, a device reply) before a third-party
 * decoder sees it. Those decoders read past the end as zero and trust declared lengths, so one
 * indefinite-length header or a huge declared count exhausts memory. This walk accepts only
 * definite lengths that fit in the bytes actually present, bounded nesting, and no trailing bytes.
 */
export function assertBoundedCbor(
  input: Uint8Array,
  maxBytes: number = DEFAULT_MAX_CBOR_BYTES
): void {
  if (input.length === 0) throw malformed('empty');
  if (input.length > maxBytes) throw malformed(`larger than ${maxBytes} bytes`);
  let offset = 0;

  const readArgument = (info: number): number => {
    if (info < 24) return info;
    const size = ARGUMENT_BYTES[info - 24];
    if (offset + size > input.length) throw malformed('truncated length');
    let value = 0;
    for (let i = 0; i < size; i += 1) value = value * 256 + input[offset + i];
    offset += size;
    return value;
  };

  const walkItem = (depth: number): void => {
    if (depth > MAX_CBOR_DEPTH) throw malformed('nested too deeply');
    if (offset >= input.length) throw malformed('truncated item');
    const initial = input[offset];
    offset += 1;
    // High three bits: major type; low five: the additional info.
    const major = Math.floor(initial / 32);
    const info = initial % 32;
    // 31 is an indefinite length (or a stray break); 28-30 are reserved.
    if (info >= 28) throw malformed('indefinite or reserved length');
    const argument = readArgument(info);
    const remaining = input.length - offset;
    if (major === 2 || major === 3) {
      if (argument > remaining) throw malformed('string longer than the payload');
      offset += argument;
    } else if (major === 4 || major === 5) {
      // Every element takes at least one byte; a map holds two per entry.
      const items = major === 5 ? argument * 2 : argument;
      if (items > remaining) throw malformed('container longer than the payload');
      for (let i = 0; i < items; i += 1) walkItem(depth + 1);
    } else if (major === 6) {
      walkItem(depth + 1);
    }
    // 0/1 integers and 7 simple values or floats carry only the argument already read.
  };

  walkItem(0);
  if (offset !== input.length) throw malformed('trailing bytes');
}

/** Hex from an untrusted source, checked as such and then as bounded CBOR. */
export function boundedCborFromHex(hex: string, maxBytes?: number): Buffer {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw malformed('not an even-length hex string');
  const bytes = Buffer.from(hex, 'hex');
  assertBoundedCbor(bytes, maxBytes);
  return bytes;
}
