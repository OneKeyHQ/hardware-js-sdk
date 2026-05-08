import ByteBuffer from 'bytebuffer';

import { encode as encodeProtobuf } from '../../serialization/protobuf';
import { encodeEnvelope } from './encode';
import { createMessageFromName } from '../../serialization/protobuf/messages';
import { PROTOCOL_V1_CHUNK_PAYLOAD_SIZE, PROTOCOL_V1_REPORT_ID } from '../../constants';

import type { Root } from 'protobufjs/light';

export function encodeEnvelopeMessage(messages: Root, name: string, data: Record<string, unknown>) {
  const { Message, messageType } = createMessageFromName(messages, name);

  const buffer = encodeProtobuf(Message, data);
  return encodeEnvelope(buffer, {
    addTrezorHeaders: false,
    chunked: false,
    messageType,
  });
}

export const encodeMessageChunks = (
  messages: Root,
  name: string,
  data: Record<string, unknown>
) => {
  const { Message, messageType } = createMessageFromName(messages, name);
  const buffer = encodeProtobuf(Message, data);
  return encodeEnvelope(buffer, {
    addTrezorHeaders: true,
    chunked: true,
    messageType,
  });
};

export const encodeTransportPackets = (
  messages: Root,
  name: string,
  data: Record<string, unknown>
) => {
  const encodeBuffers = encodeMessageChunks(messages, name, data);

  const outBuffers: ByteBuffer[] = [];

  for (const buf of encodeBuffers) {
    const chunkBuffer = new ByteBuffer(PROTOCOL_V1_CHUNK_PAYLOAD_SIZE + 1);
    chunkBuffer.writeByte(PROTOCOL_V1_REPORT_ID);
    chunkBuffer.append(buf);
    chunkBuffer.reset();
    outBuffers.push(chunkBuffer);
  }

  return outBuffers;
};
