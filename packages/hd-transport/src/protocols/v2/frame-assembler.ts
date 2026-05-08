import { PROTOCOL_V2_FRAME_MAX_BYTES } from '../../constants';

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export class ProtocolV2FrameAssembler {
  private buffer = new Uint8Array(0);

  private readonly maxFrameBytes: number;

  constructor(maxFrameBytes = PROTOCOL_V2_FRAME_MAX_BYTES) {
    this.maxFrameBytes = maxFrameBytes;
  }

  reset() {
    this.buffer = new Uint8Array(0);
  }

  push(chunk: Uint8Array): Uint8Array | undefined {
    if (chunk.length > 0) {
      this.buffer = concatUint8Arrays([this.buffer, chunk]);
    }

    if (this.buffer.length < 3) return undefined;

    if (this.buffer[0] !== 0x5a) {
      this.reset();
      throw new Error('Invalid Protocol V2 SOF');
    }

    const expectedLen = this.buffer[1] + this.buffer[2] * 256;
    if (expectedLen > this.maxFrameBytes) {
      this.reset();
      throw new Error(`Protocol V2 frame too large: ${expectedLen}`);
    }

    if (this.buffer.length < expectedLen) return undefined;

    const frame = this.buffer.slice(0, expectedLen);
    this.buffer = this.buffer.slice(expectedLen);
    return frame;
  }
}
