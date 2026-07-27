import type { ProtocolType } from '@onekeyfe/hd-transport';

export type { BleManager as BlePlxManager } from 'react-native-ble-plx';

export type TransportOptions = {
  scanTimeout?: number;
};

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
  expectedProtocol?: ProtocolType;
};
