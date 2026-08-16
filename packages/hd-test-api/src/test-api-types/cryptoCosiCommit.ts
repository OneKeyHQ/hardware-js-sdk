import type { CosiCommitment } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type CosiCommitParam = {
  path: string;
  data?: string;
};

export declare function cryptoCosiCommit(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosiCommitParam
): Response<CosiCommitment>;
