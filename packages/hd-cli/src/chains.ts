/**
 * Chain Resolver — maps chain identifiers to the correct SDK API calls.
 * Handles derivation path defaults and chain-specific parameter transformations.
 *
 * Reference: developer-portal docs at
 *   content/en/hardware-sdk/chains/<chain>/<method>.mdx
 *   content/en/hardware-sdk/core-api-guide.mdx (HD path section)
 *
 * Type definitions: packages/core/src/types/api/*.ts
 */

import type { CoreApi } from '@onekeyfe/hd-core';

// Default BIP44 derivation paths per chain
// Sources: developer-portal core-api-guide.mdx + chain-specific docs
const DEFAULT_PATHS: Record<string, string> = {
  evm: "m/44'/60'/0'/0/0", // EIP-44 standard
  btc: "m/84'/0'/0'/0/0", // Native SegWit (bech32). Also: m/44' (legacy), m/49' (nested segwit), m/86' (taproot)
  sol: "m/44'/501'/0'/0'", // Fully hardened per Solana spec
  tron: "m/44'/195'/0'/0/0",
  cosmos: "m/44'/118'/0'/0/0",
  cardano: "m/1852'/1815'/0'/0/0", // Shelley-era
  polkadot: "m/44'/354'/0'/0'/0'",
  aptos: "m/44'/637'/0'/0'/0'", // Fully hardened
  sui: "m/44'/784'/0'/0'/0'", // Fully hardened
  near: "m/44'/397'/0'", // Short path per NEAR spec
  xrp: "m/44'/144'/0'/0/0",
  stellar: "m/44'/148'/0'",
  ton: "m/44'/607'/0'",
  nostr: "m/44'/1237'/0'/0/0",
  filecoin: "m/44'/461'/0'/0/0",
  kaspa: "m/44'/111111'/0'/0/0",
  algo: "m/44'/283'/0'/0'/0'",
  conflux: "m/44'/503'/0'/0/0",
  nervos: "m/44'/309'/0'/0/0",
  alephium: "m/44'/1234'/0'/0/0",
  neo: "m/44'/888'/0'/0/0",
  starcoin: "m/44'/101010'/0'/0'/0'",
  nem: "m/44'/43'/0'/0'/0'",
  dnx: "m/44'/29538'/0'/0'/0'",
  scdo: "m/44'/541'/0'/0/0",
  benfen: "m/44'/728'/0'/0'/0'",
  nexa: "m/44'/29223'/0'/0/0",
};

// Chain name aliases for fuzzy matching
const CHAIN_ALIASES: Record<string, string> = {
  ethereum: 'evm',
  eth: 'evm',
  bitcoin: 'btc',
  solana: 'sol',
  dot: 'polkadot',
  ada: 'cardano',
  atom: 'cosmos',
  apt: 'aptos',
  ripple: 'xrp',
  xlm: 'stellar',
  fil: 'filecoin',
  ckb: 'nervos',
  alph: 'alephium',
  cfx: 'conflux',
  stc: 'starcoin',
  xem: 'nem',
  bfc: 'benfen',
};

function resolveChain(chain: string): string {
  const normalized = chain.toLowerCase().trim();
  return CHAIN_ALIASES[normalized] || normalized;
}

function getDefaultPath(chain: string): string {
  const resolved = resolveChain(chain);
  const path = DEFAULT_PATHS[resolved];
  if (!path) {
    throw new Error(
      `Unsupported chain: ${chain}. Supported: ${Object.keys(DEFAULT_PATHS).join(', ')}`
    );
  }
  return path;
}

/**
 * Common params passed to all SDK methods.
 * Reference: packages/core/src/types/api/export.ts (CommonParams)
 */
export interface CommonCLIParams {
  connectId?: string;
  deviceId?: string;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}

export interface GetAddressParams extends CommonCLIParams {
  chain: string;
  path?: string;
  showOnDevice?: boolean;
}

