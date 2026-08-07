import type { EvmEthereumDefinitions } from '@onekeyfe/hwk-adapter-core';

/**
 * Opt-in helpers for fetching Trezor Ethereum "definitions" — the SatoshiLabs-
 * signed network/token metadata a Trezor device uses to render friendly names
 * for chains and tokens that are NOT built into firmware.
 *
 * IMPORTANT — the SDK signing methods (evmSignTransaction / evmGetAddress / …)
 * NEVER call these. A local hardware operation must not silently become a
 * third-party network request (see PR #824 review). The caller decides whether,
 * when, and where to fetch, then passes the result into the sign params as
 * `ethereumDefinitions`. When omitted, the device falls back to a generic
 * confirmation screen and signing still completes.
 *
 * Cross-process note: `fetchImpl` is a FUNCTION and cannot be serialized across
 * an IPC / postMessage boundary. Call these helpers in a network-capable
 * process and send only the resulting hex strings to the process that talks
 * to the device. Use `baseUrl` (a string) to route through your own
 * controlled proxy instead of hitting data.trezor.io directly.
 */

/** Default upstream (Trezor). Override with `baseUrl` to use your own proxy. */
export const DEFAULT_ETHEREUM_DEFINITIONS_BASE_URL =
  'https://data.trezor.io/firmware/eth-definitions';

/** Timeout so a hung host can't stall the signing flow. */
export const DEFINITIONS_FETCH_TIMEOUT_MS = 20_000;

/** Race a thunk against a deadline. Generic so it works with any FetchLike on
 * RN/Hermes; a timeout stops awaiting but does not cancel the socket. */
export async function runWithTimeout<T>(
  run: () => Promise<T>,
  timeoutMs: number = DEFINITIONS_FETCH_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`definitions fetch timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([run(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type FetchLike = (url: string) => Promise<{
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type FetchEthereumDefinitionsParams = {
  chainId?: number;
  slip44?: number;
  contractAddress?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export type BuildEthereumDefinitionsForPathParams = {
  path: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export type BuildEthereumDefinitionsForSignTxParams = {
  path: string;
  chainId: number;
  to?: string;
  data?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

/** Derive the SLIP-44 coin type (unhardened) from a BIP44-style path. */
export function getSlip44FromPath(path: string): number {
  const segments = path.trim().replace(/^m\//i, '').split('/');
  const coinType = segments[1];
  const parsed = coinType === undefined ? NaN : Number(coinType.replace(/['hH]$/, ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Cannot derive SLIP-44 coin type from path: ${path}`);
  }
  return parsed >= 0x80000000 ? parsed - 0x80000000 : parsed;
}

export async function fetchEthereumDefinitions({
  chainId,
  slip44,
  contractAddress,
  baseUrl = DEFAULT_ETHEREUM_DEFINITIONS_BASE_URL,
  fetchImpl = globalThis.fetch,
}: FetchEthereumDefinitionsParams): Promise<EvmEthereumDefinitions> {
  if (!chainId && !slip44) {
    throw new Error('fetchEthereumDefinitions requires chainId or slip44');
  }
  if (!fetchImpl) {
    return {};
  }

  const mode = chainId ? 'chain-id' : 'slip44';
  const id = chainId ?? slip44;
  const definitions: EvmEthereumDefinitions = {};

  const network = await fetchDefinitionHex(`${baseUrl}/${mode}/${id}/network.dat`, fetchImpl);
  if (network) {
    definitions.encodedNetwork = network;
  }

  if (contractAddress) {
    const token = await fetchDefinitionHex(
      `${baseUrl}/${mode}/${id}/token-${stripHexPrefix(contractAddress).toLowerCase()}.dat`,
      fetchImpl
    );
    if (token) {
      definitions.encodedToken = token;
    }
  }

  return definitions;
}

export async function buildEthereumDefinitionsForPath({
  path,
  baseUrl,
  fetchImpl,
}: BuildEthereumDefinitionsForPathParams): Promise<EvmEthereumDefinitions> {
  return fetchEthereumDefinitions({
    slip44: getSlip44FromPath(path),
    baseUrl,
    fetchImpl,
  });
}

export async function buildEthereumDefinitionsForSignTx({
  path,
  chainId,
  to,
  data,
  baseUrl,
  fetchImpl,
}: BuildEthereumDefinitionsForSignTxParams): Promise<EvmEthereumDefinitions | undefined> {
  const dataHex = stripHexPrefix(data ?? '');
  if (chainId === 1 && !dataHex) {
    return undefined;
  }
  return fetchEthereumDefinitions({
    chainId,
    slip44: getSlip44FromPath(path),
    contractAddress: dataHex && to ? to : undefined,
    baseUrl,
    fetchImpl,
  });
}

async function fetchDefinitionHex(url: string, fetchImpl: FetchLike): Promise<string | undefined> {
  try {
    return await runWithTimeout(async () => {
      const response = await fetchImpl(url);
      if (response.status !== 200) {
        return undefined;
      }
      return arrayBufferToHex(await response.arrayBuffer());
    });
  } catch {
    return undefined;
  }
}

function arrayBufferToHex(value: ArrayBuffer): string {
  return Buffer.from(value).toString('hex');
}

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}
