import { gcm } from '@noble/ciphers/aes';
import { hmac } from '@noble/hashes/hmac';
import { sha256, sha512 } from '@noble/hashes/sha2';

import { Buffer, toRuntimeBuffer } from './buffer';

type BinaryInput = string | Uint8Array | ArrayBuffer;
type DigestEncoding = BufferEncoding | undefined;
type NobleHash = typeof sha256;
type NobleHashInstance = ReturnType<NobleHash['create']>;

const normalizeAlgorithm = (algorithm: string) => algorithm.toLowerCase().replace(/-/g, '');

const getHash = (algorithm: string): NobleHash => {
  switch (normalizeAlgorithm(algorithm)) {
    case 'sha256':
      return sha256;
    case 'sha512':
      return sha512;
    default:
      throw new Error(`Unsupported crypto hash algorithm: ${algorithm}`);
  }
};

const toBytes = (value: BinaryInput, encoding?: BufferEncoding): Buffer => {
  if (typeof value === 'string') {
    return Buffer.from(value, encoding);
  }

  return toRuntimeBuffer(value);
};

const formatDigest = (bytes: Uint8Array, encoding?: DigestEncoding) => {
  const digest = Buffer.from(bytes);
  return encoding ? digest.toString(encoding) : digest;
};

class NobleHashShim {
  private readonly ctx: NobleHashInstance;

  constructor(algorithm: string) {
    this.ctx = getHash(algorithm).create();
  }

  update(data: BinaryInput, inputEncoding?: BufferEncoding) {
    this.ctx.update(toBytes(data, inputEncoding));
    return this;
  }

  digest(encoding?: DigestEncoding) {
    return formatDigest(this.ctx.digest(), encoding);
  }
}

class NobleHmacShim {
  private readonly ctx: ReturnType<typeof hmac.create>;

  constructor(algorithm: string, key: BinaryInput) {
    this.ctx = hmac.create(getHash(algorithm), toBytes(key));
  }

  update(data: BinaryInput, inputEncoding?: BufferEncoding) {
    this.ctx.update(toBytes(data, inputEncoding));
    return this;
  }

  digest(encoding?: DigestEncoding) {
    return formatDigest(this.ctx.digest(), encoding);
  }
}

class NobleAesGcmCipherShim {
  private aad = Buffer.alloc(0);

  private readonly chunks: Buffer[] = [];

  private authTag: Buffer | undefined;

  constructor(private readonly key: Buffer, private readonly iv: Buffer) {}

  setAAD(aad: BinaryInput) {
    this.aad = toBytes(aad);
    return this;
  }

  update(data: BinaryInput, inputEncoding?: BufferEncoding) {
    this.chunks.push(toBytes(data, inputEncoding));
    return Buffer.alloc(0);
  }

  final() {
    const sealed = gcm(this.key, this.iv, this.aad).encrypt(Buffer.concat(this.chunks));
    this.authTag = Buffer.from(sealed.subarray(sealed.length - 16));
    return Buffer.from(sealed.subarray(0, sealed.length - 16));
  }

  getAuthTag() {
    if (!this.authTag) {
      throw new Error('Authentication tag is not available before final()');
    }
    return this.authTag;
  }
}

class NobleAesGcmDecipherShim {
  private aad = Buffer.alloc(0);

  private readonly chunks: Buffer[] = [];

  private authTag: Buffer | undefined;

  constructor(private readonly key: Buffer, private readonly iv: Buffer) {}

  setAAD(aad: BinaryInput) {
    this.aad = toBytes(aad);
    return this;
  }

  setAuthTag(authTag: BinaryInput) {
    this.authTag = toBytes(authTag);
    return this;
  }

  update(data: BinaryInput, inputEncoding?: BufferEncoding) {
    this.chunks.push(toBytes(data, inputEncoding));
    return Buffer.alloc(0);
  }

  final() {
    if (!this.authTag) {
      throw new Error('Authentication tag is required before final()');
    }
    return Buffer.from(
      gcm(this.key, this.iv, this.aad).decrypt(Buffer.concat([...this.chunks, this.authTag]))
    );
  }
}

const assertAes256Gcm = (algorithm: string) => {
  if (normalizeAlgorithm(algorithm) !== 'aes256gcm') {
    throw new Error(`Unsupported cipher algorithm: ${algorithm}`);
  }
};

export const createHash = (algorithm: string) => new NobleHashShim(algorithm);

export const createHmac = (algorithm: string, key: BinaryInput) =>
  new NobleHmacShim(algorithm, key);

export const createCipheriv = (algorithm: string, key: BinaryInput, iv: BinaryInput) => {
  assertAes256Gcm(algorithm);
  return new NobleAesGcmCipherShim(toBytes(key), toBytes(iv));
};

export const createDecipheriv = (algorithm: string, key: BinaryInput, iv: BinaryInput) => {
  assertAes256Gcm(algorithm);
  return new NobleAesGcmDecipherShim(toBytes(key), toBytes(iv));
};

export function randomBytes(size: number): Buffer;
export function randomBytes(
  size: number,
  callback: (error: Error | null, bytes: Buffer) => void
): void;
export function randomBytes(size: number, callback?: (error: Error | null, bytes: Buffer) => void) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    const error = new Error('Secure random source is unavailable');
    if (callback) {
      callback(error, Buffer.alloc(0));
      return;
    }
    throw error;
  }

  const entropy = new Uint8Array(size);
  cryptoApi.getRandomValues(entropy);
  const bytes = Buffer.from(entropy);
  if (callback) {
    callback(null, bytes);
    return;
  }
  return bytes;
}

export default {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
};
