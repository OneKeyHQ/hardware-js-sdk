/**
 * Chain Resolver — maps chain identifiers to the correct SDK API calls.
 * Handles derivation path defaults and chain-specific parameter transformations.
 *
 * Reference: developer-portal docs at
 *   content/en/hardware-sdk/chains/<chain>/<method>.mdx
 *   content/en/hardware-sdk/core-api-guide.mdx (HD path section)
 */

import type { CoreApi } from '@onekeyfe/hd-core';

// Default BIP44 derivation paths per chain
// Sources: developer-portal core-api-guide.mdx + chain-specific docs
const DEFAULT_PATHS: Record<string, string> = {
  evm: "m/44'/60'/0'/0/0",         // EIP-44 standard
  btc: "m/84'/0'/0'/0/0",          // Native SegWit (bech32). Also: m/44' (legacy), m/49' (nested segwit), m/86' (taproot)
  sol: "m/44'/501'/0'/0'",         // Fully hardened per Solana spec
  tron: "m/44'/195'/0'/0/0",
  cosmos: "m/44'/118'/0'/0/0",
  cardano: "m/1852'/1815'/0'/0/0", // Shelley-era
  polkadot: "m/44'/354'/0'/0'/0'",
  aptos: "m/44'/637'/0'/0'/0'",    // Fully hardened
  sui: "m/44'/784'/0'/0'/0'",      // Fully hardened
  near: "m/44'/397'/0'",           // Short path per NEAR spec
  xrp: "m/44'/144'/0'/0/0",
  stellar: "m/44'/148'/0'",
  ton: "m/44'/607'/0'",
  nostr: "m/44'/1237'/0'/0/0",
  filecoin: "m/44'/461'/0'/0/0",
  kaspa: "m/44'/111111'/0'/0/0",
  algo: "m/44'/283'/0'/0/0",
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
    throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(DEFAULT_PATHS).join(', ')}`);
  }
  return path;
}

/**
 * Common params passed to all SDK methods.
 * Reference: packages/core/src/types/api/export.ts (CommonParams)
 *
 * - connectId: USB serial / iOS uuid / Android MAC
 * - deviceId: persistent device ID (changes when seed changes)
 * - passphraseState: for hidden wallet access
 * - useEmptyPassphrase: skip passphrase (standard wallet)
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
  // Common params for passphrase handling
  const commonParams = {
    ...(params.passphraseState ? { passphraseState: params.passphraseState } : {}),
    ...(params.useEmptyPassphrase ? { useEmptyPassphrase: true } : {}),
  };

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    btc: () => sdk.btcGetAddress(connectId, deviceId, { path, showOnOneKey, coin: 'btc', ...commonParams }),
    sol: () => sdk.solGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    tron: () => sdk.tronGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    cosmos: () => sdk.cosmosGetAddress(connectId, deviceId, { path, showOnOneKey, ...commonParams }),
    cardano: () => sdk.cardanoGetAddress(connectId, deviceId, { addressParameters: { path, addressType: 0 }, showOnOneKey, ...commonParams }),
    polkadot: () => sdk.polkadotGetAddress(connectId, deviceId, { path, prefix: 0, showOnOneKey, ...commonParams }),
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
  return { ...result as object, chain, path };
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

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetPublicKey(connectId, deviceId, { path }),
    btc: () => sdk.btcGetPublicKey(connectId, deviceId, { path, coin: 'btc' }),
    aptos: () => sdk.aptosGetPublicKey(connectId, deviceId, { path }),
    cosmos: () => sdk.cosmosGetPublicKey(connectId, deviceId, { path }),
    sui: () => sdk.suiGetPublicKey(connectId, deviceId, { path }),
    starcoin: () => sdk.starcoinGetPublicKey(connectId, deviceId, { path }),
    nostr: () => sdk.nostrGetPublicKey(connectId, deviceId, { path }),
    benfen: () => sdk.benfenGetPublicKey(connectId, deviceId, { path }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`getPublicKey not supported for chain: ${chain}. Supported: ${Object.keys(chainMethodMap).join(', ')}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
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

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    // EVM: accepts transaction object with to/value/data/chainId/nonce/gasLimit/gasPrice or maxFeePerGas/maxPriorityFeePerGas
    // Also supports top-level chainId param per docs
    evm: () => sdk.evmSignTransaction(connectId, deviceId, { path, transaction: tx as any, chainId: tx.chainId as number }),
    // BTC: requires inputs/outputs/refTxs/coin format, NOT raw hex. See btcSignPsbt for PSBT.
    btc: () => sdk.btcSignTransaction(connectId, deviceId, { coin: 'btc', ...tx as any }),
    sol: () => sdk.solSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    tron: () => sdk.tronSignTransaction(connectId, deviceId, { path, transaction: tx as any }),
    cosmos: () => sdk.cosmosSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    aptos: () => sdk.aptosSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    sui: () => sdk.suiSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    near: () => sdk.nearSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    xrp: () => sdk.xrpSignTransaction(connectId, deviceId, { path, transaction: tx as any }),
    stellar: () => sdk.stellarSignTransaction(connectId, deviceId, { path, networkPassphrase: tx.networkPassphrase as string, transaction: tx.transaction as any }),
    polkadot: () => sdk.polkadotSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, network: tx.network as string }),
    filecoin: () => sdk.filecoinSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    kaspa: () => sdk.kaspaSignTransaction(connectId, deviceId, { ...tx as any }),
    algo: () => sdk.algoSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    conflux: () => sdk.confluxSignTransaction(connectId, deviceId, { path, transaction: tx as any }),
    nervos: () => sdk.nervosSignTransaction(connectId, deviceId, { ...tx as any }),
    alephium: () => sdk.alephiumSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    neo: () => sdk.neoSignTransaction(connectId, deviceId, { path, ...tx as any }),
    dnx: () => sdk.dnxSignTransaction(connectId, deviceId, { path, ...tx as any }),
    scdo: () => sdk.scdoSignTransaction(connectId, deviceId, { path, transaction: tx as any }),
    benfen: () => sdk.benfenSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string }),
    nexa: () => sdk.nexaSignTransaction(connectId, deviceId, { ...tx as any }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`signTransaction not supported for chain: ${chain}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
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

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmSignMessage(connectId, deviceId, { path, messageHex: params.message }),
    btc: () => sdk.btcSignMessage(connectId, deviceId, { path, message: params.message, coin: 'btc' }),
    sol: () => sdk.solSignMessage(connectId, deviceId, { path, messageHex: params.message }),
    tron: () => sdk.tronSignMessage(connectId, deviceId, { path, message: params.message }),
    aptos: () => sdk.aptosSignMessage(connectId, deviceId, { path, payload: { message: params.message } as any }),
    sui: () => sdk.suiSignMessage(connectId, deviceId, { path, messageHex: params.message }),
    conflux: () => sdk.confluxSignMessage(connectId, deviceId, { path, message: params.message }),
    starcoin: () => sdk.starcoinSignMessage(connectId, deviceId, { path, message: params.message }),
    // TON: tonSignMessage is actually a transfer-signing method (requires destination/tonAmount/seqno/expireAt).
    // For arbitrary message signing, pass full params via --message as JSON.
    ton: () => {
      const tonParams = JSON.parse(params.message);
      return sdk.tonSignMessage(connectId, deviceId, { path, ...tonParams });
    },
    nostr: () => sdk.nostrSignEvent(connectId, deviceId, { path, event: params.message }),
    scdo: () => sdk.scdoSignMessage(connectId, deviceId, { path, message: params.message }),
    alephium: () => sdk.alephiumSignMessage(connectId, deviceId, { path, messageHex: params.message }),
    benfen: () => sdk.benfenSignMessage(connectId, deviceId, { path, messageHex: params.message }),
    cardano: () => sdk.cardanoSignMessage(connectId, deviceId, { path, payload: params.message, derivationType: 1 }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`signMessage not supported for chain: ${chain}. Supported: ${Object.keys(chainMethodMap).join(', ')}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
}

export interface BatchGetAddressParams extends CommonCLIParams {
  bundle: Array<{
    chain: string;
    path?: string;
    showOnDevice?: boolean;
  }>;
}

export async function resolveBatchGetAddress(sdk: CoreApi, params: BatchGetAddressParams) {
  const results = [];
  for (const item of params.bundle) {
    const result = await resolveGetAddress(sdk, {
      chain: item.chain,
      path: item.path,
      showOnDevice: item.showOnDevice ?? false,
      connectId: params.connectId,
    });
    results.push(result);
  }
  return { success: true, addresses: results };
}
