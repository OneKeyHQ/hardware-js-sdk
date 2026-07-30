import { TypedDataEncoder } from 'ethers';

import {
  type EthereumSignTypedDataTypes,
  encodeData,
  getFieldType,
  parseArrayType,
} from './eip712';
import {
  type TrezorChainContext,
  assertHexString,
  createInvalidParamsError,
  createMethodNotSupportedError,
  formatAnyHex,
  parseBip32Path,
  readNumber,
  readString,
} from './utils';

import type {
  EvmAddress,
  EvmEthereumDefinitions,
  EvmGetAddressParams,
  EvmPaymentRequest,
  EvmPaymentRequestMemo,
  EvmSignMsgParams,
  EvmSignTxTrezorParams,
  EvmSignTypedDataFull,
  EvmSignTypedDataHash,
  EvmSignTypedDataParams,
  EvmSignature,
  EvmSignedTx,
} from '@onekeyfe/hwk-adapter-core';

const MAX_DATA_CHUNK_BYTES = 1024;

type TrezorSignTypedHashParams = Omit<EvmSignTypedDataHash, 'messageHash'> & {
  messageHash?: string;
};

export async function evmGetAddress(ctx: TrezorChainContext, params: unknown): Promise<EvmAddress> {
  const request = readEvmGetAddressParams(params);
  const requestMessage: Record<string, unknown> = {
    address_n: parseBip32Path(request.path),
    show_display: request.showOnDevice ?? false,
  };
  const encodedNetwork = resolveEvmEncodedNetwork(request);
  if (encodedNetwork !== undefined) {
    requestMessage.encoded_network = encodedNetwork;
  }
  const response = await ctx.deviceSession.call('EthereumGetAddress', requestMessage);

  if (response.type !== 'EthereumAddress') {
    throw new Error(`Expected EthereumAddress response, received ${response.type}`);
  }

  const { message } = response;
  const address = readString(message, 'address');
  if (!address) {
    throw new Error('EthereumAddress response did not include an address');
  }

  return {
    address,
    path: request.path,
  };
}

/**
 * Single normalization chokepoint for outgoing EVM sign-tx params: route every
 * hex `bytes` field through `formatAnyHex` so builders never see odd nibbles.
 * Whitelisted by field — path/chainId/txType/paymentRequest/ethereumDefinitions
 * are non-hex and left untouched. Add future EVM param massaging HERE.
 */
export function normalizeEvmSignTxHexFields(tx: EvmSignTxTrezorParams): EvmSignTxTrezorParams {
  const hex = (name: string, value: string | undefined): string | undefined => {
    if (value === undefined) return undefined;
    assertHexString(name, value);
    return formatAnyHex(value) as string;
  };
  if (tx.data !== undefined) {
    assertHexString('data', tx.data);
  }
  // accessList is nested, so the top-level field whitelist above cannot see
  // its hex values; without per-item validation an invalid character would
  // survive until protobuf's Buffer.from(value, 'hex') silently truncates it
  // and the device signs a different access list than the caller sent.
  tx.accessList?.forEach((entry, i) => {
    assertHexString(`accessList[${i}].address`, entry.address);
    entry.storageKeys?.forEach((key, j) => {
      assertHexString(`accessList[${i}].storageKeys[${j}]`, key);
    });
  });
  return {
    ...tx,
    value: hex('value', tx.value),
    nonce: hex('nonce', tx.nonce),
    gasLimit: hex('gasLimit', tx.gasLimit),
    gasPrice: hex('gasPrice', tx.gasPrice),
    maxFeePerGas: hex('maxFeePerGas', tx.maxFeePerGas),
    maxPriorityFeePerGas: hex('maxPriorityFeePerGas', tx.maxPriorityFeePerGas),
    accessList: tx.accessList
      ? (formatAnyHex(tx.accessList) as EvmSignTxTrezorParams['accessList'])
      : tx.accessList,
  };
}

export async function evmSignTransaction(
  ctx: TrezorChainContext,
  params: unknown
): Promise<EvmSignedTx> {
  const tx = normalizeEvmSignTxHexFields(readEvmSignTxParams(params));
  const addressN = parseBip32Path(tx.path);
  const isEip1559 = tx.maxFeePerGas !== undefined || tx.maxPriorityFeePerGas !== undefined;

  if (isEip1559) {
    return signEip1559(ctx, addressN, tx);
  }
  return signLegacy(ctx, addressN, tx);
}

