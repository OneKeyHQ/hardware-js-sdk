import {
  PROTO_DATA_TYPE_ACK,
  PROTO_DATA_TYPE_PACKET,
  PROTO_HEAD_CRC_SIZE,
  PROTO_HEAD_SOF,
} from './constants';
import { crc8 } from './crc8';

export interface ProtoV2Frame {
  /** Little-endian message type ID */
  messageTypeId: number;
  /** Raw protobuf-encoded payload (bytes after the 2-byte messageTypeId) */
  pbPayload: Uint8Array;
  /** Sequence number from the frame header */
  seq: number;
  /** Routing channel from the frame header */
  router: number;
  /** Packet source from the frame header */
  packetSrc: number;
  /** Packet or ACK discriminator from the frame header */
  dataType: number;
}

export type ProtoV2FrameHeader = {
  frameLen: number;
  router: number;
  packetSrc: number;
  dataType: number;
  seq: number;
};

export function inspectFrameHeader(data: Uint8Array): ProtoV2FrameHeader {
  if (data.length < PROTO_HEAD_CRC_SIZE) {
    throw new Error(`Protocol V2 frame too short: ${data.length} bytes`);
  }

  if (data[0] !== PROTO_HEAD_SOF) {
    throw new Error(
      `Invalid SOF byte: expected 0x5A, got 0x${data[0].toString(16).padStart(2, '0')}`
    );
  }

  const frameLen = data[1] + data[2] * 256;

  if (data.length !== frameLen) {
    throw new Error(
      `Protocol V2 frame length mismatch: expected ${frameLen} bytes, got ${data.length}`
    );
  }

  const expectedHeaderCrc = crc8(data, 3);
  if (data[3] !== expectedHeaderCrc) {
    throw new Error(
      `Header CRC mismatch: expected 0x${expectedHeaderCrc
        .toString(16)
        .padStart(2, '0')}, got 0x${data[3].toString(16).padStart(2, '0')}`
    );
  }

  const expectedFrameCrc = crc8(data, frameLen - 1);
  if (data[frameLen - 1] !== expectedFrameCrc) {
    throw new Error(
      `Frame CRC mismatch: expected 0x${expectedFrameCrc
        .toString(16)
        .padStart(2, '0')}, got 0x${data[frameLen - 1].toString(16).padStart(2, '0')}`
    );
  }

  // eslint-disable-next-line no-bitwise
  const dataType = data[5] & 0x03;
  // eslint-disable-next-line no-bitwise
  const packetSrc = (data[5] >> 2) & 0x0f;
  const seq = data[6];
  if (seq === 0) {
    throw new Error('Invalid Protocol V2 sequence: 0 is reserved');
  }

  return {
    frameLen,
    router: data[4],
    packetSrc,
    dataType,
    seq,
  };
}

export function isAckFrame(data: Uint8Array): boolean {
  // eslint-disable-next-line no-bitwise
  if (data.length < 6 || (data[5] & 0x03) !== PROTO_DATA_TYPE_ACK) {
    return false;
  }

  const header = inspectFrameHeader(data);
  if (header.frameLen !== PROTO_HEAD_CRC_SIZE) {
    throw new Error(`Invalid Protocol V2 ACK frame length: ${header.frameLen}`);
  }
  return true;
}

/**
 * Parse and validate a Protocol V2 response frame.
 *
 * Validates:
 *   - SOF byte (0x5A)
 *   - Header CRC (bytes 0-2)
 *   - Frame CRC (full frame except last byte)
 *
 * Returns the decoded messageTypeId, raw protobuf payload, and sequence number.
 */
export function decodeFrame(data: Uint8Array): ProtoV2Frame {
  const { frameLen, router, packetSrc, dataType, seq } = inspectFrameHeader(data);
  if (dataType !== PROTO_DATA_TYPE_PACKET) {
    throw new Error(`Invalid Protocol V2 data type: expected packet, got ${dataType}`);
  }
  // Payload spans bytes 7 to frameLen-2 (inclusive), excluding final CRC byte
  const payloadData = data.slice(7, frameLen - 1);

  if (payloadData.length < 2) {
    throw new Error(`Protocol V2 payload too short (need >=2 bytes for messageTypeId)`);
  }

  const messageTypeId = payloadData[0] + payloadData[1] * 256;
  const pbPayload = payloadData.slice(2);

  return { messageTypeId, pbPayload, seq, router, packetSrc, dataType };
}
