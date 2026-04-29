import ByteBuffer from 'bytebuffer';

import { buildEncodeBuffers } from './send';
import { receiveOne } from './receive';
import { createMessageFromName, createMessageFromType } from './protobuf/messages';
import { encode as encodeProtobuf } from './protobuf/encode';
import { decode as decodeProtobuf } from './protobuf/decode';
import { buildPbFrame, parseProtoV2Frame } from './protocol-v2';

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
    return schemas.protocolV1;
  }
};

const resolveProtocolV2DecodeSchema = (msgType: number, schemas: ProtocolV2Schemas) => {
  if (msgType >= PROTOCOL_V2_SYS_MESSAGE_THRESHOLD) {
    return schemas.protocolV2;
  }
  return schemas.protocolV1;
};

export const ProtocolV1 = {
  encode(messages: Root, name: string, data: Record<string, unknown>) {
    return buildEncodeBuffers(messages, name, data);
  },

  decode(messages: Root, data: string) {
    return receiveOne(messages, data);
  },
};

export const ProtocolV2 = {
  encode(
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

    return buildPbFrame(messageType, pbBytes, options.packetSrc, options.router);
  },

  decode(schemas: ProtocolV2Schemas, frame: Uint8Array) {
    const { msgType, pbPayload, seq } = parseProtoV2Frame(frame);
    const decodeMessages = resolveProtocolV2DecodeSchema(msgType, schemas);
    const { Message, messageName } = createMessageFromType(decodeMessages, msgType);
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
