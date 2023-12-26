import { NEMDecryptedMessage } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DecryptMessageParams = {
  path: string | number[];
  network?: number;
  public_key?: string;
  payload?: string;
};

export declare function nemDecryptMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & DecryptMessageParams
): Response<NEMDecryptedMessage>;