export async function resolveGetAddress(sdk: CoreApi, params: GetAddressParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const showOnOneKey = params.showOnDevice ?? true;
  const connectId = params.connectId || '';
  const deviceId = params.deviceId || '';
  const commonParams = {
    passphraseState: params.passphraseState,
    useEmptyPassphrase: params.useEmptyPassphrase,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainMethodMap: Record<string, () => Promise<any>> = {
    evm: () => sdk.evmGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    btc: () => sdk.btcGetAddress(connectId, deviceId, { path, showOnOneKey, coin: 'btc', ...commonParams }),
    sol: () => sdk.solGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    tron: () => sdk.tronGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    cosmos: () => sdk.cosmosGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    // Cardano requires networkId, protocolMagic, derivationType
    cardano: () =>
      sdk.cardanoGetAddress(connectId, deviceId, {
        addressParameters: { path, addressType: 0 } as any,
        networkId: 1, // mainnet
        protocolMagic: 764824073, // mainnet magic
        derivationType: 1, // Icarus
        showOnOneKey,
        ...commonParams,
      }),
    // Polkadot requires network param
    polkadot: () =>
      sdk.polkadotGetAddress(connectId, deviceId, {
        path,
        prefix: 0,
        network: 'polkadot',
        showOnOneKey,
        ...commonParams,
      }),
    aptos: () => sdk.aptosGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    sui: () => sdk.suiGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    near: () => sdk.nearGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    xrp: () => sdk.xrpGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    stellar: () => sdk.stellarGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    ton: () => sdk.tonGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    filecoin: () => sdk.filecoinGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    kaspa: () => sdk.kaspaGetAddress(connectId, deviceId, { path, showOnOneKey, prefix: 'kaspa', ...commonParams }),
    algo: () => sdk.algoGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    conflux: () => sdk.confluxGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    nervos: () => sdk.nervosGetAddress(connectId, deviceId, { path, showOnOneKey, network: 'ckb', ...commonParams }),
    alephium: () => sdk.alephiumGetAddress(connectId, deviceId, { path, showOnOneKey, group: 0, ...commonParams }),
    neo: () => sdk.neoGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    starcoin: () => sdk.starcoinGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    nem: () => sdk.nemGetAddress(connectId, deviceId, { path, showOnOneKey, network: 104, ...commonParams }),
    dnx: () => sdk.dnxGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    scdo: () => sdk.scdoGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    benfen: () => sdk.benfenGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    nexa: () => sdk.nexaGetAddress(connectId, deviceId, { path, showOnOneKey, prefix: 'nexa', ...commonParams }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`getAddress not supported for chain: ${chain}`);
  }

  const result = await method();
  if (result == null) {
    return { success: false, error: 'No response from device', chain, path };
  }
  return { ...(result as object), chain, path };
}

export interface GetPublicKeyParams extends CommonCLIParams {
  chain: string;
  path?: string;
}

export async function resolveGetPublicKey(sdk: CoreApi, params: GetPublicKeyParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';
  const deviceId = params.deviceId || '';
  const commonParams = {
    passphraseState: params.passphraseState,
    useEmptyPassphrase: params.useEmptyPassphrase,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainMethodMap: Record<string, () => Promise<any>> = {
    evm: () => sdk.evmGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    btc: () => sdk.btcGetPublicKey(connectId, deviceId, { path, coin: 'btc', ...commonParams }),
    aptos: () => sdk.aptosGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    cosmos: () => sdk.cosmosGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    sui: () => sdk.suiGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    starcoin: () => sdk.starcoinGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    nostr: () => sdk.nostrGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    benfen: () => sdk.benfenGetPublicKey(connectId, deviceId, { path, ...commonParams }),
    cardano: () => sdk.cardanoGetPublicKey(connectId, deviceId, { path, derivationType: 1, ...commonParams }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(
      `getPublicKey not supported for chain: ${chain}. Supported: ${Object.keys(
        chainMethodMap
      ).join(', ')}`
    );
  }

  const result = await method();
  return { ...(result as object), chain, path };
}

export interface SignTransactionParams extends CommonCLIParams {
  chain: string;
  path?: string;
  transaction: Record<string, unknown>;
}

export async function resolveSignTransaction(sdk: CoreApi, params: SignTransactionParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';
  const deviceId = params.deviceId || '';
  const tx = params.transaction;
  const commonParams = {
    passphraseState: params.passphraseState,
    useEmptyPassphrase: params.useEmptyPassphrase,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainMethodMap: Record<string, () => Promise<any>> = {
    // EVM: chainId is inside the transaction object, not top-level
    evm: () => sdk.evmSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...commonParams }),
    btc: () => sdk.btcSignTransaction(connectId, deviceId, { coin: 'btc', ...(tx as any), ...commonParams }),
    sol: () => sdk.solSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    tron: () => sdk.tronSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...commonParams }),
    cosmos: () =>
      sdk.cosmosSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    aptos: () => sdk.aptosSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    sui: () => sdk.suiSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    near: () => sdk.nearSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    // eslint-disable-next-line @typescript-eslint/ban-types
    xrp: () =>
      (sdk.xrpSignTransaction as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, {
        path,
        transaction: tx,
        ...commonParams,
      }),
    stellar: () =>
      sdk.stellarSignTransaction(connectId, deviceId, {
        path,
        networkPassphrase: tx.networkPassphrase as string,
        transaction: tx.transaction as any,
        ...commonParams,
      }),
    polkadot: () =>
      sdk.polkadotSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        network: (tx.network as string) || 'polkadot',
        prefix: (tx.prefix as number) ?? 0,
        ...commonParams,
      }),
    filecoin: () =>
      sdk.filecoinSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    kaspa: () => sdk.kaspaSignTransaction(connectId, deviceId, { ...(tx as any), ...commonParams }),
    algo: () => sdk.algoSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    conflux: () =>
      sdk.confluxSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...commonParams }),
    nervos: () => sdk.nervosSignTransaction(connectId, deviceId, { ...(tx as any), ...commonParams }),
    alephium: () =>
      sdk.alephiumSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    neo: () => sdk.neoSignTransaction(connectId, deviceId, { path, ...(tx as any), ...commonParams }),
    dnx: () => sdk.dnxSignTransaction(connectId, deviceId, { path, ...(tx as any), ...commonParams }),
    scdo: () => sdk.scdoSignTransaction(connectId, deviceId, { path, ...(tx as any), ...commonParams }),
    benfen: () =>
      sdk.benfenSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...commonParams }),
    nexa: () => sdk.nexaSignTransaction(connectId, deviceId, { ...(tx as any), ...commonParams }),
    cardano: () => sdk.cardanoSignTransaction(connectId, deviceId, { ...(tx as any) }),
    starcoin: () =>
      sdk.starcoinSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`signTransaction not supported for chain: ${chain}`);
  }

  const result = await method();
  return { ...(result as object), chain, path };
}

