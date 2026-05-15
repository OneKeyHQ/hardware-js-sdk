import ByteBuffer from 'bytebuffer';

import {
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_ENVELOPE_HEADER_SIZE,
  PROTOCOL_V1_HEADER_BYTE,
} from '../../constants';

type Options<Chunked> = {
  chunked: Chunked;
  addTrezorHeaders: boolean;
  messageType: number;
};

function encodeEnvelope(data: ByteBuffer, options: Options<true>): Buffer[];
function encodeEnvelope(data: ByteBuffer, options: Options<false>): Buffer;
function encodeEnvelope(data: any, options: any): any {
  const { addTrezorHeaders, chunked, messageType } = options;
  const fullSize =
    (addTrezorHeaders ? PROTOCOL_V1_ENVELOPE_HEADER_SIZE : PROTOCOL_V1_ENVELOPE_HEADER_SIZE - 2) +
    Number(data.limit);

  const encodedByteBuffer = new ByteBuffer(fullSize);

  if (addTrezorHeaders) {
    // 2*1 byte
    encodedByteBuffer.writeByte(PROTOCOL_V1_HEADER_BYTE);
    encodedByteBuffer.writeByte(PROTOCOL_V1_HEADER_BYTE);
  }

  // 2 bytes
  encodedByteBuffer.writeUint16(messageType);

  // 4 bytes (so 8 in total)
  encodedByteBuffer.writeUint32(data.limit);

  // then put in the actual message
  encodedByteBuffer.append(data.buffer);

  encodedByteBuffer.reset();

  if (chunked === false) {
    return encodedByteBuffer;
  }

  const result: Buffer[] = [];
  const size = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE;

  // How many pieces will there actually be
  const count = Math.floor((encodedByteBuffer.limit - 1) / size) + 1 || 1;

  // slice and dice
  for (let i = 0; i < count; i++) {
    const start = i * size;
    const end = Math.min((i + 1) * size, encodedByteBuffer.limit);
    const slice = encodedByteBuffer.slice(start, end);
    slice.compact();
    result.push(slice.buffer);
  }

  return result;
}

export { encodeEnvelope };
