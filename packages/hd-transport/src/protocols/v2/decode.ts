import { PROTO_HEAD_CRC_SIZE, PROTO_HEAD_SOF } from './constants';
import { crc8 } from './crc8';

export interface ProtoV2Frame {
  /** Little-endian message type ID */
  msgType: number;
  /** Raw protobuf-encoded payload (bytes after the 2-byte msgType) */
  pbPayload: Uint8Array;
  /** Sequence number from the frame header */
  seq: number;
}

/**
 * Parse and validate a Protocol V2 response frame.
 *
 * Validates:
 *   - SOF byte (0x5A)
 *   - Header CRC (bytes 0-2)
 *   - Frame CRC (full frame except last byte)
 *
 * Returns the decoded msgType, raw protobuf payload, and sequence number.
 */
export function decodeFrame(data: Uint8Array): ProtoV2Frame {
  if (data.length < PROTO_HEAD_CRC_SIZE) {
    throw new Error(`Protocol V2 frame too short: ${data.length} bytes`);
  }

  if (data[0] !== PROTO_HEAD_SOF) {
    throw new Error(
      `Invalid SOF byte: expected 0x5A, got 0x${data[0].toString(16).padStart(2, '0')}`
    );
  }

  const frameLen = data[1] + data[2] * 256;

  if (data.length < frameLen) {
    throw new Error(`Frame truncated: expected ${frameLen} bytes, got ${data.length}`);
  }

  // Verify pre-header CRC (bytes 0-2)
  const expectedHeaderCrc = crc8(data, 3);
  if (data[3] !== expectedHeaderCrc) {
    throw new Error(
      `Header CRC mismatch: expected 0x${expectedHeaderCrc
        .toString(16)
        .padStart(2, '0')}, got 0x${data[3].toString(16).padStart(2, '0')}`
    );
  }

  // Verify frame CRC (all bytes except last)
  const expectedFrameCrc = crc8(data, frameLen - 1);
  if (data[frameLen - 1] !== expectedFrameCrc) {
    throw new Error(
      `Frame CRC mismatch: expected 0x${expectedFrameCrc
        .toString(16)
        .padStart(2, '0')}, got 0x${data[frameLen - 1].toString(16).padStart(2, '0')}`
    );
  }

  const seq = data[6];
  // Payload spans bytes 7 to frameLen-2 (inclusive), excluding final CRC byte
  const payloadData = data.slice(7, frameLen - 1);

  if (payloadData.length < 2) {
    throw new Error(`Protocol V2 payload too short (need ≥2 bytes for msgType)`);
  }

  const msgType = payloadData[0] + payloadData[1] * 256;
  const pbPayload = payloadData.slice(2);

  return { msgType, pbPayload, seq };
}
