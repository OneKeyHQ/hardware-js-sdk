import { PROTOCOL_V2_FRAME_MAX_BYTES } from '../../constants';
import { PROTO_HEAD_CRC_SIZE, PROTO_HEAD_SOF, PROTO_PRE_HEAD_SIZE } from './constants';
import { crc8 } from './crc8';
import { ProtocolV2LinkError } from './errors';

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
    this.append(chunk);
    return this.extractFrame();
  }

  /**
   * Append a chunk (optional) and extract every complete frame currently
   * buffered. Same validation/throw semantics as push(); push() stays
   * backward compatible for callers that drain one frame at a time.
   */
  drain(chunk: Uint8Array = new Uint8Array(0)): Uint8Array[] {
    this.append(chunk);
    const frames: Uint8Array[] = [];
    for (;;) {
      const frame = this.extractFrame();
      if (!frame) break;
      frames.push(frame);
    }
    return frames;
  }

  private append(chunk: Uint8Array) {
    if (chunk.length > 0) {
      this.buffer = concatUint8Arrays([this.buffer, chunk]);
    }
  }

  private extractFrame(): Uint8Array | undefined {
    if (this.buffer.length < 3) return undefined;

    if (this.buffer[0] !== PROTO_HEAD_SOF) {
      this.reset();
      throw new ProtocolV2LinkError('frame', 'Invalid Protocol V2 SOF');
    }

    const expectedLen = this.buffer[1] + this.buffer[2] * 256;
    if (expectedLen < PROTO_HEAD_CRC_SIZE) {
      // A declared length below the 8-byte frame overhead can never become a
      // complete frame: without resetting, this poison prefix would stay in
      // the buffer forever and deadlock the caller's drain loop.
      this.reset();
      throw new ProtocolV2LinkError('frame', `Protocol V2 frame length too small: ${expectedLen}`);
    }
    if (expectedLen > this.maxFrameBytes) {
      this.reset();
      throw new ProtocolV2LinkError('frame', `Protocol V2 frame too large: ${expectedLen}`);
    }

    if (this.buffer.length < PROTO_PRE_HEAD_SIZE) return undefined;

    // Validate the pre-header CRC (byte 3 covers bytes 0-2) as soon as the
    // first 4 bytes arrive, so a corrupted length field fails fast instead of
    // waiting for bytes that will never come.
    const expectedHeaderCrc = crc8(this.buffer, 3);
    if (this.buffer[3] !== expectedHeaderCrc) {
      this.reset();
      throw new ProtocolV2LinkError(
        'frame',
        `Protocol V2 header CRC mismatch: expected 0x${expectedHeaderCrc
          .toString(16)
          .padStart(2, '0')}`
      );
    }

    if (this.buffer.length < expectedLen) return undefined;

    const frame = this.buffer.slice(0, expectedLen);
    this.buffer = this.buffer.slice(expectedLen);
    return frame;
  }
}