async function signLegacy(
  ctx: TrezorChainContext,
  addressN: number[],
  tx: EvmSignTxTrezorParams
): Promise<EvmSignedTx> {
  if (tx.chainId === undefined) {
    throw createInvalidParamsError(
      'evmSignTransaction: chainId is required for legacy transactions'
    );
  }
  if ((tx.accessList?.length ?? 0) > 0) {
    throw createMethodNotSupportedError(
      'evmSignTransaction: non-empty accessList is not supported for legacy typed transactions'
    );
  }
  const dataHex = stripHexPrefix(tx.data ?? '');
  const dataByteLength = dataHex.length / 2;
  const [firstChunk, rest] = sliceHex(dataHex, MAX_DATA_CHUNK_BYTES * 2);

  const message: Record<string, unknown> = {
    address_n: addressN,
    nonce: trezorHexAmount(tx.nonce),
    gas_price: trezorHexAmount(tx.gasPrice),
    gas_limit: trezorHexAmount(tx.gasLimit),
    value: trezorHexAmount(tx.value),
    chain_id: tx.chainId,
    supports_definition_request: true,
  };
  if (tx.paymentRequest) {
    message.payment_req = evmPaymentRequestToTrezor(tx.paymentRequest);
  }
  if (tx.ethereumDefinitions) {
    message.definitions = evmEthereumDefinitionsToTrezor(tx.ethereumDefinitions);
  }
  if (tx.to) {
    message.to = tx.to;
  }
  if (tx.txType !== undefined) {
    message.tx_type = tx.txType;
  }
  if (dataByteLength > 0) {
    message.data_length = dataByteLength;
    message.data_initial_chunk = firstChunk;
  }

  const initial = await ctx.deviceSession.call('EthereumSignTx', message);
  return processTxRequest(ctx, initial, rest, tx.chainId);
}

async function signEip1559(
  ctx: TrezorChainContext,
  addressN: number[],
  tx: EvmSignTxTrezorParams
): Promise<EvmSignedTx> {
  if (tx.chainId === undefined) {
    throw createInvalidParamsError(
      'evmSignTransaction: chainId is required for EIP-1559 transactions'
    );
  }
  if (tx.maxFeePerGas === undefined || tx.maxPriorityFeePerGas === undefined) {
    throw createInvalidParamsError(
      'evmSignTransaction: EIP-1559 requires both maxFeePerGas and maxPriorityFeePerGas'
    );
  }
  const dataHex = stripHexPrefix(tx.data ?? '');
  const dataByteLength = dataHex.length / 2;
  const [firstChunk, rest] = sliceHex(dataHex, MAX_DATA_CHUNK_BYTES * 2);

  const message: Record<string, unknown> = {
    address_n: addressN,
    nonce: trezorHexAmount(tx.nonce),
    max_gas_fee: trezorHexAmount(tx.maxFeePerGas),
    max_priority_fee: trezorHexAmount(tx.maxPriorityFeePerGas),
    gas_limit: trezorHexAmount(tx.gasLimit),
    value: trezorHexAmount(tx.value),
    data_length: dataByteLength,
    data_initial_chunk: firstChunk,
    chain_id: tx.chainId,
    access_list: (tx.accessList ?? []).map(entry => ({
      address: entry.address,
      storage_keys: entry.storageKeys,
    })),
    supports_definition_request: true,
  };
  if (tx.paymentRequest) {
    message.payment_req = evmPaymentRequestToTrezor(tx.paymentRequest);
  }
  if (tx.ethereumDefinitions) {
    message.definitions = evmEthereumDefinitionsToTrezor(tx.ethereumDefinitions);
  }
  if (tx.to) {
    message.to = tx.to;
  }

  const initial = await ctx.deviceSession.call('EthereumSignTxEIP1559', message);
  // EIP-1559 returns v as raw y_parity (0/1); skip EIP-155 adjustment.
  return processTxRequest(ctx, initial, rest, undefined);
}

/**
 * Multi-step TxRequest loop. Trezor responds with EthereumTxRequest that
 * either (a) carries the final signature, or (b) requests another data
 * chunk of `data_length` bytes (which we satisfy with EthereumTxAck).
 * Mirrors 1K's processTxRequest.
 */
