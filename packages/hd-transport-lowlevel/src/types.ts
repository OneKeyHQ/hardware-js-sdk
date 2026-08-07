import type { ProtocolType } from '@onekeyfe/hd-transport';

export type LowLevelAcquireInput = {
  uuid: string;
  expectedProtocol?: ProtocolType;
  protocolHint?: ProtocolType;
};
