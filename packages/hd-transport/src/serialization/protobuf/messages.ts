import { createProtobufRoot } from './descriptor';

import type { ProtobufNamespaceJson, ProtobufRoot } from './descriptor';

export type {
  ProtobufEnumType,
  ProtobufFieldInfo,
  ProtobufMessageType,
  ProtobufNamespaceJson,
  ProtobufRoot,
} from './descriptor';

export function parseConfigure(data: ProtobufNamespaceJson | string): ProtobufRoot {
  return createProtobufRoot(data);
}

export function parseTransportConfigure(data: ProtobufNamespaceJson | string): ProtobufRoot {
  return createProtobufRoot(data);
}

export const createMessageFromName = (messages: ProtobufRoot, name: string) => {
  const Message = messages.lookupType(name);
  const MessageType = messages.lookupEnum('MessageType');
  let messageTypeId: unknown = MessageType.values[`MessageType_${name}`];

  if (messageTypeId == null && Message.options) {
    messageTypeId = Message.options['(wire_type)'];
  }

  if (typeof messageTypeId !== 'number' || !Number.isInteger(messageTypeId)) {
    throw new Error(`MessageType for "${name}" is not defined in protobuf schema`);
  }

  return {
    Message,
    messageTypeId,
  };
};

export const createMessageFromType = (messages: ProtobufRoot, typeId: number) => {
  const MessageType = messages.lookupEnum('MessageType');

  const rawMessageName = MessageType.valuesById[typeId];
  if (!rawMessageName) {
    throw new Error(`MessageType id "${typeId}" is not defined in protobuf schema`);
  }

  const messageName = rawMessageName.replace('MessageType_', '');

  const Message = messages.lookupType(messageName);

  return {
    Message,
    messageName,
  };
};
