import type { CommonParams, Response } from '../params';

export type GetPassphraseStateParams = CommonParams;

/**
 * @deprecated Use `openWalletSession` for both Protocol V1 and Protocol V2.
 * Existing calls still work. Persist `deviceId + passphraseState`; do not persist firmware `session_id`.
 */
export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<string | undefined>;
