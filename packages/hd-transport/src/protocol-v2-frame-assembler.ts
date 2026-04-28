import { PROTOCOL_V2_FRAME_MAX_BYTES } from './constants';

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
  private chunks: Uint8Array[] = [];

  private readonly maxFrameBytes: number;

  constructor(maxFrameBytes = PROTOCOL_V2_FRAME_MAX_BYTES) {
    this.maxFrameBytes = maxFrameBytes;
  }

  reset() {
    this.chunks = [];
  }

  push(chunk: Uint8Array): Uint8Array | undefined {
    if (chunk.length === 0) return undefined;

    this.chunks.push(chunk);
    const assembled = concatUint8Arrays(this.chunks);

    if (assembled.length < 3) return undefined;

    if (assembled[0] !== 0x5a) {
      this.reset();
      throw new Error('Invalid Protocol V2 SOF');
    }

    const expectedLen = assembled[1] + assembled[2] * 256;
    if (expectedLen > this.maxFrameBytes) {
      this.reset();
      throw new Error(`Protocol V2 frame too large: ${expectedLen}`);
    }

    if (assembled.length < expectedLen) return undefined;

    const frame = assembled.slice(0, expectedLen);
    this.reset();
    return frame;
  }
}
