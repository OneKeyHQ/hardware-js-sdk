import type { CommonParams, Response } from '../params';

export type GetPassphraseStateParams = CommonParams;

/** Protocol V1 compatibility API. Protocol V2 callers should use openWalletSession. */
export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<string | undefined>;
