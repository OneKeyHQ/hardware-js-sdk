import { buildOne, receiveOne, parseConfigure } from './serialization';
import * as check from './utils/highlevel-checks';
import * as protobuf from 'protobufjs/light';
import * as Long from 'long';

protobuf.util.Long = Long;
protobuf.configure();

export type {
  Transport,
  AcquireInput,
  OneKeyDeviceInfoWithSession,
  MessageFromOneKey,
} from './types';

export * from './constants';

export default {
  check,
  buildOne,
  receiveOne,
  parseConfigure,
};
