// Logic of sending data to trezor
//
// Logic of "call" is broken to two parts - sending and receiving
import ByteBuffer from 'bytebuffer';
import { Root } from 'protobufjs/light';
import { encode as encodeProtobuf } from './protobuf';
import { encode as encodeProtocol } from './protocol';
import { createMessageFromName } from './protobuf/messages';
import { BUFFER_SIZE, MESSAGE_TOP_CHAR } from '../constants';

// Sends message to device.
// Resolves if everything gets sent
export function buildOne(messages: Root, name: string, data: Record<string, unknown>) {
  const { Message, messageType } = createMessageFromName(messages, name);

  const buffer = encodeProtobuf(Message, data);
  return encodeProtocol(buffer, {
    addTrezorHeaders: false,
    chunked: false,
    messageType,
  });
}

export const buildBuffer = (messages: Root, name: string, data: Record<string, unknown>) => {
  const { Message, messageType } = createMessageFromName(messages, name);
  const buffer = encodeProtobuf(Message, data);
  const encodeBuffer = encodeProtocol(buffer, {
    addTrezorHeaders: true,
    chunked: false,
    messageType,
  });

  const outBuffer = new ByteBuffer(BUFFER_SIZE + 1);
  outBuffer.writeByte(MESSAGE_TOP_CHAR);
  outBuffer.append(encodeBuffer);
  outBuffer.reset();

  return outBuffer;
};
