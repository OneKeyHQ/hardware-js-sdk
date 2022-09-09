import { ConfluxMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type ConfluxSignMessageCIP23Params = {
  path: string | number[];
  domainHash: string;
  messageHash: string;
};

export declare function confluxSignMessageCIP23(
  connectId: string,
  deviceId: string,
  params: CommonParams & ConfluxSignMessageCIP23Params
): Response<ConfluxMessageSignature>;
