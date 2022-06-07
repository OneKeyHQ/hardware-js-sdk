import * as protobuf from 'protobufjs/light';
import * as Long from 'long';
import { buildOne, buildBuffer, receiveOne, parseConfigure } from './serialization';
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
} from './types';

export { Messages } from './types';

export * from './constants';

export default {
  check,
  buildOne,
  buildBuffer,
  receiveOne,
  parseConfigure,
};
