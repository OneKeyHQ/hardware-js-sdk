/**
 * Chain Resolver — maps chain identifiers to the correct SDK API calls.
 * Handles derivation path defaults and chain-specific parameter transformations.
 */

import type { CoreApi } from '@onekeyfe/hd-core';

// Default BIP44 derivation paths per chain
const DEFAULT_PATHS: Record<string, string> = {
  evm: "m/44'/60'/0'/0/0",
  btc: "m/84'/0'/0'/0/0",
  sol: "m/44'/501'/0'/0'",
  tron: "m/44'/195'/0'/0/0",
  cosmos: "m/44'/118'/0'/0/0",
  cardano: "m/1852'/1815'/0'/0/0",
  polkadot: "m/44'/354'/0'/0'/0'",
  aptos: "m/44'/637'/0'/0'/0'",
  sui: "m/44'/784'/0'/0'/0'",
  near: "m/44'/397'/0'",
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

export interface GetAddressParams {
  chain: string;
  path?: string;
  showOnDevice?: boolean;
  connectId?: string;
}

export async function resolveGetAddress(sdk: CoreApi, params: GetAddressParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const showOnOneKey = params.showOnDevice ?? true;
  const connectId = params.connectId || '';

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetAddress(connectId, '', { path, showOnOneKey }),
    btc: () => sdk.btcGetAddress(connectId, '', { path, showOnOneKey, coin: 'btc' }),
    sol: () => sdk.solGetAddress(connectId, '', { path, showOnOneKey }),
    tron: () => sdk.tronGetAddress(connectId, '', { path, showOnOneKey }),
    cosmos: () => sdk.cosmosGetAddress(connectId, '', { path, showOnOneKey }),
    cardano: () => sdk.cardanoGetAddress(connectId, '', { addressParameters: { path, addressType: 0 }, showOnOneKey }),
    polkadot: () => sdk.polkadotGetAddress(connectId, '', { path, prefix: 0, showOnOneKey }),
    aptos: () => sdk.aptosGetAddress(connectId, '', { path, showOnOneKey }),
    sui: () => sdk.suiGetAddress(connectId, '', { path, showOnOneKey }),
    near: () => sdk.nearGetAddress(connectId, '', { path, showOnOneKey }),
    xrp: () => sdk.xrpGetAddress(connectId, '', { path, showOnOneKey }),
    stellar: () => sdk.stellarGetAddress(connectId, '', { path, showOnOneKey }),
    ton: () => sdk.tonGetAddress(connectId, '', { path, showOnOneKey }),
    filecoin: () => sdk.filecoinGetAddress(connectId, '', { path, showOnOneKey }),
    kaspa: () => sdk.kaspaGetAddress(connectId, '', { path, showOnOneKey, prefix: 'kaspa' }),
    algo: () => sdk.algoGetAddress(connectId, '', { path, showOnOneKey }),
    conflux: () => sdk.confluxGetAddress(connectId, '', { path, showOnOneKey }),
    nervos: () => sdk.nervosGetAddress(connectId, '', { path, showOnOneKey, network: 'ckb' }),
    alephium: () => sdk.alephiumGetAddress(connectId, '', { path, showOnOneKey, group: 0 }),
    neo: () => sdk.neoGetAddress(connectId, '', { path, showOnOneKey }),
    starcoin: () => sdk.starcoinGetAddress(connectId, '', { path, showOnOneKey }),
    nem: () => sdk.nemGetAddress(connectId, '', { path, showOnOneKey, network: 104 }),
    dnx: () => sdk.dnxGetAddress(connectId, '', { path, showOnOneKey }),
    scdo: () => sdk.scdoGetAddress(connectId, '', { path, showOnOneKey }),
    benfen: () => sdk.benfenGetAddress(connectId, '', { path, showOnOneKey }),
    nexa: () => sdk.nexaGetAddress(connectId, '', { path, showOnOneKey, prefix: 'nexa' }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`getAddress not supported for chain: ${chain}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
}

export interface GetPublicKeyParams {
  chain: string;
  path?: string;
  connectId?: string;
}

export async function resolveGetPublicKey(sdk: CoreApi, params: GetPublicKeyParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetPublicKey(connectId, '', { path }),
    btc: () => sdk.btcGetPublicKey(connectId, '', { path, coin: 'btc' }),
    aptos: () => sdk.aptosGetPublicKey(connectId, '', { path }),
    cosmos: () => sdk.cosmosGetPublicKey(connectId, '', { path }),
    sui: () => sdk.suiGetPublicKey(connectId, '', { path }),
    starcoin: () => sdk.starcoinGetPublicKey(connectId, '', { path }),
    nostr: () => sdk.nostrGetPublicKey(connectId, '', { path }),
    benfen: () => sdk.benfenGetPublicKey(connectId, '', { path }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`getPublicKey not supported for chain: ${chain}. Supported: ${Object.keys(chainMethodMap).join(', ')}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
}

export interface SignTransactionParams {
  chain: string;
  path?: string;
  transaction: Record<string, unknown>;
  connectId?: string;
}

export async function resolveSignTransaction(sdk: CoreApi, params: SignTransactionParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';
  const tx = params.transaction;

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmSignTransaction(connectId, '', { path, transaction: tx as any }),
    btc: () => sdk.btcSignTransaction(connectId, '', { ...tx as any }),
    sol: () => sdk.solSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    tron: () => sdk.tronSignTransaction(connectId, '', { path, transaction: tx as any }),
    cosmos: () => sdk.cosmosSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    aptos: () => sdk.aptosSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    sui: () => sdk.suiSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    near: () => sdk.nearSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    xrp: () => sdk.xrpSignTransaction(connectId, '', { path, transaction: tx as any }),
    stellar: () => sdk.stellarSignTransaction(connectId, '', { path, networkPassphrase: tx.networkPassphrase as string, transaction: tx.transaction as any }),
    polkadot: () => sdk.polkadotSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string, network: tx.network as string }),
    filecoin: () => sdk.filecoinSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    kaspa: () => sdk.kaspaSignTransaction(connectId, '', { ...tx as any }),
    algo: () => sdk.algoSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    conflux: () => sdk.confluxSignTransaction(connectId, '', { path, transaction: tx as any }),
    nervos: () => sdk.nervosSignTransaction(connectId, '', { ...tx as any }),
    alephium: () => sdk.alephiumSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    neo: () => sdk.neoSignTransaction(connectId, '', { path, ...tx as any }),
    dnx: () => sdk.dnxSignTransaction(connectId, '', { path, ...tx as any }),
    scdo: () => sdk.scdoSignTransaction(connectId, '', { path, transaction: tx as any }),
    benfen: () => sdk.benfenSignTransaction(connectId, '', { path, rawTx: tx.rawTx as string }),
    nexa: () => sdk.nexaSignTransaction(connectId, '', { ...tx as any }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`signTransaction not supported for chain: ${chain}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
}

export interface SignMessageParams {
  chain: string;
  path?: string;
  message: string;
  connectId?: string;
}

export async function resolveSignMessage(sdk: CoreApi, params: SignMessageParams) {
  const chain = resolveChain(params.chain);
  const path = params.path || getDefaultPath(chain);
  const connectId = params.connectId || '';

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmSignMessage(connectId, '', { path, messageHex: params.message }),
    btc: () => sdk.btcSignMessage(connectId, '', { path, message: params.message, coin: 'btc' }),
    sol: () => sdk.solSignMessage(connectId, '', { path, messageHex: params.message }),
    tron: () => sdk.tronSignMessage(connectId, '', { path, message: params.message }),
    aptos: () => sdk.aptosSignMessage(connectId, '', { path, payload: { message: params.message } as any }),
    sui: () => sdk.suiSignMessage(connectId, '', { path, messageHex: params.message }),
    conflux: () => sdk.confluxSignMessage(connectId, '', { path, message: params.message }),
    starcoin: () => sdk.starcoinSignMessage(connectId, '', { path, message: params.message }),
    ton: () => sdk.tonSignMessage(connectId, '', { path, destination: params.message, tonAmount: 0, seqno: 0, expireAt: 0, comment: params.message }),
    nostr: () => sdk.nostrSignEvent(connectId, '', { path, event: params.message }),
    scdo: () => sdk.scdoSignMessage(connectId, '', { path, message: params.message }),
    alephium: () => sdk.alephiumSignMessage(connectId, '', { path, messageHex: params.message }),
    benfen: () => sdk.benfenSignMessage(connectId, '', { path, messageHex: params.message }),
    cardano: () => sdk.cardanoSignMessage(connectId, '', { path, payload: params.message, derivationType: 1 }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`signMessage not supported for chain: ${chain}. Supported: ${Object.keys(chainMethodMap).join(', ')}`);
  }

  const result = await method();
  return { ...result as object, chain, path };
}

export interface BatchGetAddressParams {
  bundle: Array<{
    chain: string;
    path?: string;
    showOnDevice?: boolean;
  }>;
  connectId?: string;
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
