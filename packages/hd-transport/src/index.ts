import * as protobuf from 'protobufjs/light';
import Long from 'long';

import {
  createMessageFromName,
  createMessageFromType,
  decodeProtobuf,
  encodeProtobuf,
  parseConfigure,
} from './serialization';
import { PROTOCOL_V2_SYS_MESSAGE_THRESHOLD, ProtocolV1, ProtocolV2 } from './protocols';
import * as protocolV2Codec from './protocols/v2';
import { ProtocolV2LinkManager } from './protocols/v2/link-manager';
import { ProtocolV2UsbTransportBase } from './protocols/v2/usb-transport-base';
import {
  ProtocolV2FrameAssembler,
  ProtocolV2SequenceCursor,
  ProtocolV2Session,
  bytesToHex,
  concatUint8Arrays,
  getErrorMessage,
  hexToBytes,
  probeProtocolV2,
  withProtocolTimeout,
} from './protocols/v2/session';
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
  TransportDeviceDisconnectEvent,
} from './types';

export { Messages, TRANSPORT_EVENT } from './types';
export * from './types/messages';
export * from './utils/logBlockCommand';
export * from './utils/transportLog';

export * from './constants';
export * from './protocols';
export * as protocolV1 from './protocols/v1';
export * as protocolV2 from './protocols/v2';
export * from './protocols/v2/session';
export * from './protocols/v2/link-manager';
export * from './protocols/v2/ble-frame-writer';
export * from './protocols/v2/usb-transport-base';

export default {
  check,
  parseConfigure,
  protocolV2: protocolV2Codec,
  ProtocolV1,
  ProtocolV2,
  PROTOCOL_V2_SYS_MESSAGE_THRESHOLD,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkManager,
  ProtocolV2SequenceCursor,
  ProtocolV2Session,
  ProtocolV2UsbTransportBase,
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
