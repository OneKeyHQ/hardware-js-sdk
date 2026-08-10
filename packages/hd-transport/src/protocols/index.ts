import ByteBuffer from 'bytebuffer';
import { Reader, Type } from 'protobufjs/light';

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

type ProtocolV2DecodeOptions = {
  /** Allow the pre-build-fingerprint ProtocolInfo wire layout for recovery flows. */
  allowLegacyProtocolV2ProtocolInfo?: boolean;
};

const LEGACY_PROTOCOL_V2_PROTOCOL_INFO = Type.fromJSON('LegacyProtocolInfo', {
  fields: {
    version: {
      rule: 'required',
      type: 'uint32',
      id: 1,
    },
    supported_messages: {
      rule: 'repeated',
      type: 'uint32',
      id: 2,
      options: {
        packed: false,
      },
    },
    protobuf_definition: {
      type: 'string',
      id: 3,
    },
  },
});

const decodeLegacyProtocolV2ProtocolInfo = (pbPayload: Uint8Array) => {
  const byteBuffer = ByteBuffer.wrap(Buffer.from(pbPayload) as unknown as ArrayBuffer);
  const legacy = decodeProtobuf(LEGACY_PROTOCOL_V2_PROTOCOL_INFO, byteBuffer);

  return {
    version: legacy.version,
    build_fingerprint: '',
    supported_messages: legacy.supported_messages ?? [],
    // Presence of this legacy field lets Core keep the fallback recovery-only.
    protobuf_definition: null,
  };
};

const isLegacyProtocolV2ProtocolInfoWireLayout = (pbPayload: Uint8Array) => {
  const reader = Reader.create(pbPayload);
  let hasVersion = false;
  try {
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      // eslint-disable-next-line no-bitwise
      const fieldNumber = tag >>> 3;
      // eslint-disable-next-line no-bitwise
      const wireType = tag & 0x07;
      if (fieldNumber === 1) {
        if (wireType !== 0) return false;
        hasVersion = true;
      } else if (fieldNumber === 2) {
        // Legacy field 2 is repeated uint32; current field 2 is a string.
        if (wireType !== 0) return false;
      } else if (fieldNumber === 3) {
        // Legacy field 3 is protobuf_definition; current field 3 is uint32.
        if (wireType !== 2) return false;
      } else {
        return false;
      }
      reader.skipType(wireType);
    }
  } catch {
    return false;
  }
  return hasVersion;
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

  decodeFrame(
    schemas: ProtocolV2Schemas,
    frame: Uint8Array,
    options: ProtocolV2DecodeOptions = {}
  ) {
    const { messageTypeId, pbPayload, seq, messageName } = this.inspectFrame(schemas, frame);
    const { Message } = createProtocolV2MessageFromType(messageTypeId, schemas);
    const rxByteBuffer = ByteBuffer.wrap(Buffer.from(pbPayload) as unknown as ArrayBuffer);
    let message: ReturnType<typeof decodeProtobuf> | undefined;
    if (
      messageName === 'ProtocolInfo' &&
      options.allowLegacyProtocolV2ProtocolInfo === true &&
      isLegacyProtocolV2ProtocolInfoWireLayout(pbPayload)
    ) {
      try {
        message = decodeLegacyProtocolV2ProtocolInfo(pbPayload);
      } catch {
        // Let the current decoder below produce the standard compatibility error.
      }
    }
    try {
      message ??= decodeProtobuf(Message, rxByteBuffer);
    } catch (cause) {
      if (
        messageName === 'ProtocolInfo' &&
        options.allowLegacyProtocolV2ProtocolInfo === true &&
        isLegacyProtocolV2ProtocolInfoWireLayout(pbPayload)
      ) {
        try {
          message = decodeLegacyProtocolV2ProtocolInfo(pbPayload);
        } catch {
          // Preserve the current-schema error below when neither layout is valid.
        }
      }
      if (message) {
        return {
          message,
          messageName,
          messageTypeId,
          pbPayload,
          seq,
          type: messageName,
        };
      }
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
