import {
  MoneroGetWatchKey,
  MoneroWatchKey as HardwareMoneroWatchKey,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type MoneroAddress = {
  path: string;
} & HardwareMoneroWatchKey;

export type MoneroGetWatchKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
} & Omit<MoneroGetWatchKey, 'address_n'>;

export declare function moneroGetWatchKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroGetWatchKeyParams
): Response<MoneroAddress>;

export declare function moneroGetWatchKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: MoneroGetWatchKeyParams[] }
): Response<Array<MoneroAddress>>;
