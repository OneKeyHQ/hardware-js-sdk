import { Buffer, installBufferRuntime, toRuntimeBuffer } from '../runtime/buffer';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from '../runtime/crypto';

describe('runtime shims', () => {
  test('preserves an existing global Buffer implementation', () => {
    const globalScope = globalThis as typeof globalThis & {
      Buffer?: typeof Buffer;
    };
    const originalBuffer = globalScope.Buffer;
    const existingBuffer = function ExistingBuffer() {} as unknown as typeof Buffer;

    globalScope.Buffer = existingBuffer;

    try {
      installBufferRuntime();

      expect(globalScope.Buffer).toBe(existingBuffer);
    } finally {
      globalScope.Buffer = originalBuffer;
    }
  });

  test('Buffer.subarray returns a Buffer-compatible view', () => {
    const bytes = Buffer.from([0x12, 0x34, 0x56]);
    const view = bytes.subarray(0, 2);

    expect(Buffer.isBuffer(view)).toBe(true);
    expect(view.readUInt16BE(0)).toBe(0x1234);
  });

  test('repairs Buffer.subarray when the runtime returns a Uint8Array view', () => {
    const originalSubarray = Buffer.prototype.subarray;
    Buffer.prototype.subarray = Uint8Array.prototype.subarray as typeof Buffer.prototype.subarray;

    try {
      installBufferRuntime();
      const bytes = Buffer.from([0x12, 0x34, 0x56]);
      const view = bytes.subarray(0, 2);

      expect(Buffer.isBuffer(view)).toBe(true);
      expect(typeof view.copy).toBe('function');
      expect(typeof view.compare).toBe('function');
      expect(view.readUInt16BE(0)).toBe(0x1234);
    } finally {
      Buffer.prototype.subarray = originalSubarray;
      installBufferRuntime();
    }
  });

  test('normalizes external Uint8Array values into the runtime Buffer', () => {
    const bytes = Uint8Array.from([0x3f, 0x23, 0x23, 0x12, 0x34]);
    const buffer = toRuntimeBuffer(bytes);
    const header = buffer.subarray(0, 3);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(typeof header.compare).toBe('function');
    expect(header.compare(Buffer.from([0x3f, 0x23, 0x23]))).toBe(0);
    expect(buffer.readUInt16BE(3)).toBe(0x1234);
  });

  test('normalizes foreign Buffer-like values even when Buffer.isBuffer returns true', () => {
    const foreignBuffer = Buffer.from([0x3f, 0x23, 0x23, 0x80, 0x60, 0x41]);
    const originalSubarray = foreignBuffer.subarray.bind(foreignBuffer);
    foreignBuffer.subarray = (start?: number, end?: number) =>
      new Uint8Array(originalSubarray(start, end)) as Buffer;

    expect(Buffer.isBuffer(foreignBuffer)).toBe(true);

    const buffer = toRuntimeBuffer(foreignBuffer);
    const header = buffer.subarray(0, 3);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(typeof header.compare).toBe('function');
    expect(header.compare(Buffer.from([0x3f, 0x23, 0x23]))).toBe(0);
  });

  test('crypto shim provides the synchronous APIs used by THP', () => {
    const hash = createHash('sha256').update(Buffer.from('abc')).digest('hex');
    const hash512 = createHash('sha512').update(Buffer.from('abc')).digest('hex');
    const hmac = createHmac('sha256', Buffer.from('key')).update(Buffer.from('abc')).digest('hex');
    const random = randomBytes(32);

    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hash512).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a' +
        '2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    );
    expect(hmac).toBe('9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab');
    expect(Buffer.isBuffer(random)).toBe(true);
    expect(random).toHaveLength(32);
  });

  test('crypto shim supports aes-256-gcm round trips', () => {
    const key = Buffer.alloc(32, 1);
    const iv = Buffer.alloc(12, 2);
    const aad = Buffer.from('aad');
    const plaintext = Buffer.from('hello');
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    expect(encrypted.toString('hex')).toBe('6fb3a52525');
    expect(tag.toString('hex')).toBe('fdf96a2adb727c1f577e1a8c7c6db4d2');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    expect(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString()).toBe('hello');
  });
});
