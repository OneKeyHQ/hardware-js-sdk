import { Buffer } from 'buffer';
// eslint-disable-next-line import/no-unresolved
import { configureTextEncoding } from '@bufbuild/protobuf/wire';

const TEXT_ENCODING_SYMBOL = Symbol.for('@bufbuild/protobuf/text-encoding');

const isContinuationByte = (b: number | undefined): boolean =>
  b !== undefined && b >= 0x80 && b <= 0xbf;

const assertValidUtf8 = (bytes: Uint8Array): void => {
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    if (b0 <= 0x7f) {
      i += 1;
    } else if (b0 >= 0xc2 && b0 <= 0xdf) {
      if (!isContinuationByte(bytes[i + 1])) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 2;
    } else if (b0 === 0xe0) {
      const b1 = bytes[i + 1];
      if (b1 === undefined || b1 < 0xa0 || b1 > 0xbf || !isContinuationByte(bytes[i + 2])) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 3;
    } else if ((b0 >= 0xe1 && b0 <= 0xec) || b0 === 0xee || b0 === 0xef) {
      if (!isContinuationByte(bytes[i + 1]) || !isContinuationByte(bytes[i + 2])) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 3;
    } else if (b0 === 0xed) {
      const b1 = bytes[i + 1];
      if (b1 === undefined || b1 < 0x80 || b1 > 0x9f || !isContinuationByte(bytes[i + 2])) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 3;
    } else if (b0 === 0xf0) {
      const b1 = bytes[i + 1];
      if (
        b1 === undefined ||
        b1 < 0x90 ||
        b1 > 0xbf ||
        !isContinuationByte(bytes[i + 2]) ||
        !isContinuationByte(bytes[i + 3])
      ) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 4;
    } else if (b0 >= 0xf1 && b0 <= 0xf3) {
      if (
        !isContinuationByte(bytes[i + 1]) ||
        !isContinuationByte(bytes[i + 2]) ||
        !isContinuationByte(bytes[i + 3])
      ) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 4;
    } else if (b0 === 0xf4) {
      const b1 = bytes[i + 1];
      if (
        b1 === undefined ||
        b1 < 0x80 ||
        b1 > 0x8f ||
        !isContinuationByte(bytes[i + 2]) ||
        !isContinuationByte(bytes[i + 3])
      ) {
        throw new TypeError('The encoded data was not valid for encoding utf-8');
      }
      i += 4;
    } else {
      throw new TypeError('The encoded data was not valid for encoding utf-8');
    }
  }
};

/**
 * React Native (Hermes) hosts may omit `globalThis.TextDecoder` or `TextEncoder`.
 * `@bufbuild/protobuf` initializes both eagerly on the first `toBinary`/`fromBinary`
 * call unless `configureTextEncoding` has been registered. Fall back to `Buffer`
 * whenever either WHATWG global is unavailable.
 */
export const ensureTextEncoding = (): void => {
  const g = globalThis as Record<PropertyKey, unknown>;
  if (g[TEXT_ENCODING_SYMBOL] !== undefined) {
    return;
  }
  if (
    typeof globalThis.TextEncoder === 'function' &&
    typeof globalThis.TextDecoder === 'function'
  ) {
    const te = new globalThis.TextEncoder();
    const td = new globalThis.TextDecoder('utf-8', { ignoreBOM: true });
    let tdStrict: TextDecoder | undefined;
    configureTextEncoding({
      encodeUtf8(text: string): Uint8Array {
        return te.encode(text);
      },
      decodeUtf8(bytes: Uint8Array, strict?: boolean): string {
        if (strict) {
          if (tdStrict === undefined) {
            tdStrict = new globalThis.TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
          }
          return tdStrict.decode(bytes);
        }
        return td.decode(bytes);
      },
      checkUtf8(text: string): boolean {
        try {
          encodeURIComponent(text);
          return true;
        } catch {
          return false;
        }
      },
    });
    return;
  }
  configureTextEncoding({
    encodeUtf8(text: string): Uint8Array {
      const buf = Buffer.from(text, 'utf8');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    },
    decodeUtf8(bytes: Uint8Array, strict?: boolean): string {
      if (strict) {
        assertValidUtf8(bytes);
      }
      return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('utf8');
    },
    checkUtf8(text: string): boolean {
      try {
        encodeURIComponent(text);
        return true;
      } catch {
        return false;
      }
    },
  });
};

// Configure text encoding eagerly when this module is evaluated so any subsequent
// @bufbuild/protobuf descriptor initialization succeeds on runtimes lacking TextEncoder/TextDecoder.
ensureTextEncoding();
