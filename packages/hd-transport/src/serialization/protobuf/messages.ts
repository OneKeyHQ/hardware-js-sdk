// Import full protobufjs for reflection capabilities
import * as protobuf from 'protobufjs';

// Type definitions for compatibility
interface INamespace {
  [key: string]: any;
}

export function parseConfigure(data: INamespace | string) {
  // @ts-ignore [compatiblity]: connect is sending stringified json
  if (typeof data === 'string') {
    return protobuf.Root.fromJSON(JSON.parse(data));
  }
  return protobuf.Root.fromJSON(data);
}

export const createMessageFromName = (messages: protobuf.Root, name: string) => {
  const Message = messages.lookupType(name);
  const MessageType = messages.lookupEnum('MessageType');
  let messageType = MessageType.values[`MessageType_${name}`];

  if (!messageType && Message.options) {
    messageType = Message.options['(wire_type)'];
  }

  return {
    Message,
    messageType,
  };
};

export const createMessageFromType = (messages: protobuf.Root, typeId: number) => {
  const MessageType = messages.lookupEnum('MessageType');

  const messageName = MessageType.valuesById[typeId].replace('MessageType_', '');

  const Message = messages.lookupType(messageName);

  return {
    Message,
    messageName,
  };
};
