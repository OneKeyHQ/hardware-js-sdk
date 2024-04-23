import type { CommonParams, Response } from '../params';

export type CheckBootloaderReleaseResponse = {
  shouldUpdate: boolean;
  status: 'outdated' | 'valid';
  release: string | undefined;
  bootloaderMode: boolean;
} | null;

export declare function checkBootloaderRelease(
  connectId?: string,
  params?: CommonParams & {
    willUpdateFirmwareVersion?: string;
  }
): Response<CheckBootloaderReleaseResponse>;