async function processTxRequest(
  ctx: TrezorChainContext,
  initialResponse: { type: string; message: Record<string, unknown> },
  remainingData: string,
  chainIdForLegacyV: number | undefined
): Promise<EvmSignedTx> {
  let response = initialResponse;
  let remaining = remainingData;

  // Backstop against a device that never returns the final (data_length === 0)
  // response: data rounds ≤ bytes left to send, plus slack for definition/final
  // rounds. Generous enough to never trip legitimate signing.
  const maxRounds = Math.ceil(remainingData.length / 2) + 64;
  let rounds = 0;

  for (;;) {
    rounds += 1;
    if (rounds > maxRounds) {
      throw new Error(
        `EVM SignTx exceeded ${maxRounds} device rounds; aborting to avoid a hung or hostile device`
      );
    }
    if (response.type === 'EthereumDefinitionRequest') {
      response = await processDefinitionRequest(ctx, response.message);
      continue;
    }
    if (response.type !== 'EthereumTxRequest') {
      throw new Error(`Expected EthereumTxRequest, received ${response.type}`);
    }
    const req = response.message;
    const dataLength = readNumber(req, 'data_length');

    if (!dataLength) {
      return buildSignedTx(req, chainIdForLegacyV);
    }

    if (remaining.length === 0) {
      throw new Error('Trezor requested more EVM tx data than was provided');
    }

    const [chunk, nextRest] = sliceHex(remaining, dataLength * 2);
    response = await ctx.deviceSession.call('EthereumTxAck', { data_chunk: chunk });
    remaining = nextRest;
  }
}

async function processDefinitionRequest(
  ctx: TrezorChainContext,
  _request: Record<string, unknown>
): Promise<{ type: string; message: Record<string, unknown> }> {
  // The SDK never fetches Ethereum definitions from the network. Callers inject
  // them via `params.ethereumDefinitions` (see ./ethereumDefinitions helpers),
  // which are sent up-front in the SignTx message. If the device still requests
  // one we weren't given, ack with an empty set so signing proceeds — the device
  // falls back to a generic (chainId / raw amount) confirmation screen.
  return ctx.deviceSession.call('EthereumDefinitionAck', {
    definitions: {},
  }) as Promise<{ type: string; message: Record<string, unknown> }>;
}

function buildSignedTx(
  req: Record<string, unknown>,
  chainIdForLegacyV: number | undefined
): EvmSignedTx {
  let v = readNumber(req, 'signature_v');
  const r = readString(req, 'signature_r');
  const s = readString(req, 'signature_s');
  if (v === undefined || r === undefined || s === undefined) {
    throw new Error('EthereumTxRequest missing signature fields (v, r, or s)');
  }
  // EIP-155 v reconstruction for legacy txs. Caller passes undefined for
  // EIP-1559 so v stays as y_parity (0/1).
  if (chainIdForLegacyV !== undefined && v <= 1) {
    v += 2 * chainIdForLegacyV + 35;
  }
  return {
    v: `0x${v.toString(16)}`,
    r: `0x${r}`,
    s: `0x${s}`,
  };
}

function readEvmSignTxParams(params: unknown): EvmSignTxTrezorParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('evmSignTransaction params must be an object');
  }
  const { path, serializedTx } = params as { path?: unknown; serializedTx?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('evmSignTransaction requires a non-empty path');
  }
  // Reject the Ledger whole-RLP shape loudly: silently ignoring it would
  // rebuild the tx from empty defaults and sign something else entirely.
  if (serializedTx !== undefined) {
    throw createInvalidParamsError(
      'evmSignTransaction (Trezor) consumes structured tx fields; serializedTx is not supported'
    );
  }
  // Don't deep-validate every field — Trezor will reject malformed inputs
  // with a Failure response; we just cast and let chain handlers see the
  // strongly-typed adapter-core params type.
  return params as EvmSignTxTrezorParams;
}

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

/**
 * Format a hex numeric field for Trezor: strip 0x prefix and leading "00"
 * byte pairs. Trezor protobuf accepts an empty string as zero, matching 1K's
 * stripHexStartZeroes behavior. Pass undefined → '' (defaults to zero).
 *
 * Even-length padding (the odd-nibble truncation fix) is handled upstream in
 * `normalizeEvmSignTxHexFields`, so inputs here are already byte-aligned.
 */
function trezorHexAmount(value: string | undefined): string {
  if (value === undefined) return '';
  let v = stripHexPrefix(value);
  while (v.startsWith('00')) v = v.slice(2);
  return v;
}

