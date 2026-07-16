import { protobufManager } from '@onekeyfe/hwk-trezor-protobuf';

import {
  type TrezorChainContext,
  createInvalidParamsError,
  createMethodNotSupportedError,
  parseBip32Path,
  readString,
} from './utils';

import type {
  TronAddress,
  TronContract,
  TronGetAddressParams,
  TronSignTxParams,
  TronSignature,
  TronSignedTx,
} from '@onekeyfe/hwk-adapter-core';

export async function tronGetAddress(
  ctx: TrezorChainContext,
  params: unknown
): Promise<TronAddress> {
  const request = readTronGetAddressParams(params);
  const response = await ctx.deviceSession.call('TronGetAddress', {
    address_n: parseBip32Path(request.path),
    show_display: request.showOnDevice ?? false,
  });

  if (response.type !== 'TronAddress') {
    throw new Error(`Expected TronAddress response, received ${response.type}`);
  }

  const address = readString(response.message, 'address');
  if (!address) {
    throw new Error('TronAddress response did not include an address');
  }

  return { address, path: request.path };
}

/**
 * Sign a TRON transaction via Trezor's two-step exchange.
 *
 * Ported from trezor-suite's `packages/connect/src/api/tron/api/tronSignTransaction.ts`:
 *   1. `TronSignTx` carries the transaction header (ref block, expiration,
 *      timestamp, fee_limit, data) and the device answers `TronContractRequest`
 *      (an empty marker).
 *   2. We then send the contract-specific message (e.g. `TronTransferContract`)
 *      and the device returns the final `TronSignature`.
 *
 * The external params mirror OneKey's structured `TronTransaction` shape; the
 * device-facing messages follow Trezor's protobuf exactly. Addresses must be
 * hex 0x41-prefixed (the device's native form). `owner_address` is taken from
 * the caller-supplied `ownerAddress` (Trezor expects it on each contract).
 *
 * NOTE: pending real-device verification.
 */
export async function tronSignTransaction(
  ctx: TrezorChainContext,
  params: unknown
): Promise<TronSignedTx> {
  const request = readTronSignTxParams(params);
  const ownerAddress = normalizeTronAddress(request.ownerAddress, 'ownerAddress');
  const { messageName, value } = buildContractMessage(request.contract, ownerAddress);

  const header: Record<string, unknown> = {
    address_n: parseBip32Path(request.path),
    ref_block_bytes: request.refBlockBytes,
    ref_block_hash: request.refBlockHash,
    expiration: request.expiration,
    timestamp: request.timestamp,
  };
  if (request.feeLimit !== undefined) {
    header.fee_limit = assertSafeInt(request.feeLimit, 'feeLimit');
  }
  if (request.data !== undefined) header.data = stripHexPrefix(request.data);

  const ack = await ctx.deviceSession.call('TronSignTx', header);
  if (ack.type !== 'TronContractRequest') {
    throw new Error(`Expected TronContractRequest, received ${ack.type}`);
  }

  const response = await ctx.deviceSession.call(messageName, value);
  if (response.type !== 'TronSignature') {
    throw new Error(`Expected TronSignature, received ${response.type}`);
  }

  const signature = readString(response.message, 'signature');
  if (!signature) {
    throw new Error('TronSignature response did not include a signature');
  }

  // Match Trezor Suite: raw_data reconstruction is best-effort after the device
  // has returned a signature. If host-side encoding fails, callers can still
  // fall back to their original raw_data_hex and use the device signature.
  let serializedTx: string | undefined;
  try {
    serializedTx = reconstructTronRawData(request, messageName, value);
  } catch {
    serializedTx = undefined;
  }
  return serializedTx ? { signature, serializedTx } : { signature };
}

// Contract types the host can re-encode into raw_data. Matches trezor-suite's
// encodeInnerContract coverage; other types return no serializedTx (callers
// fall back to their own raw_data, identical for single-contract txs).
const TRON_RAW_CONTRACT: Record<
  string,
  { typeValue: number; typeUrl: string; includeFeeLimit: boolean }
> = {
  TronTransferContract: {
    typeValue: 1,
    typeUrl: 'type.googleapis.com/protocol.TransferContract',
    includeFeeLimit: false,
  },
  TronTriggerSmartContract: {
    typeValue: 31,
    typeUrl: 'type.googleapis.com/protocol.TriggerSmartContract',
    includeFeeLimit: true,
  },
};

