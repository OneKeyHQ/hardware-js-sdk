import { CipheredKeyValue as HardwareCipheredKeyValue } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CipheredKeyValue = {
  path: string;
} & HardwareCipheredKeyValue;

export type CipheredKeyValueParams = {
  path: string | number[];
  key: string;
  value: string;
  encrypt?: boolean;
  askOnEncrypt?: boolean;
  askOnDecrypt?: boolean;
  iv?: string;
};

export declare function cipherKeyValue(
  connectId: string,
  deviceId: string,
  params: CommonParams & CipheredKeyValueParams
): Response<CipheredKeyValue>;

export declare function cipherKeyValue(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: CipheredKeyValueParams[] }
): Response<Array<CipheredKeyValue>>;
