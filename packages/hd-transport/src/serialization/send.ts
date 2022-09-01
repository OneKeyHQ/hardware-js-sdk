// Logic of sending data to trezor
//
// Logic of "call" is broken to two parts - sending and receiving
import { Root } from 'protobufjs/light';
import ByteBuffer from 'bytebuffer';
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

export const buildEncodeBuffers = (messages: Root, name: string, data: Record<string, unknown>) => {
  const { Message, messageType } = createMessageFromName(messages, name);
  const buffer = encodeProtobuf(Message, data);
  return encodeProtocol(buffer, {
    addTrezorHeaders: true,
    chunked: true,
    messageType,
  });
};

export const buildBuffers = (messages: Root, name: string, data: Record<string, unknown>) => {
  // const { Message, messageType } = createMessageFromName(messages, name);
  // const buffer = encodeProtobuf(Message, data);
  // const encodeBuffers = encodeProtocol(buffer, {
  //   addTrezorHeaders: true,
  //   chunked: true,
  //   messageType,
  // });

  const encodeBuffers = buildEncodeBuffers(messages, name, data);

  const outBuffers: ByteBuffer[] = [];

  for (const buf of encodeBuffers) {
    const chunkBuffer = new ByteBuffer(BUFFER_SIZE + 1);
    chunkBuffer.writeByte(MESSAGE_TOP_CHAR);
    chunkBuffer.append(buf);
    chunkBuffer.reset();
    outBuffers.push(chunkBuffer);
  }

  return outBuffers;
};
