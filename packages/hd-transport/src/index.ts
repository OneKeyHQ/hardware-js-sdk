import * as protobuf from 'protobufjs/light';
import * as Long from 'long';
import {
  buildBuffers,
  buildEncodeBuffers,
  buildOne,
  decodeProtocol,
  parseConfigure,
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
};
