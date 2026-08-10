import * as protobuf from 'protobufjs/light';

const allowLegacyProtocolInfo = (root: protobuf.Root) => {
  const protocolInfo = root.lookup('ProtocolInfo');
  if (!(protocolInfo instanceof protobuf.Type)) return;

  const { version, build_fingerprint: buildFingerprint } = protocolInfo.fields;
  if (version?.id !== 1 || buildFingerprint?.id !== 2 || !buildFingerprint.required) return;

  // 早期 Protocol V2 bootloader 只返回 version，主机端需兼容缺失的构建指纹。
  buildFingerprint.rule = undefined;
  buildFingerprint.required = false;
  buildFingerprint.optional = true;
};

export function parseConfigure(data: protobuf.INamespace) {
  let root: protobuf.Root;
  // @ts-ignore [compatiblity]: connect is sending stringified json
  if (typeof data === 'string') {
    root = protobuf.Root.fromJSON(JSON.parse(data));
  } else {
    root = protobuf.Root.fromJSON(data);
  }
  allowLegacyProtocolInfo(root);
  return root;
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
