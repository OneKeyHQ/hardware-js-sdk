import type { CommonParams, Response } from '../params';

export type GetPassphraseStateParams = CommonParams;

export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<string | undefined>;
