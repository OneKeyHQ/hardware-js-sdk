// Logic of sending data to trezor
//
// Logic of "call" is broken to two parts - sending and receiving
import { Root } from 'protobufjs/light';
import { encode as encodeProtobuf } from './protobuf';
import { encode as encodeProtocol } from './protocol';
import { createMessageFromName } from './protobuf/messages';

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
