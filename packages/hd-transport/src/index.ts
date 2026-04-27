import * as protobuf from 'protobufjs/light';
import * as Long from 'long';

import {
  buildBuffers,
  buildEncodeBuffers,
  buildOne,
  createMessageFromName,
  createMessageFromType,
  decodeProtobuf,
  decodeProtocol,
  encodeProtobuf,
  parseConfigure,
  ProtocolV1,
  ProtocolV2,
  PROTOCOL_V2_SYS_MESSAGE_THRESHOLD,
  protoV2,
  receiveOne,
} from './serialization';
import * as check from './utils/highlevel-checks';

protobuf.util.Long = Long;
protobuf.configure();

export type {
  Transport,
  AcquireInput,
  OneKeyDeviceInfo,
  OneKeyMobileDeviceInfo,
  OneKeyDeviceInfoWithSession,
  MessageFromOneKey,
  LowlevelTransportSharedPlugin,
  LowLevelDevice,
  OneKeyDeviceInfoBase,
  OneKeyDeviceCommType,
  ProtocolType,
} from './types';

export { Messages } from './types';
export * from './types/messages';
export * from './utils/logBlockCommand';

export * from './constants';

export default {
  check,
  buildOne,
  buildBuffers,
  buildEncodeBuffers,
  receiveOne,
  parseConfigure,
  decodeProtocol,
  protoV2,
  ProtocolV1,
  ProtocolV2,
  PROTOCOL_V2_SYS_MESSAGE_THRESHOLD,
  createMessageFromName,
  createMessageFromType,
  encodeProtobuf,
  decodeProtobuf,
};
