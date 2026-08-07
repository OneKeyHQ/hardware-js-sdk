import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';

export type CheckBootloaderReleaseResponse = {
  shouldUpdate: boolean;
  status: 'outdated' | 'valid';
  release: string | undefined;
  bootloaderMode: boolean;
} | null;

export type CheckBootloaderReleaseParams = {
  willUpdateFirmwareVersion?: string;
  firmwareType?: EFirmwareType;
};

export declare function checkBootloaderRelease(
  connectId?: string,
  params?: CommonParams & CheckBootloaderReleaseParams
): Response<CheckBootloaderReleaseResponse>;