export interface SignMessageParams extends CommonCLIParams {
  chain: string;
  path?: string;
  message: string;
}

export async function resolveSignMessage(sdk: CoreApi, params: SignMessageParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';
  const deviceId = params.deviceId || '';
  const commonParams = {
    passphraseState: params.passphraseState,
    useEmptyPassphrase: params.useEmptyPassphrase,
  };

  // Most chains use `messageHex` (hex-encoded). CLI accepts either:
  // - Already hex-encoded string (starts with "0x" or matches /^[0-9a-fA-F]+$/)
  // - Plain text string (auto-converted to hex)
  const raw = params.message;
  const isHex = /^(0x)?[0-9a-fA-F]+$/.test(raw);
  const msg = isHex ? raw.replace(/^0x/, '') : Buffer.from(raw, 'utf8').toString('hex');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainMethodMap: Record<string, () => Promise<any>> = {
    evm: () => sdk.evmSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    btc: () => sdk.btcSignMessage(connectId, deviceId, { path, messageHex: msg, coin: 'btc', ...commonParams }),
    sol: () => sdk.solSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    tron: () => sdk.tronSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    aptos: () =>
      sdk.aptosSignMessage(connectId, deviceId, { path, payload: { message: msg } as any, ...commonParams }),
    sui: () => sdk.suiSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    conflux: () => sdk.confluxSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    starcoin: () => sdk.starcoinSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    ton: () => {
      const tonParams = JSON.parse(msg);
      return sdk.tonSignMessage(connectId, deviceId, { path, ...tonParams, ...commonParams });
    },
    nostr: () => {
      const event = JSON.parse(msg);
      return sdk.nostrSignEvent(connectId, deviceId, { path, event, ...commonParams });
    },
    scdo: () => sdk.scdoSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    alephium: () =>
      sdk.alephiumSignMessage(connectId, deviceId, {
        path,
        messageHex: msg,
        messageType: 'alephium',
        ...commonParams,
      }),
    benfen: () => sdk.benfenSignMessage(connectId, deviceId, { path, messageHex: msg, ...commonParams }),
    // Cardano: uses `message` field, requires networkId
    cardano: () =>
      sdk.cardanoSignMessage(connectId, deviceId, {
        path,
        message: msg,
        derivationType: 1,
        networkId: 1,
        ...commonParams,
      }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(
      `signMessage not supported for chain: ${chain}. Supported: ${Object.keys(chainMethodMap).join(
        ', '
      )}`
    );
  }

  const result = await method();
  return { ...(result as object), chain, path };
}

export interface BatchGetAddressParams extends CommonCLIParams {
  bundle: Array<{
    chain: string;
    path?: string;
    showOnDevice?: boolean;
  }>;
}

export async function resolveBatchGetAddress(sdk: CoreApi, params: BatchGetAddressParams) {
  // #13 FIX: Collect per-item results with error handling for partial failures
  const results: Array<Record<string, unknown>> = [];
  for (const item of params.bundle) {
    try {
      const result = await resolveGetAddress(sdk, {
        chain: item.chain,
        path: item.path,
        showOnDevice: item.showOnDevice ?? false,
        connectId: params.connectId,
        deviceId: params.deviceId,
        passphraseState: params.passphraseState,
        useEmptyPassphrase: params.useEmptyPassphrase,
      });
      results.push(result);
    } catch (err) {
      results.push({
        chain: item.chain,
        path: item.path,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const allSuccess = results.every(r => r.success !== false);
  return { success: allSuccess, addresses: results };
}
