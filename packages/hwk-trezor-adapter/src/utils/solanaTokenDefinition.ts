import type { FetchLike } from './ethereumDefinitions';

/**
 * Opt-in helper for fetching a Trezor Solana token definition. Same contract as
 * the Ethereum helpers (see ./ethereumDefinitions): the SDK signing path NEVER
 * calls this — the caller fetches (through its own `baseUrl` proxy if desired)
 * and passes the bytes into `solSignTransaction` params as
 * `additionalInfo.encodedToken`. When omitted the device shows a generic token
 * confirmation screen and signing still completes.
 *
 * `fetchImpl` is a function and must not cross an IPC boundary — fetch in a
 * network-capable process and pass only the resulting hex string.
 */

/** Default upstream (Trezor). Override with `baseUrl` to use your own proxy. */
export const DEFAULT_SOLANA_TOKEN_DEFINITION_BASE_URL =
  'https://data.trezor.io/firmware/definitions/solana/token';

export type FetchSolanaTokenDefinitionParams = {
  tokenMint: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export async function fetchSolanaTokenDefinition({
  tokenMint,
  baseUrl = DEFAULT_SOLANA_TOKEN_DEFINITION_BASE_URL,
  fetchImpl = globalThis.fetch,
}: FetchSolanaTokenDefinitionParams): Promise<string | undefined> {
  if (!fetchImpl) {
    return undefined;
  }
  try {
    const response = await fetchImpl(`${baseUrl}/${tokenMint}.dat`);
    if (response.status !== 200) {
      return undefined;
    }
    return Buffer.from(await response.arrayBuffer()).toString('hex');
  } catch {
    return undefined;
  }
}
