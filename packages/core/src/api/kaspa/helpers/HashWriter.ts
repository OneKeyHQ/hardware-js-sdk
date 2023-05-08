import { blake2b } from '@noble/hashes/blake2b';
import BigNumber from 'bignumber.js';
import { Hash } from '@noble/hashes/utils';
import BufferWriter from './BufferWriter';

const TransactionSigningHashKey = Buffer.from('TransactionSigningHash');

class HashWriter {
  private blake2b: Hash<any>;

  bw: BufferWriter;

  hash: {
    update: (buf: Buffer) => void;
    digest: () => Buffer;
  };

  constructor() {
    this.bw = new BufferWriter();
    this.blake2b = blake2b.create({ dkLen: 32, key: TransactionSigningHashKey });
    this.hash = {
      update: (buf: Buffer) => {
        this.bw.write(buf);
        this.blake2b.update(buf);
      },
      digest: () => Buffer.from(this.blake2b.digest()),
    };
  }

  writeUInt8(value: number): void {
    const buf = new BufferWriter();
    buf.writeUInt8(value);
    this.hash.update(buf.toBuffer());
  }

  writeUInt16LE(value: number): void {
    const buf = new BufferWriter();
    buf.writeUInt16LE(value);
    this.hash.update(buf.toBuffer());
  }

  writeUInt32LE(value: number): void {
    const buf = new BufferWriter();
    buf.writeUInt32LE(value);
    this.hash.update(buf.toBuffer());
  }

  writeUInt64LE(value: BigNumber.Value): void {
    const buf = new BufferWriter();
    buf.writeUInt64LE(new BigNumber(value));
    this.hash.update(buf.toBuffer());
  }

  writeVarBytes(buf: Buffer): void {
    this.writeUInt64LE(buf.length);
    this.hash.update(buf);
  }

  writeHash(buf: Buffer): void {
    this.hash.update(buf);
  }

  finalize(): Buffer {
    return this.hash.digest();
  }

  toBuffer(): Buffer {
    return this.bw.toBuffer();
  }
}

export { HashWriter };