/**
 * Re-encode the TRON `raw_data` from the structured fields, reusing the Trezor
 * protobuf schemas (which are wire-compatible with TRON's native raw_data).
 * Returns the raw_data hex, or undefined for contract types we don't re-encode.
 * The protobuf manager converts the hex address/data strings to bytes fields.
 */
function reconstructTronRawData(
  request: TronStructuredTx,
  contractMessageName: string,
  contractValue: Record<string, unknown>
): string | undefined {
  const info = TRON_RAW_CONTRACT[contractMessageName];
  if (!info) return undefined;

  const innerBytes = protobufManager.encode(contractMessageName, contractValue).message;
  const rawData: Record<string, unknown> = {
    ref_block_bytes: request.refBlockBytes,
    ref_block_hash: request.refBlockHash,
    expiration: request.expiration,
    timestamp: request.timestamp,
    contract: [
      {
        type: info.typeValue,
        parameter: { type_url: info.typeUrl, value: innerBytes.toString('hex') },
      },
    ],
  };
  // fee_limit only belongs in raw_data for smart-contract calls (TRON ignores
  // it on transfers); matches the firmware's own reconstruction.
  if (info.includeFeeLimit && request.feeLimit !== undefined) {
    rawData.fee_limit = request.feeLimit;
  }
  if (request.data) {
    rawData.data = stripHexPrefix(request.data);
  }
  return protobufManager.encode('TronRawTransaction', rawData).message.toString('hex');
}

/**
 * Trezor firmware does not implement TRON message signing. The protobuf
 * has no TronSignMessage / TronMessageSignature — 1K's TronSignMessage
 * uses an OneKey-only extension that pure Trezor devices don't have.
 */
export async function tronSignMessage(
  _ctx: TrezorChainContext,
  _params: unknown
): Promise<TronSignature> {
  throw createMethodNotSupportedError(
    'Trezor firmware does not support TRON message signing — only tronGetAddress and tronSignTransaction are available'
  );
}

/** Map the structured contract onto its Trezor protobuf message + payload. */
function buildContractMessage(
  contract: TronContract,
  ownerAddress: string
): { messageName: string; value: Record<string, unknown> } {
  if (contract.transferContract) {
    const c = contract.transferContract;
    return {
      messageName: 'TronTransferContract',
      value: {
        owner_address: ownerAddress,
        to_address: normalizeTronAddress(c.toAddress, 'transferContract.toAddress'),
        amount: toUintString(c.amount, 'transferContract.amount'),
      },
    };
  }
  if (contract.triggerSmartContract) {
    const c = contract.triggerSmartContract;
    return {
      messageName: 'TronTriggerSmartContract',
      value: {
        owner_address: ownerAddress,
        contract_address: normalizeTronAddress(
          c.contractAddress,
          'triggerSmartContract.contractAddress'
        ),
        data: stripHexPrefix(c.data),
      },
    };
  }
  if (contract.freezeBalanceV2Contract) {
    const c = contract.freezeBalanceV2Contract;
    const value: Record<string, unknown> = {
      owner_address: ownerAddress,
      balance: assertSafeInt(c.balance, 'freezeBalanceV2Contract.balance'),
    };
    if (c.resource !== undefined) value.resource = c.resource;
    return { messageName: 'TronFreezeBalanceV2Contract', value };
  }
  if (contract.unfreezeBalanceV2Contract) {
    const c = contract.unfreezeBalanceV2Contract;
    const value: Record<string, unknown> = {
      owner_address: ownerAddress,
      balance: assertSafeInt(c.balance, 'unfreezeBalanceV2Contract.balance'),
    };
    if (c.resource !== undefined) value.resource = c.resource;
    return { messageName: 'TronUnfreezeBalanceV2Contract', value };
  }
  if (contract.voteWitnessContract) {
    const c = contract.voteWitnessContract;
    return {
      messageName: 'TronVoteWitnessContract',
      value: {
        owner_address: ownerAddress,
        votes: c.votes.map((vote, i) => ({
          address: normalizeTronAddress(vote.voteAddress, `voteWitnessContract.votes[${i}]`),
          count: assertSafeInt(vote.voteCount, `voteWitnessContract.votes[${i}].voteCount`),
        })),
      },
    };
  }
  if (contract.withdrawExpireUnfreezeContract) {
    return { messageName: 'TronWithdrawUnfreeze', value: { owner_address: ownerAddress } };
  }
  throw createMethodNotSupportedError(
    'tronSignTransaction: contract must specify exactly one supported contract type ' +
      '(transfer / triggerSmart / freezeBalanceV2 / unfreezeBalanceV2 / voteWitness / withdrawExpireUnfreeze)'
  );
}

