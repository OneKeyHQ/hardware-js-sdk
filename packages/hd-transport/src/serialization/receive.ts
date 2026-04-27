import ByteBuffer from 'bytebuffer';

import * as decodeProtobuf from './protobuf/decode';
import * as decodeProtocol from './protocol-v1/decode';
import { createMessageFromType } from './protobuf/messages';

import type { Root } from 'protobufjs/light';

export function receiveOne(messages: Root, data: string) {
  const bytebuffer = ByteBuffer.wrap(data, 'hex');

  const { typeId, buffer } = decodeProtocol.decode(bytebuffer);
  const { Message, messageName } = createMessageFromType(messages, typeId);
  const message = decodeProtobuf.decode(Message, buffer);
  return {
    message,
    type: messageName,
  };
}
