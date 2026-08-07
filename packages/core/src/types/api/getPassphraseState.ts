import type { CommonParams, Response } from '../params';

export type GetPassphraseStateParams = CommonParams;

/**
 * Compatibility wallet-state API for existing App integrations.
 *
 * Protocol V1 keeps its parameterless firmware flow. Protocol V2 maps the existing
 * `useEmptyPassphrase` and `initSession` intent to the device-only wallet-session flow.
 * New integrations should prefer `openWalletSession` for explicit wallet intent.
 */
export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<string | undefined>;
