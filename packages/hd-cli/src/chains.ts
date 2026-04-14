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

import type { AptosSignMessageParams, CoreApi, TonSignMessageParams } from '@onekeyfe/hd-core';

// Types not directly exported from hd-core — extracted from CoreApi signatures
type NostrEvent = Parameters<CoreApi['nostrSignEvent']>[2]['event'];
type AptosMessagePayload = AptosSignMessageParams['payload'];

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
  /** Keep the device session open after the call (for multi-call batches). */
  keepSession?: boolean;
}

/** Extract the passphrase/session fields that every SDK call needs.
 *
 * skipPassphraseCheck:
 *   When only --passphrase is supplied (no --passphrase-state, no --use-empty-passphrase),
 *   the SDK would require passphraseState (error 114) and then try to validate it via
 *   GetPassphraseState — which fails (ActionCancelled 803) because each CLI invocation is a
 *   new process with no cached session. Setting skipPassphraseCheck bypasses both checks,
 *   letting the device passphrase handler do its job normally.
 *
 * keepSession:
 *   When true, the device is NOT released after the call. This is used in batch operations
 *   to avoid the USB close/reopen gap that would otherwise drain the Node.js event loop and
 *   cause the process to exit between batch items.
 */
function extractCommon(params: CommonCLIParams) {
  const skipPassphraseCheck = !params.passphraseState && !params.useEmptyPassphrase;
  return {
    connectId: params.connectId || '',
    deviceId: params.deviceId || '',
    common: {
      passphraseState: params.passphraseState,
      useEmptyPassphrase: params.useEmptyPassphrase,
      skipPassphraseCheck,
      ...(params.keepSession !== undefined ? { keepSession: params.keepSession } : {}),
    },
  };
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
  const { connectId, deviceId, common } = extractCommon(params);

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    btc: () =>
      sdk.btcGetAddress(connectId, deviceId, { path, showOnOneKey, coin: 'btc', ...common }),
    sol: () => sdk.solGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    tron: () => sdk.tronGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    cosmos: () => sdk.cosmosGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    // Cardano requires networkId, protocolMagic, derivationType
    cardano: () =>
      sdk.cardanoGetAddress(connectId, deviceId, {
        addressParameters: { path, addressType: 0 } as any,
        networkId: 1, // mainnet
        protocolMagic: 764824073, // mainnet magic
        derivationType: 1, // Icarus
        showOnOneKey,
        ...common,
      }),
    // Polkadot requires network param
    polkadot: () =>
      sdk.polkadotGetAddress(connectId, deviceId, {
        path,
        prefix: 0,
        network: 'polkadot',
        showOnOneKey,
        ...common,
      }),
    aptos: () => sdk.aptosGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    sui: () => sdk.suiGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    near: () => sdk.nearGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    xrp: () => sdk.xrpGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    stellar: () => sdk.stellarGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    ton: () => sdk.tonGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    filecoin: () => sdk.filecoinGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    kaspa: () =>
      sdk.kaspaGetAddress(connectId, deviceId, { path, showOnOneKey, prefix: 'kaspa', ...common }),
    algo: () => sdk.algoGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    conflux: () => sdk.confluxGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    nervos: () =>
      sdk.nervosGetAddress(connectId, deviceId, { path, showOnOneKey, network: 'ckb', ...common }),
    alephium: () =>
      sdk.alephiumGetAddress(connectId, deviceId, { path, showOnOneKey, group: 0, ...common }),
    neo: () => sdk.neoGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    starcoin: () => sdk.starcoinGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    nem: () =>
      sdk.nemGetAddress(connectId, deviceId, { path, showOnOneKey, network: 104, ...common }),
    dnx: () => sdk.dnxGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    scdo: () => sdk.scdoGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    benfen: () => sdk.benfenGetAddress(connectId, deviceId, { path, showOnOneKey, ...common }),
    nexa: () =>
      sdk.nexaGetAddress(connectId, deviceId, { path, showOnOneKey, prefix: 'nexa', ...common }),
  };

  const method = chainMethodMap[chain];
  if (!method) {
    throw new Error(`getAddress not supported for chain: ${chain}`);
  }

  const result = await method();
  if (result == null) {
    return {
      success: false,
      payload: { error: 'No response from device', code: 'NO_RESPONSE' },
      chain,
      path,
    };
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
  const { connectId, deviceId, common } = extractCommon(params);

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmGetPublicKey(connectId, deviceId, { path, ...common }),
    btc: () => sdk.btcGetPublicKey(connectId, deviceId, { path, coin: 'btc', ...common }),
    aptos: () => sdk.aptosGetPublicKey(connectId, deviceId, { path, ...common }),
    cosmos: () => sdk.cosmosGetPublicKey(connectId, deviceId, { path, ...common }),
    sui: () => sdk.suiGetPublicKey(connectId, deviceId, { path, ...common }),
    starcoin: () => sdk.starcoinGetPublicKey(connectId, deviceId, { path, ...common }),
    nostr: () => sdk.nostrGetPublicKey(connectId, deviceId, { path, ...common }),
    benfen: () => sdk.benfenGetPublicKey(connectId, deviceId, { path, ...common }),
    cardano: () =>
      sdk.cardanoGetPublicKey(connectId, deviceId, { path, derivationType: 1, ...common }),
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
  const tx = params.transaction;
  const { connectId, deviceId, common } = extractCommon(params);

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    // EVM: chainId is inside the transaction object, not top-level
    evm: () =>
      sdk.evmSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...common }),
    // BTC: requires inputs/outputs/refTxs/coin format
    btc: () =>
      sdk.btcSignTransaction(connectId, deviceId, { coin: 'btc', ...(tx as any), ...common }),
    sol: () =>
      sdk.solSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...common }),
    tron: () =>
      sdk.tronSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...common }),
    cosmos: () =>
      sdk.cosmosSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        ...common,
      }),
    aptos: () =>
      sdk.aptosSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...common }),
    sui: () =>
      sdk.suiSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...common }),
    near: () =>
      sdk.nearSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...common }),
    // XRP: implementation reads path + transaction from payload despite type declaration
    // eslint-disable-next-line @typescript-eslint/ban-types
    xrp: () =>
      sdk.xrpSignTransaction(connectId, deviceId, {
        path,
        transaction: tx,
        ...common,
      } as any),
    stellar: () =>
      sdk.stellarSignTransaction(connectId, deviceId, {
        path,
        networkPassphrase: tx.networkPassphrase as string,
        transaction: tx.transaction as any,
        ...common,
      }),
    // Polkadot: requires prefix param
    polkadot: () =>
      sdk.polkadotSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        network: (tx.network as string) || 'polkadot',
        prefix: (tx.prefix as number) ?? 0,
        ...common,
      }),
    filecoin: () =>
      sdk.filecoinSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        ...common,
      }),
    kaspa: () => sdk.kaspaSignTransaction(connectId, deviceId, { ...(tx as any), ...common }),
    algo: () =>
      sdk.algoSignTransaction(connectId, deviceId, { path, rawTx: tx.rawTx as string, ...common }),
    conflux: () =>
      sdk.confluxSignTransaction(connectId, deviceId, { path, transaction: tx as any, ...common }),
    nervos: () => sdk.nervosSignTransaction(connectId, deviceId, { ...(tx as any), ...common }),
    alephium: () =>
      sdk.alephiumSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        ...common,
      }),
    neo: () => sdk.neoSignTransaction(connectId, deviceId, { path, ...(tx as any), ...common }),
    dnx: () => sdk.dnxSignTransaction(connectId, deviceId, { path, ...(tx as any), ...common }),
    // SCDO: flat params (nonce, gasPrice, gasLimit, to, value, data), not wrapped
    scdo: () => sdk.scdoSignTransaction(connectId, deviceId, { path, ...(tx as any), ...common }),
    benfen: () =>
      sdk.benfenSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        ...common,
      }),
    nexa: () => sdk.nexaSignTransaction(connectId, deviceId, { ...(tx as any), ...common }),
    cardano: () => sdk.cardanoSignTransaction(connectId, deviceId, { ...(tx as any), ...common }),
    starcoin: () =>
      sdk.starcoinSignTransaction(connectId, deviceId, {
        path,
        rawTx: tx.rawTx as string,
        ...common,
      }),
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
  const { connectId, deviceId, common } = extractCommon(params);

  // Most chains use `messageHex` (hex-encoded). CLI accepts either:
  // - Explicit hex: must start with "0x" prefix (e.g., "0xdeadbeef")
  // - Plain text: auto-converted to hex (e.g., "hello" → "68656c6c6f")
  // Note: without "0x" prefix, strings like "deadbeef" are treated as plain text.
  const raw = params.message;
  const isHex = /^0x[0-9a-fA-F]+$/.test(raw);
  const msg = isHex ? raw.slice(2) : Buffer.from(raw, 'utf8').toString('hex');

  const chainMethodMap: Record<string, () => Promise<unknown>> = {
    evm: () => sdk.evmSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // BTC: uses messageHex, not message
    btc: () =>
      sdk.btcSignMessage(connectId, deviceId, { path, messageHex: msg, coin: 'btc', ...common }),
    sol: () => sdk.solSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // Tron: uses messageHex
    tron: () => sdk.tronSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    aptos: () =>
      sdk.aptosSignMessage(connectId, deviceId, {
        path,
        payload: { message: msg } as AptosMessagePayload,
        ...common,
      }),
    sui: () => sdk.suiSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // Conflux: uses messageHex
    conflux: () =>
      sdk.confluxSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // Starcoin: uses messageHex
    starcoin: () =>
      sdk.starcoinSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // TON: tonSignMessage is transfer-signing, pass JSON params (uses raw input, not hex)
    ton: () => {
      let tonParams: Record<string, unknown>;
      try {
        tonParams = JSON.parse(raw);
      } catch {
        throw new Error(
          `TON sign-message requires JSON input (e.g. '{"destination":"...","tonAmount":"...","seqno":0}'). Got: ${raw.slice(
            0,
            80
          )}`
        );
      }
      return sdk.tonSignMessage(connectId, deviceId, {
        ...(tonParams as TonSignMessageParams),
        path,
        ...common,
      });
    },
    // Nostr: event must be a NostrEvent object (kind, content, tags, created_at)
    nostr: () => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(raw);
      } catch {
        throw new Error(
          `Nostr sign-event requires JSON input (e.g. '{"kind":1,"content":"...","tags":[],"created_at":0}'). Got: ${raw.slice(
            0,
            80
          )}`
        );
      }
      return sdk.nostrSignEvent(connectId, deviceId, {
        path,
        event: event as NostrEvent,
        ...common,
      });
    },
    // SCDO: uses messageHex
    scdo: () => sdk.scdoSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // Alephium: requires messageType
    alephium: () =>
      sdk.alephiumSignMessage(connectId, deviceId, {
        path,
        messageHex: msg,
        messageType: 'alephium',
        ...common,
      }),
    benfen: () => sdk.benfenSignMessage(connectId, deviceId, { path, messageHex: msg, ...common }),
    // Cardano: uses `message` field, requires networkId
    cardano: () =>
      sdk.cardanoSignMessage(connectId, deviceId, {
        path,
        message: msg,
        derivationType: 1,
        networkId: 1,
        ...common,
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
  // Collect per-item results with error handling for partial failures.
  //
  // keepSession: true is passed for every item except the last. This tells the SDK not to
  // release the USB device between calls. Without it, device.release() closes the USB handle,
  // draining the Node.js event loop (no active libuv handles), causing the process to exit
  // before the next batch item's acquire() can register a new handle.
  const results: Array<Record<string, unknown>> = [];
  const lastIndex = params.bundle.length - 1;
  for (let i = 0; i <= lastIndex; i++) {
    const item = params.bundle[i];
    const isLast = i === lastIndex;
    try {
      const result = await resolveGetAddress(sdk, {
        chain: item.chain,
        path: item.path,
        showOnDevice: item.showOnDevice ?? false,
        connectId: params.connectId,
        deviceId: params.deviceId,
        passphraseState: params.passphraseState,
        useEmptyPassphrase: params.useEmptyPassphrase,
        keepSession: !isLast,
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
