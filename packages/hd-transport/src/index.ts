import * as protobuf from 'protobufjs/light';
import Long from 'long';

import {
  PROTOCOL_V2_SYS_MESSAGE_THRESHOLD,
  ProtocolV1,
  ProtocolV2,
  buildBuffers,
  buildEncodeBuffers,
  buildOne,
  createMessageFromName,
  createMessageFromType,
  decodeProtobuf,
  decodeProtocol,
  encodeProtobuf,
  parseConfigure,
  protoV2,
  receiveOne,
} from './serialization';
import {
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  bytesToHex,
  concatUint8Arrays,
  getErrorMessage,
  hexToBytes,
  probeProtocolV2,
  withProtocolTimeout,
} from './protocol-session';
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
  TransportCallOptions,
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
export * from './protocol-session';

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
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  bytesToHex,
  concatUint8Arrays,
  createMessageFromName,
  createMessageFromType,
  encodeProtobuf,
  decodeProtobuf,
  getErrorMessage,
  hexToBytes,
  probeProtocolV2,
  withProtocolTimeout,
};
