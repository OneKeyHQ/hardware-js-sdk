import { buildOne, receiveOne } from './serialization';
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
  buildOne,
  receiveOne,
};
