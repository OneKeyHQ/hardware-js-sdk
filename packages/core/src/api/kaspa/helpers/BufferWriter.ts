import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';

function isBuffer(arg: any) {
  return Buffer.isBuffer(arg) || arg instanceof Uint8Array;
}

function bigNumberToBuffer(bn: BigNumber, options: { size: number }): Buffer {
  const hex = bn.toString(16);
  const paddedHex = hex.padStart(options.size * 2, '0');
  return Buffer.from(paddedHex, 'hex');
}

class BufferWriter {
  bufLen: number;

  // @ts-expect-error
  bufs: Buffer[];

  constructor(obj?: Partial<BufferWriter>) {
    this.bufLen = 0;
    if (obj) {
      this.set(obj);
    } else {
      this.bufs = [];
    }
  }

  public set(obj: Partial<BufferWriter>): this {
    this.bufs = obj.bufs || this.bufs || [];
    this.bufLen = this.bufs.reduce((prev, buf) => prev + buf.length, 0);
    return this;
  }

  public toBuffer(): Buffer {
    return this.concat();
  }

  public concat(): Buffer {
    return Buffer.concat(this.bufs, this.bufLen);
  }

  public write(buf: Buffer): this {
    if (!isBuffer(buf)) throw new Error('BufferWriter.write: Invalid type');
    this.bufs.push(buf);
    this.bufLen += buf.length;
    return this;
  }

  public writeReverse(buf: Buffer): this {
    if (!isBuffer(buf)) throw new Error('BufferWriter.write: Invalid type');
    this.bufs.push(buf.reverse());
    this.bufLen += buf.length;
    return this;
  }

  public writeVarBytes(buf: Buffer): this {
    if (!isBuffer(buf)) throw new Error('BufferWriter.write: Invalid type');
    this.writeUInt64LE(new BigNumber(buf.length));
    this.write(buf);
    return this;
  }

  public writeUInt8(n: number): this {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(n, 0);
    this.write(buf);
    return this;
  }

  public writeUInt16BE(n: number): this {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(n, 0);
    this.write(buf);
    return this;
  }

  public writeUInt16LE(n: number): this {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(n, 0);
    this.write(buf);
    return this;
  }

  public writeUInt32BE(n: number): this {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(n, 0);
    this.write(buf);
    return this;
  }

  public writeInt32LE(n: number): this {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(n, 0);
    this.write(buf);
    return this;
  }

  public writeUInt32LE(n: number): this {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(n, 0);
    this.write(buf);
    return this;
  }

  public writeUInt64BEBN(bn: BigNumber): this {
    const buf = bigNumberToBuffer(bn, { size: 8 });
    this.write(buf);
    return this;
  }

  public writeUInt64LE(bn: BigNumber): this {
    const buf = bigNumberToBuffer(bn, { size: 8 });
    this.writeReverse(buf);
    return this;
  }

  public writeVarintNum(n: number): this {
    const buf = BufferWriter.varintBufNum(n);
    this.write(buf);
    return this;
  }

  public writeVarintBN(bn: BigNumber): this {
    const buf = BufferWriter.varintBufBN(bn);
    this.write(buf);
    return this;
  }

  public static varintBufNum(n: number): Buffer {
    let buf: Buffer;
    if (n < 253) {
      buf = Buffer.alloc(1);
      buf.writeUInt8(n, 0);
    } else if (n < 0x10000) {
      buf = Buffer.alloc(1 + 2);
      buf.writeUInt8(253, 0);
      buf.writeUInt16LE(n, 1);
    } else if (n < 0x100000000) {
      buf = Buffer.alloc(1 + 4);
      buf.writeUInt8(254, 0);
      buf.writeUInt32LE(n, 1);
    } else {
      buf = Buffer.alloc(1 + 8);
      buf.writeUInt8(255, 0);
      // eslint-disable-next-line no-bitwise
      buf.writeInt32LE(n & -1, 1);
      buf.writeUInt32LE(Math.floor(n / 0x100000000), 5);
    }
    return buf;
  }

  public static varintBufBN(bn: BigNumber): Buffer {
    let buf: Buffer;
    const n = bn.toNumber();
    if (n < 253) {
      buf = Buffer.alloc(1);
      buf.writeUInt8(n, 0);
    } else if (n < 0x10000) {
      buf = Buffer.alloc(1 + 2);
      buf.writeUInt8(253, 0);
      buf.writeUInt16LE(n, 1);
    } else if (n < 0x100000000) {
      buf = Buffer.alloc(1 + 4);
      buf.writeUInt8(254, 0);
      buf.writeUInt32LE(n, 1);
    } else {
      const bw = new BufferWriter();
      bw.writeUInt8(255);
      bw.writeUInt64LE(bn);
      buf = bw.concat();
    }
    return buf;
  }
}

export default BufferWriter;
