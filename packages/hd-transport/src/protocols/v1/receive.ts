import ByteBuffer from 'bytebuffer';

import * as decodeProtobuf from '../../serialization/protobuf/decode';
import { decodeEnvelope } from './decode';
import { createMessageFromType } from '../../serialization/protobuf/messages';

import type { ProtobufRoot } from '../../serialization/protobuf/descriptor';

export function decodeMessage(messages: ProtobufRoot, data: string) {
  const bytebuffer = ByteBuffer.wrap(data, 'hex');

  const { typeId, buffer } = decodeEnvelope(bytebuffer);
  const { Message, messageName } = createMessageFromType(messages, typeId);
  const message = decodeProtobuf.decode(Message, buffer);
  return {
    message,
    type: messageName,
  };
}