function sliceHex(hex: string, charsInFirstChunk: number): [string, string] {
  if (hex.length <= charsInFirstChunk) return [hex, ''];
  return [hex.slice(0, charsInFirstChunk), hex.slice(charsInFirstChunk)];
}

function evmPaymentRequestToTrezor(paymentRequest: EvmPaymentRequest): Record<string, unknown> {
  return {
    ...(paymentRequest.nonce !== undefined ? { nonce: paymentRequest.nonce } : {}),
    recipient_name: paymentRequest.recipientName,
    ...(paymentRequest.memos
      ? { memos: paymentRequest.memos.map(evmPaymentRequestMemoToTrezor) }
      : {}),
    ...(paymentRequest.amount !== undefined
      ? { amount: encodePaymentRequestAmount(paymentRequest.amount, 32) }
      : {}),
    signature: paymentRequest.signature,
  };
}

function evmEthereumDefinitionsToTrezor(
  definitions: EvmEthereumDefinitions
): Record<string, ArrayBuffer> {
  return {
    ...(definitions.encodedNetwork !== undefined
      ? { encoded_network: evmDefinitionBytesToArrayBuffer(definitions.encodedNetwork) }
      : {}),
    ...(definitions.encodedToken !== undefined
      ? { encoded_token: evmDefinitionBytesToArrayBuffer(definitions.encodedToken) }
      : {}),
  };
}

function resolveEvmDefinitions(params: {
  ethereumDefinitions?: EvmEthereumDefinitions;
}): Record<string, ArrayBuffer> | undefined {
  // Definitions are caller-injected only — the SDK never fetches them from the
  // network. Callers who want them can fetch via the ./ethereumDefinitions
  // helpers and pass the result as `ethereumDefinitions`.
  if (params.ethereumDefinitions) {
    const definitions = evmEthereumDefinitionsToTrezor(params.ethereumDefinitions);
    if (Object.keys(definitions).length > 0) {
      return definitions;
    }
  }
  return undefined;
}

function resolveEvmEncodedNetwork(params: {
  ethereumDefinitions?: EvmEthereumDefinitions;
}): ArrayBuffer | undefined {
  const definitions = resolveEvmDefinitions(params);
  return definitions?.encoded_network;
}

function evmDefinitionBytesToArrayBuffer(value: ArrayBuffer | string): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value;
  }
  const bytes = Buffer.from(stripHexPrefix(value), 'hex');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function evmPaymentRequestMemoToTrezor(memo: EvmPaymentRequestMemo): Record<string, unknown> {
  return {
    ...(memo.textMemo ? { text_memo: memo.textMemo } : {}),
    ...(memo.textDetailsMemo ? { text_details_memo: memo.textDetailsMemo } : {}),
    ...(memo.refundMemo
      ? {
          refund_memo: {
            address: memo.refundMemo.address,
            ...(memo.refundMemo.addressN ? { address_n: memo.refundMemo.addressN } : {}),
            mac: memo.refundMemo.mac,
          },
        }
      : {}),
    ...(memo.coinPurchaseMemo
      ? {
          coin_purchase_memo: {
            coin_type: memo.coinPurchaseMemo.coinType,
            amount: memo.coinPurchaseMemo.amount,
            address: memo.coinPurchaseMemo.address,
            ...(memo.coinPurchaseMemo.addressN
              ? { address_n: memo.coinPurchaseMemo.addressN }
              : {}),
            mac: memo.coinPurchaseMemo.mac,
          },
        }
      : {}),
  };
}

function encodePaymentRequestAmount(value: string, bytesLength: number): string {
  if (!/^\d+$/.test(value)) {
    throw createInvalidParamsError(
      'Invalid PaymentRequest.amount: expected a decimal string in subunits'
    );
  }
  const max = 1n << BigInt(bytesLength * 8);
  let amount = BigInt(value);
  if (amount >= max) {
    throw createInvalidParamsError(
      `Invalid PaymentRequest.amount: value does not fit in ${bytesLength} bytes`
    );
  }
  const bytes: string[] = [];
  for (let i = 0; i < bytesLength; i += 1) {
    bytes.push(
      Number(amount & 0xffn)
        .toString(16)
        .padStart(2, '0')
    );
    amount >>= 8n;
  }
  return bytes.join('');
}