/** TRON addresses go to the device as 0x41-prefixed hex (`41` + 20-byte hash). */
function normalizeTronAddress(address: string, field: string): string {
  if (typeof address !== 'string') {
    throw createInvalidParamsError(`tronSignTransaction: ${field} must be a string`);
  }
  const hex = stripHexPrefix(address);
  if (!/^41[0-9a-fA-F]{40}$/.test(hex)) {
    throw createInvalidParamsError(
      `tronSignTransaction: ${field} must be hex 0x41-prefixed (41 + 20 bytes), got "${address}"`
    );
  }
  return hex.toLowerCase();
}

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

/**
 * Coerce a uint64 amount (sun) to a decimal string.
 *
 * TRON's `amount` is a protobuf uint64, so it must cross the SDK's process
 * boundary (postMessage/JSON) and reach the device as a STRING — a JS `number`
 * silently loses precision above 2^53 (≈9e15 < TRON's ~1e17 sun max supply).
 * Accepts a decimal string (preferred) or a safe-integer number; rejects an
 * out-of-range number so we never sign a wrong amount.
 */
function toUintString(value: string | number, field: string): string {
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) {
      throw createInvalidParamsError(
        `tronSignTransaction: ${field} must be a non-negative decimal string`
      );
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw createInvalidParamsError(
        `tronSignTransaction: ${field}=${value} is not a safe integer — pass it as a decimal string to avoid precision loss`
      );
    }
    return String(value);
  }
  throw createInvalidParamsError(`tronSignTransaction: ${field} must be a string or number`);
}

/**
 * Guard a protobuf int (JSON number) field against silent 2^53 precision loss.
 * These fields are `Type.Number()` in the protobuf (the protocol caps them at
 * number precision), so we keep them numeric but refuse an unsafe value.
 */
function assertSafeInt(value: number, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw createInvalidParamsError(
      `tronSignTransaction: ${field}=${value} must be a non-negative safe integer (< 2^53)`
    );
  }
  return value;
}

function readTronGetAddressParams(params: unknown): TronGetAddressParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('tronGetAddress params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('tronGetAddress requires a non-empty path');
  }
  const { showOnDevice } = params as { showOnDevice?: unknown };
  if (showOnDevice !== undefined && typeof showOnDevice !== 'boolean') {
    throw createInvalidParamsError('tronGetAddress showOnDevice must be a boolean when provided');
  }
  return { path, showOnDevice };
}

/** The structured subset Trezor requires, narrowed to non-optional after validation. */
type TronStructuredTx = TronSignTxParams & {
  ownerAddress: string;
  refBlockBytes: string;
  refBlockHash: string;
  expiration: number;
  timestamp: number;
  contract: TronContract;
};

function readTronSignTxParams(params: unknown): TronStructuredTx {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('tronSignTransaction params must be an object');
  }
  const p = params as TronSignTxParams;
  if (typeof p.path !== 'string' || p.path.trim().length === 0) {
    throw createInvalidParamsError('tronSignTransaction requires a non-empty path');
  }
  if (typeof p.ownerAddress !== 'string' || p.ownerAddress.length === 0) {
    throw createInvalidParamsError('tronSignTransaction requires ownerAddress (hex 0x41-prefixed)');
  }
  if (typeof p.refBlockBytes !== 'string' || typeof p.refBlockHash !== 'string') {
    throw createInvalidParamsError(
      'tronSignTransaction requires refBlockBytes and refBlockHash as hex strings'
    );
  }
  if (typeof p.expiration !== 'number' || typeof p.timestamp !== 'number') {
    throw createInvalidParamsError('tronSignTransaction requires numeric expiration and timestamp');
  }
  if (!p.contract || typeof p.contract !== 'object') {
    throw createInvalidParamsError('tronSignTransaction requires a contract object');
  }
  return p as TronStructuredTx;
}
