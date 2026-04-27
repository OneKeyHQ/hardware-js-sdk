import { PROTO_DATA_TYPE_PACKET, PROTO_HEAD_CRC_SIZE, PROTO_HEAD_SOF } from './constants';
import { crc8 } from './crc8';

// Per-session sequence counter; increments on each frame, never 0
let protoSeq = 0;

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
export function buildProtoV2Frame(
  payload: Uint8Array | null,
  packetSrc = 0,
  router = 0
): Uint8Array {
  const payloadLen = payload ? payload.length : 0;
  const frameLen = payloadLen + PROTO_HEAD_CRC_SIZE;
  const frame = new Uint8Array(frameLen);

  // Advance sequence counter (skip 0)
  protoSeq = protoSeq >= 255 ? 1 : protoSeq + 1;

  frame[0] = PROTO_HEAD_SOF;
  frame[1] = frameLen % 256;
  frame[2] = Math.floor(frameLen / 256) % 256;
  frame[3] = 0; // placeholder — filled in below
  frame[4] = router % 256;
  frame[5] = (packetSrc % 16) * 4 + (PROTO_DATA_TYPE_PACKET % 4);
  frame[6] = protoSeq;

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
 *   [0-1]  msgType as little-endian uint16
 *   [2..]  protobuf-encoded message bytes
 */
export function buildPbFrame(
  msgType: number,
  pbPayload: Uint8Array,
  packetSrc = 0,
  router = 0
): Uint8Array {
  const payload = new Uint8Array(2 + pbPayload.length);
  payload[0] = msgType % 256;
  payload[1] = Math.floor(msgType / 256) % 256;
  payload.set(pbPayload, 2);
  return buildProtoV2Frame(payload, packetSrc, router);
}
