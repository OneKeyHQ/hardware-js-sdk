import type { CipheredKeyValue } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CipherKeyValueParams = {
  path: string;
  key: string;
  value: string;
  encrypt?: boolean;
  ask_on_encrypt?: boolean;
  ask_on_decrypt?: boolean;
  iv?: string;
};

export declare function cryptoCipherKeyValue(
  connectId: string,
  deviceId: string,
  params: CommonParams & CipherKeyValueParams
): Response<CipheredKeyValue>;
