import ByteBuffer from 'bytebuffer';

import { encodeEnvelopeMessage, encodeMessageChunks, encodeTransportPackets } from './v1/packets';
import { decodeFirstChunk } from './v1/decode';
import { decodeMessage as decodeV1Message } from './v1/receive';
import { createMessageFromName, createMessageFromType } from '../serialization/protobuf/messages';
import { encode as encodeProtobuf } from '../serialization/protobuf/encode';
import { decode as decodeProtobuf } from '../serialization/protobuf/decode';
import { decodeFrame as decodeV2Frame, encodeProtobufFrame } from './v2';

import type { Root } from 'protobufjs/light';

export const PROTOCOL_V2_SYS_MESSAGE_THRESHOLD = 60000;

type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

type ProtocolV2FrameOptions = {
  packetSrc?: number;
  router?: number;
};

const resolveProtocolV2EncodeSchema = (name: string, schemas: ProtocolV2Schemas) => {
  try {
    schemas.protocolV2.lookupType(name);
    return schemas.protocolV2;
  } catch {
    throw new Error(`Protocol V2 message "${name}" is not defined in Protocol V2 schema`);
  }
};

const createProtocolV2MessageFromType = (msgType: number, schemas: ProtocolV2Schemas) => {
  try {
    return createMessageFromType(schemas.protocolV2, msgType);
  } catch {
    return createMessageFromType(schemas.protocolV1, msgType);
  }
};

export const ProtocolV1 = {
  encodeEnvelope: encodeEnvelopeMessage,
  encodeMessageChunks,
  encodeTransportPackets,
  decodeFirstChunk,

  decodeMessage: decodeV1Message,
};

export const ProtocolV2 = {
  encodeFrame(
    schemas: ProtocolV2Schemas,
    name: string,
    data: Record<string, unknown>,
    options: ProtocolV2FrameOptions = {}
  ) {
    const encodeMessages = resolveProtocolV2EncodeSchema(name, schemas);
    const { Message, messageType } = createMessageFromName(encodeMessages, name);
    const pbBuffer = encodeProtobuf(Message, data);
    pbBuffer.reset();
    const rawPbBuffer = pbBuffer.toBuffer() as unknown as ArrayBuffer;
    const pbBytes = new Uint8Array(rawPbBuffer);

    return encodeProtobufFrame(messageType, pbBytes, options.packetSrc, options.router);
  },

  decodeFrame(schemas: ProtocolV2Schemas, frame: Uint8Array) {
    const { msgType, pbPayload, seq } = decodeV2Frame(frame);
    const { Message, messageName } = createProtocolV2MessageFromType(msgType, schemas);
    const rxByteBuffer = ByteBuffer.wrap(Buffer.from(pbPayload) as unknown as ArrayBuffer);
    const message = decodeProtobuf(Message, rxByteBuffer);

    return {
      message,
      messageName,
      msgType,
      pbPayload,
      seq,
      type: messageName,
    };
  },
};
