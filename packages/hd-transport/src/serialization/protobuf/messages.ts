import * as protobuf from 'protobufjs/light';

import { schemaKey, schemas } from '../../../lib/protobuf-static';

export function parseConfigure(data: protobuf.INamespace) {
  // @ts-ignore [compatiblity]: connect is sending stringified json
  const schema = typeof data === 'string' ? JSON.parse(data) : data;
  const key = schemaKey(schema);
  const createConstructors = schemas[key];
  // Field resolution mutates options; keep built-in descriptors reusable across connections.
  const messages = protobuf.Root.fromJSON(
    createConstructors ? JSON.parse(JSON.stringify(schema)) : schema
  );
  if (createConstructors) {
    const constructors = createConstructors();
    const types: protobuf.Type[] = [];
    const collect = (namespace: protobuf.Namespace) => {
      if (namespace instanceof protobuf.Type) types.push(namespace);
      namespace.nestedArray.forEach(child => {
        if (child instanceof protobuf.Namespace) collect(child);
      });
    };
    collect(messages);
    // Register every constructor before resolving fields, which access parent.ctor.
    types.forEach(type => {
      type.ctor = constructors[type.fullName];
    });
    types.forEach(type => {
      const constructor = constructors[type.fullName];
      type.encode = constructor.encode;
      type.decode = constructor.decode;
      type.verify = constructor.verify;
      type.fromObject = constructor.fromObject;
      type.toObject = constructor.toObject;
      type.setup = () => type;
    });
    messages.resolveAll();
  }
  return messages;
}

export const createMessageFromName = (messages: protobuf.Root, name: string) => {
  const Message = messages.lookupType(name);
  const MessageType = messages.lookupEnum('MessageType');
  let messageTypeId = MessageType.values[`MessageType_${name}`];

  if (messageTypeId == null && Message.options) {
    messageTypeId = Message.options['(wire_type)'];
  }

  if (!Number.isInteger(messageTypeId)) {
    throw new Error(`MessageType for "${name}" is not defined in protobuf schema`);
  }

  return {
    Message,
    messageTypeId,
  };
};

export const createMessageFromType = (messages: protobuf.Root, typeId: number) => {
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
