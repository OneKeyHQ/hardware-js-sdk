import type { CommonParams, Response } from '../params';

export type GetPassphraseStateParams = CommonParams;

/**
 * Legacy Protocol V1 wallet API.
 *
 * This remains supported for Protocol V1 integrations. New cross-protocol integrations
 * and all Protocol V2 callers should use `openWalletSession`.
 */
export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<string | undefined>;
