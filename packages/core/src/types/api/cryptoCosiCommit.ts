import type { CosiCommitment } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CosiCommitParam = {
  path: string;
  data?: string;
};

export declare function cryptoCosiCommit(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosiCommitParam
): Response<CosiCommitment>;
