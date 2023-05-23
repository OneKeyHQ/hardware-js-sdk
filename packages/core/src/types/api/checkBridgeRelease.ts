import type { CommonParams, Response } from '../params';

export type CheckBridgeReleaseResponse = {
  shouldUpdate: boolean;
  status: 'outdated' | 'valid';
  releaseVersion: string;
} | null;

export declare function checkBridgeRelease(
  connectId?: string,
  params?: CommonParams & {
    willUpdateFirmwareVersion?: string;
  }
): Response<CheckBridgeReleaseResponse>;
