import { PROTO_DATA_TYPE_PACKET, PROTO_HEAD_CRC_SIZE, PROTO_HEAD_SOF } from './constants';
import { crc8 } from './crc8';
import { PROTOCOL_V2_FRAME_MAX_BYTES } from '../../constants';

// Default sequence number when callers do not manage one themselves.
// Stateful per-session sequencing lives in ProtocolV2Session (session.ts),
// which advances the counter via nextProtoSeq() and passes it in explicitly.
const PROTO_SEQ_DEFAULT = 1;

/**
 * Advance a Protocol V2 sequence counter: 1-255, wraps around skipping 0.
 */
export function nextProtoSeq(current: number): number {
  return current >= 255 ? 1 : current + 1;
}

/**
 * Build a raw Protocol V2 frame (0x5A framing).
 *
 * Frame layout (PROTO_HEAD_CRC_SIZE = 8 overhead bytes):
 *   [0]      SOF  = 0x5A
 *   [1]      frameLen low byte
 *   [2]      frameLen high byte
 *   [3]      CRC8 of bytes 0-2 (pre-header CRC)
 *   [4]      router
 *   [5]      attr = ((packetSrc & 0x0F) << 2) | dataType
 *   [6]      seq  (1-255, wraps skipping 0)
 *   [7..N-2] payload
 *   [N-1]    CRC8 of bytes 0 to N-2 (frame CRC)
 */
export function encodeFrame(
  payload: Uint8Array | null,
  packetSrc?: number,
  router?: number,
  seq?: number
): Uint8Array {
  const resolvedPacketSrc = packetSrc ?? 0;
  const resolvedRouter = router ?? 0;
  const resolvedSeq = seq ?? PROTO_SEQ_DEFAULT;
  if (!Number.isInteger(resolvedSeq) || resolvedSeq < 1 || resolvedSeq > 255) {
    throw new Error(`Protocol V2 seq out of range (1-255): ${resolvedSeq}`);
  }
  const payloadLen = payload ? payload.length : 0;
  const frameLen = payloadLen + PROTO_HEAD_CRC_SIZE;
  if (frameLen > PROTOCOL_V2_FRAME_MAX_BYTES) {
    throw new Error(`Protocol V2 frame too large: ${frameLen} > ${PROTOCOL_V2_FRAME_MAX_BYTES}`);
  }
  const frame = new Uint8Array(frameLen);

  frame[0] = PROTO_HEAD_SOF;
  frame[1] = frameLen % 256;
  frame[2] = Math.floor(frameLen / 256) % 256;
  frame[3] = 0; // placeholder — filled in below
  frame[4] = resolvedRouter % 256;
  frame[5] = (resolvedPacketSrc % 16) * 4 + (PROTO_DATA_TYPE_PACKET % 4);
  frame[6] = resolvedSeq;

  // CRC8 over first 3 bytes (SOF + length)
  frame[3] = crc8(frame, 3);

  if (payload && payloadLen > 0) {
    frame.set(payload, 7);
  }

  // CRC8 over entire frame except last byte
  frame[frameLen - 1] = crc8(frame, frameLen - 1);

  return frame;
}

/**
 * Build a Protocol V2 frame carrying a protobuf message.
 *
 * Payload layout:
 *   [0-1]  messageTypeId as little-endian uint16
 *   [2..]  protobuf-encoded message bytes
 */
export function encodeProtobufFrame(
  messageTypeId: number,
  pbPayload: Uint8Array,
  packetSrc?: number,
  router?: number,
  seq?: number
): Uint8Array {
  const payload = new Uint8Array(2 + pbPayload.length);
  payload[0] = messageTypeId % 256;
  payload[1] = Math.floor(messageTypeId / 256) % 256;
  payload.set(pbPayload, 2);
  return encodeFrame(payload, packetSrc, router, seq);
}
