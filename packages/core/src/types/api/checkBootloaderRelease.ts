import type { Response } from '../params';

export type CheckBootloaderReleaseResponse = {
  shouldUpdate: boolean;
  status: 'outdated' | 'valid';
  release: string | undefined;
} | null;

export declare function checkBootloaderRelease(
  connectId?: string
): Response<CheckBootloaderReleaseResponse>;