/**
 * EIP-712 typed-data signing. Trezor supports two flows:
 *
 *   - **hash mode** (single round trip): caller pre-computes the
 *     domain-separator hash + message hash and we ship them to
 *     EthereumSignTypedHash. Used everywhere the dApp already has the
 *     hashes (most production signers do).
 *   - **full mode** (multi round trip): we walk the EIP-712 type tree and
 *     stream each struct definition + leaf value as the device requests it
 *     (see {@link signTypedDataFull}). Used when only the raw typed data is
 *     available; this is the default when `mode` is omitted.
 */
export async function evmSignTypedData(
  ctx: TrezorChainContext,
  params: unknown
): Promise<EvmSignature> {
  const request = readEvmSignTypedDataParams(params);
  if (request.mode === 'hash') {
    return signTypedHash(ctx, request);
  }
  if (isTrezorOne(ctx)) {
    const callerHashes = getCallerProvidedTypedDataHashes(request);
    if (callerHashes) {
      return signTypedHash(ctx, {
        path: request.path,
        mode: 'hash',
        chainId: request.chainId,
        ethereumDefinitions: request.ethereumDefinitions,
        ...callerHashes,
      });
    }
    if (request.metamaskV4Compat === false) {
      throw createMethodNotSupportedError(
        'Trezor One typed-data signing requires hash mode for non-v4 payloads'
      );
    }
    return signTypedHash(ctx, {
      path: request.path,
      mode: 'hash',
      chainId: request.chainId,
      ethereumDefinitions: request.ethereumDefinitions,
      ...buildTypedDataHashes(request),
    });
  }
  return signTypedDataFull(ctx, request);
}

function isTrezorOne(ctx: TrezorChainContext): boolean {
  return ctx.deviceSession.features?.internal_model === 'T1B1';
}

function getCallerProvidedTypedDataHashes(
  request: EvmSignTypedDataFull
): { domainSeparatorHash: string; messageHash?: string } | undefined {
  const { domainSeparatorHash, messageHash } = request;
  if (domainSeparatorHash === undefined && messageHash === undefined) {
    return undefined;
  }
  if (typeof domainSeparatorHash !== 'string' || domainSeparatorHash.length === 0) {
    throw createInvalidParamsError(
      'evmSignTypedData requires domainSeparatorHash when messageHash is provided'
    );
  }
  if (request.data.primaryType !== 'EIP712Domain' && typeof messageHash !== 'string') {
    throw createInvalidParamsError(
      'evmSignTypedData requires messageHash unless primaryType is EIP712Domain'
    );
  }
  if (request.data.primaryType === 'EIP712Domain' && messageHash !== undefined) {
    throw createInvalidParamsError(
      'evmSignTypedData messageHash must be omitted for EIP712Domain payloads'
    );
  }
  return { domainSeparatorHash, messageHash };
}

function buildTypedDataHashes(request: EvmSignTypedDataFull): {
  domainSeparatorHash: string;
  messageHash?: string;
} {
  const { domain, types, primaryType, message } = request.data;
  const { EIP712Domain: _domainType, ...messageTypes } = types;
  const hashes: {
    domainSeparatorHash: string;
    messageHash?: string;
  } = {
    domainSeparatorHash: TypedDataEncoder.hashDomain(domain),
  };
  if (primaryType !== 'EIP712Domain') {
    hashes.messageHash = TypedDataEncoder.hashStruct(primaryType, messageTypes, message);
  }
  return hashes;
}

/**
 * Full-mode EIP-712: device walks the type tree asking us for each struct
 * definition (EthereumTypedDataStructRequest) and each leaf value at a
 * `member_path` (EthereumTypedDataValueRequest). We respond with the
 * matching StructAck / ValueAck until EthereumTypedDataSignature lands.
 *
 * Mirrors 1K's EVMSignTypedData.handleSignTypedData.
 *
 * member_path is a sequence of indices through the EIP-712 tree:
 *   - rootIndex 0 → domain (EIP712Domain), 1 → message (primaryType).
 *   - subsequent indices step into struct fields (by field index) or into
 *     array elements (by element index).
 *   - when memberData is an array, the device first asks for length at the
 *     array's own path (we encode as uint16); subsequent paths drill into
 *     elements.
 */
