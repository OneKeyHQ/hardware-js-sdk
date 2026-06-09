import ByteBuffer from 'bytebuffer';

import { encodeEnvelopeMessage, encodeMessageChunks, encodeTransportPackets } from './v1/packets';
import { decodeFirstChunk } from './v1/decode';
import { decodeMessage as decodeV1Message } from './v1/receive';
import { createMessageFromName, createMessageFromType } from '../serialization/protobuf/messages';
import { encode as encodeProtobuf } from '../serialization/protobuf/encode';
import { decode as decodeProtobuf } from '../serialization/protobuf/decode';
import { decodeFrame as decodeV2Frame, encodeProtobufFrame } from './v2';

import type { Root } from 'protobufjs/light';
import type { ProtocolV2DebugLogger } from './v2';

export const PROTOCOL_V2_SYS_MESSAGE_THRESHOLD = 60000;

type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

type ProtocolV2FrameOptions = {
  packetSrc?: number;
  router?: number;
  logger?: ProtocolV2DebugLogger;
  logPrefix?: string;
  context?: string;
};

const resolveProtocolV2EncodeSchema = (name: string, schemas: ProtocolV2Schemas) => {
  try {
    schemas.protocolV2.lookupType(name);
    return schemas.protocolV2;
  } catch {
    throw new Error(`Protocol V2 message "${name}" is not defined in Protocol V2 schema`);
  }
};

const PROTOCOL_V2_LEGACY_DECODE_ALLOWLIST = new Set([
  'ButtonRequest',
  'EntropyRequest',
  'PinMatrixRequest',
  'PassphraseRequest',
  'Deprecated_PassphraseStateRequest',
  'WordRequest',
]);

const createProtocolV2MessageFromType = (messageTypeId: number, schemas: ProtocolV2Schemas) => {
  try {
    return createMessageFromType(schemas.protocolV2, messageTypeId);
  } catch (protocolV2Error) {
    let legacyMessage: ReturnType<typeof createMessageFromType>;
    try {
      legacyMessage = createMessageFromType(schemas.protocolV1, messageTypeId);
    } catch {
      throw protocolV2Error;
    }
    if (PROTOCOL_V2_LEGACY_DECODE_ALLOWLIST.has(legacyMessage.messageName)) {
      return legacyMessage;
    }
    throw protocolV2Error;
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
    const { Message, messageTypeId } = createMessageFromName(encodeMessages, name);
    const pbBuffer = encodeProtobuf(Message, data);
    pbBuffer.reset();
    const rawPbBuffer = pbBuffer.toBuffer() as unknown as ArrayBuffer;
    const pbBytes = new Uint8Array(rawPbBuffer);

    options.logger?.debug?.(`[${options.logPrefix ?? 'ProtocolV2'}] encode protobuf`, {
      context: options.context ?? `encode:${name}`,
      messageName: name,
      messageTypeId,
      pbPayloadLength: pbBytes.length,
      packetSrc: options.packetSrc ?? 0,
      router: options.router ?? 0,
    });

    return encodeProtobufFrame(messageTypeId, pbBytes, options.packetSrc, options.router, {
      logger: options.logger,
      logPrefix: options.logPrefix,
      context: options.context ?? `encode:${name}`,
      messageName: name,
    });
  },

  decodeFrame(
    schemas: ProtocolV2Schemas,
    frame: Uint8Array,
    options: Pick<ProtocolV2FrameOptions, 'logger' | 'logPrefix' | 'context'> = {}
  ) {
    const { messageTypeId, pbPayload, seq } = decodeV2Frame(frame, {
      logger: options.logger,
      logPrefix: options.logPrefix,
      context: options.context ?? 'decode',
    });
    const { Message, messageName } = createProtocolV2MessageFromType(messageTypeId, schemas);
    const rxByteBuffer = ByteBuffer.wrap(Buffer.from(pbPayload) as unknown as ArrayBuffer);
    const message = decodeProtobuf(Message, rxByteBuffer);

    options.logger?.debug?.(`[${options.logPrefix ?? 'ProtocolV2'}] decode protobuf`, {
      context: options.context ?? `decode:${messageName}`,
      messageName,
      messageTypeId,
      pbPayloadLength: pbPayload.length,
      seq,
    });

    return {
      message,
      messageName,
      messageTypeId,
      pbPayload,
      seq,
      type: messageName,
    };
  },
};
