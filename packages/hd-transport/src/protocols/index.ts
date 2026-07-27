import ByteBuffer from 'bytebuffer';

import { encodeEnvelopeMessage, encodeMessageChunks, encodeTransportPackets } from './v1/packets';
import { decodeFirstChunk } from './v1/decode';
import { decodeMessage as decodeV1Message } from './v1/receive';
import { createMessageFromName, createMessageFromType } from '../serialization/protobuf/messages';
import { encode as encodeProtobuf } from '../serialization/protobuf/encode';
import { decode as decodeProtobuf } from '../serialization/protobuf/decode';
import {
  decodeFrame as decodeV2Frame,
  encodeProtobufFrame,
  inspectFrameHeader,
  isAckFrame,
} from './v2';

import type { Root } from 'protobufjs/light';

export const PROTOCOL_V2_SYS_MESSAGE_THRESHOLD = 60000;

type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

type ProtocolV2FrameOptions = {
  packetSrc?: number;
  router?: number;
  /** Sequence number (1-255). Managed per-session by ProtocolV2Session. */
  seq?: number;
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
  'Failure',
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
  isAckFrame,
  inspectFrameHeader,

  inspectFrame(schemas: ProtocolV2Schemas, frame: Uint8Array) {
    const { messageTypeId, pbPayload, seq, router, packetSrc, dataType } = decodeV2Frame(frame);
    const { messageName } = createProtocolV2MessageFromType(messageTypeId, schemas);
    return {
      messageName,
      messageTypeId,
      pbPayload,
      seq,
      router,
      packetSrc,
      dataType,
      type: messageName,
    };
  },

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

    return encodeProtobufFrame(
      messageTypeId,
      pbBytes,
      options.packetSrc,
      options.router,
      options.seq
    );
  },

  decodeFrame(schemas: ProtocolV2Schemas, frame: Uint8Array) {
    const { messageTypeId, pbPayload, seq, messageName } = this.inspectFrame(schemas, frame);
    const { Message } = createProtocolV2MessageFromType(messageTypeId, schemas);
    const rxByteBuffer = ByteBuffer.wrap(Buffer.from(pbPayload) as unknown as ArrayBuffer);
    let message: ReturnType<typeof decodeProtobuf>;
    try {
      message = decodeProtobuf(Message, rxByteBuffer);
    } catch (cause) {
      const error = new Error(
        `Protocol V2 protobuf decode failed for "${messageName}" ` +
          `(${messageTypeId}, ${pbPayload.length}-byte payload); ` +
          'the payload is malformed or incompatible with the active SDK schema.'
      );
      (error as Error & { cause?: unknown }).cause = cause;
      throw error;
    }

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