async function signTypedDataFull(
  ctx: TrezorChainContext,
  request: EvmSignTypedDataFull
): Promise<EvmSignature> {
  const addressN = parseBip32Path(request.path);
  const { types, primaryType, domain, message } = request.data;
  const typedTypes = types as EthereumSignTypedDataTypes;
  const metamaskV4Compat = request.metamaskV4Compat ?? true;
  const definitions = resolveEvmDefinitions(request);
  const showMessageHash = request.showMessageHash ?? primaryType === 'SafeTx';

  let response = await ctx.deviceSession.call('EthereumSignTypedData', {
    address_n: addressN,
    primary_type: primaryType,
    metamask_v4_compat: metamaskV4Compat,
    ...(definitions ? { definitions } : {}),
    ...(showMessageHash && request.messageHash
      ? { show_message_hash: stripHexPrefix(request.messageHash) }
      : {}),
  });

  while (response.type === 'EthereumTypedDataStructRequest') {
    const reqMsg = response.message;
    const typeName = readString(reqMsg, 'name');
    if (!typeName) {
      throw new Error('EthereumTypedDataStructRequest missing `name`');
    }
    const typeDef = typedTypes[typeName];
    if (!typeDef) {
      throw new Error(`EIP-712: type "${typeName}" requested by device but not in types`);
    }
    response = await ctx.deviceSession.call('EthereumTypedDataStructAck', {
      members: typeDef.map(({ name, type }) => ({
        name,
        type: getFieldType(type, typedTypes),
      })),
    });
  }

  while (response.type === 'EthereumTypedDataValueRequest') {
    const reqMsg = response.message;
    const memberPath = reqMsg.member_path as number[];
    if (!Array.isArray(memberPath) || memberPath.length === 0) {
      throw new Error('EthereumTypedDataValueRequest missing member_path');
    }

    let memberData: unknown;
    let memberTypeName: string;
    const [rootIndex, ...nested] = memberPath;
    if (rootIndex === 0) {
      memberData = domain;
      memberTypeName = 'EIP712Domain';
    } else if (rootIndex === 1) {
      memberData = message;
      memberTypeName = primaryType;
    } else {
      throw new Error(`EIP-712 member_path root index must be 0 or 1, got ${rootIndex}`);
    }

    for (const index of nested) {
      if (Array.isArray(memberData)) {
        memberTypeName = parseArrayType(memberTypeName).entryTypeName;
        memberData = memberData[index];
      } else if (memberData !== null && typeof memberData === 'object') {
        const def = typedTypes[memberTypeName]?.[index];
        if (!def) {
          throw new Error(
            `EIP-712 member_path: no member at index ${index} of type "${memberTypeName}"`
          );
        }
        memberTypeName = def.type;
        memberData = (memberData as Record<string, unknown>)[def.name];
      } else {
        throw new Error('EIP-712 member_path: cannot traverse into a leaf value');
      }
    }

    const value = Array.isArray(memberData)
      ? encodeData('uint16', memberData.length)
      : encodeData(memberTypeName, memberData);

    response = await ctx.deviceSession.call('EthereumTypedDataValueAck', { value });
  }

  if (response.type !== 'EthereumTypedDataSignature') {
    throw new Error(`Expected EthereumTypedDataSignature, received ${response.type}`);
  }

  const msg = response.message;
  const signature = readString(msg, 'signature');
  if (!signature) {
    throw new Error('EthereumTypedDataSignature response did not include a signature');
  }
  return {
    signature: signature.startsWith('0x') ? signature : `0x${signature}`,
    address: readString(msg, 'address'),
  };
}

async function signTypedHash(
  ctx: TrezorChainContext,
  params: TrezorSignTypedHashParams
): Promise<EvmSignature> {
  const requestMessage: Record<string, unknown> = {
    address_n: parseBip32Path(params.path),
    domain_separator_hash: stripHexPrefix(params.domainSeparatorHash),
  };
  if (params.messageHash !== undefined) {
    requestMessage.message_hash = stripHexPrefix(params.messageHash);
  }
  const encodedNetwork = resolveEvmEncodedNetwork(params);
  if (encodedNetwork !== undefined) {
    requestMessage.encoded_network = encodedNetwork;
  }

  const response = await ctx.deviceSession.call('EthereumSignTypedHash', requestMessage);

  if (response.type !== 'EthereumTypedDataSignature') {
    throw new Error(`Expected EthereumTypedDataSignature response, received ${response.type}`);
  }

  const { message } = response;
  const signature = readString(message, 'signature');
  if (!signature) {
    throw new Error('EthereumTypedDataSignature response did not include a signature');
  }

  return {
    signature: signature.startsWith('0x') ? signature : `0x${signature}`,
    address: readString(message, 'address'),
  };
}

function readEvmSignTypedDataParams(params: unknown): EvmSignTypedDataParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('evmSignTypedData params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('evmSignTypedData requires a non-empty path');
  }
  const { mode } = params as { mode?: unknown };
  if (mode === 'hash') {
    const dsh = (params as { domainSeparatorHash?: unknown }).domainSeparatorHash;
    const mh = (params as { messageHash?: unknown }).messageHash;
    if (typeof dsh !== 'string') {
      throw createInvalidParamsError("evmSignTypedData (mode 'hash') requires domainSeparatorHash");
    }
    if (typeof mh !== 'string') {
      throw createInvalidParamsError("evmSignTypedData (mode 'hash') requires messageHash");
    }
    return {
      path,
      mode: 'hash',
      chainId: (params as EvmSignTypedDataHash).chainId,
      domainSeparatorHash: dsh,
      messageHash: mh,
      ethereumDefinitions: (params as EvmSignTypedDataHash).ethereumDefinitions,
    };
  }
  // 'full' or undefined defaults to 'full' per adapter contract. Deep field
  // validation is left to signTypedDataFull as it walks the EIP-712 type tree.
  return params as EvmSignTypedDataParams;
}

export async function evmSignMessage(
  ctx: TrezorChainContext,
  params: unknown
): Promise<EvmSignature> {
  const request = readEvmSignMessageParams(params);
  const requestMessage: Record<string, unknown> = {
    address_n: parseBip32Path(request.path),
    message: normalizeEthMessage(request.message, request.hex ?? false),
  };
  const encodedNetwork = resolveEvmEncodedNetwork(request);
  if (encodedNetwork !== undefined) {
    requestMessage.encoded_network = encodedNetwork;
  }
  const response = await ctx.deviceSession.call('EthereumSignMessage', requestMessage);

  if (response.type !== 'EthereumMessageSignature') {
    throw new Error(`Expected EthereumMessageSignature response, received ${response.type}`);
  }

  const { message } = response;
  const signature = readString(message, 'signature');
  if (!signature) {
    throw new Error('EthereumMessageSignature response did not include a signature');
  }

  return {
    signature: signature.startsWith('0x') ? signature : `0x${signature}`,
    address: readString(message, 'address'),
  };
}

function readEvmGetAddressParams(params: unknown): EvmGetAddressParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('evmGetAddress params must be an object');
  }

  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('evmGetAddress requires a non-empty path');
  }

  const { showOnDevice } = params as { showOnDevice?: unknown };
  if (showOnDevice !== undefined && typeof showOnDevice !== 'boolean') {
    throw createInvalidParamsError('evmGetAddress showOnDevice must be a boolean when provided');
  }

  return {
    path,
    showOnDevice,
    chainId: (params as EvmGetAddressParams).chainId,
    ethereumDefinitions: (params as EvmGetAddressParams).ethereumDefinitions,
  };
}

function readEvmSignMessageParams(params: unknown): EvmSignMsgParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('evmSignMessage params must be an object');
  }

  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('evmSignMessage requires a non-empty path');
  }

  const { message } = params as { message?: unknown };
  if (typeof message !== 'string') {
    throw createInvalidParamsError('evmSignMessage requires message as a string');
  }

  const { hex } = params as { hex?: unknown };
  if (hex !== undefined && typeof hex !== 'boolean') {
    throw createInvalidParamsError('evmSignMessage hex must be a boolean when provided');
  }

  return {
    path,
    message,
    chainId: (params as EvmSignMsgParams).chainId,
    hex,
    ethereumDefinitions: (params as EvmSignMsgParams).ethereumDefinitions,
  };
}

/**
 * Trezor's EthereumSignMessage takes `message` as a protobuf string; for hex
 * inputs we normalize (strip 0x, zero-pad to even length) and pass the hex
 * digits as-is — matches 1K's legacyV1 behavior.
 */
function normalizeEthMessage(message: string, isHex: boolean): string {
  if (!isHex) return message;
  let stripped = message.startsWith('0x') || message.startsWith('0X') ? message.slice(2) : message;
  if (stripped.length % 2 !== 0) stripped = `0${stripped}`;
  if (!/^[0-9a-fA-F]*$/.test(stripped)) {
    throw createInvalidParamsError('evmSignMessage: hex message contains non-hex characters');
  }
  return stripped;
}
