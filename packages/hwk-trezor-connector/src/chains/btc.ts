import {
  type TrezorChainContext,
  createInvalidParamsError,
  createMethodNotSupportedError,
  parseBip32Path,
  readNumber,
  readString,
} from './utils';

import type {
  BtcAddress,
  BtcGetAddressParams,
  BtcGetPublicKeyParams,
  BtcPaymentRequest,
  BtcPaymentRequestMemo,
  BtcPublicKey,
  BtcRefTransaction,
  BtcSignMsgParams,
  BtcSignPsbtParams,
  BtcSignTxParams,
  BtcSignature,
  BtcSignedPsbt,
  BtcSignedTx,
  BtcTxInput,
  BtcTxOutput,
} from '@onekeyfe/hwk-adapter-core';

type BtcScriptType = NonNullable<BtcGetAddressParams['scriptType']>;

const BTC_SCRIPT_TYPE_MAP: Record<BtcScriptType, string> = {
  p2pkh: 'SPENDADDRESS',
  p2sh: 'SPENDP2SHWITNESS',
  p2wpkh: 'SPENDWITNESS',
  p2wsh: 'SPENDWITNESS',
  p2tr: 'SPENDTAPROOT',
};

// Change-output (internal) script types. Distinct from the input map above:
// outputs use the PAYTO* enum, inputs use the SPEND* enum.
const BTC_CHANGE_OUTPUT_SCRIPT_TYPE_MAP: Record<BtcScriptType, string> = {
  p2pkh: 'PAYTOADDRESS',
  p2sh: 'PAYTOP2SHWITNESS',
  p2wpkh: 'PAYTOWITNESS',
  p2wsh: 'PAYTOWITNESS',
  p2tr: 'PAYTOTAPROOT',
};

// Trezor knows coins by their canonical `coin_name` ('Bitcoin', 'Testnet', …),
// not by tickers/short codes. Centralize that mapping here so callers can pass
// a familiar identifier (e.g. the network code 'btc') and the SDK resolves the
// Trezor name. Unknown values pass through (the device validates).
const BTC_COIN_NAME_ALIASES: Record<string, string> = {
  btc: 'Bitcoin',
  bitcoin: 'Bitcoin',
  test: 'Testnet',
  tbtc: 'Testnet',
  testnet: 'Testnet',
  sbtc: 'Signet',
  signet: 'Signet',
  ltc: 'Litecoin',
  litecoin: 'Litecoin',
  doge: 'Dogecoin',
  dogecoin: 'Dogecoin',
  bch: 'Bcash',
  bcash: 'Bcash',
  dash: 'Dash',
};

function normalizeBtcCoin(coin: string | undefined): string {
  if (!coin) return 'Bitcoin';
  return BTC_COIN_NAME_ALIASES[coin.toLowerCase()] ?? coin;
}

// Derive the scriptType from a BIP path's purpose, so callers may omit it.
function deriveScriptTypeFromPath(path: string): BtcScriptType {
  const normalized = path.startsWith('m/') ? path.slice(2) : path;
  const purpose = normalized.split('/')[0]?.replace(/['hH]$/, '');
  switch (purpose) {
    case '86':
      return 'p2tr';
    case '84':
      return 'p2wpkh';
    case '49':
      return 'p2sh';
    case '44':
      return 'p2pkh';
    default:
      return 'p2wpkh';
  }
}

export async function btcGetAddress(ctx: TrezorChainContext, params: unknown): Promise<BtcAddress> {
  const request = readBtcGetAddressParams(params);
  const response = await ctx.deviceSession.call('GetAddress', {
    address_n: parseBip32Path(request.path),
    coin_name: normalizeBtcCoin(request.coin),
    show_display: request.showOnDevice ?? false,
    script_type: BTC_SCRIPT_TYPE_MAP[request.scriptType ?? deriveScriptTypeFromPath(request.path)],
  });

  if (response.type !== 'Address') {
    throw new Error(`Expected Address response, received ${response.type}`);
  }

  const { message } = response;
  const address = readString(message, 'address');
  if (!address) {
    throw new Error('Address response did not include an address');
  }

  return {
    address,
    path: request.path,
  };
}

export async function btcGetPublicKey(
  ctx: TrezorChainContext,
  params: unknown
): Promise<BtcPublicKey> {
  const request = readBtcGetPublicKeyParams(params);
  const response = await ctx.deviceSession.call('GetPublicKey', {
    address_n: parseBip32Path(request.path),
    coin_name: normalizeBtcCoin(request.coin),
    show_display: request.showOnDevice ?? false,
  });
  if (response.type !== 'PublicKey') {
    throw new Error(`Expected PublicKey response, received ${response.type}`);
  }
  return mapPublicKey(response.message, request.path);
}

export async function btcSignMessage(
  ctx: TrezorChainContext,
  params: unknown
): Promise<BtcSignature> {
  const request = readBtcSignMessageParams(params);
  const message: Record<string, unknown> = {
    address_n: parseBip32Path(request.path),
    message: normalizeBtcMessage(request.message, request.hex ?? false),
    coin_name: normalizeBtcCoin(request.coin),
    script_type: BTC_SCRIPT_TYPE_MAP[deriveScriptTypeFromPath(request.path)],
  };
  if (request.noScriptType) {
    message.no_script_type = true;
  }
  const response = await ctx.deviceSession.call('SignMessage', message);
  if (response.type !== 'MessageSignature') {
    throw new Error(`Expected MessageSignature response, received ${response.type}`);
  }
  const msg = response.message;
  const signature = readString(msg, 'signature');
  if (!signature) {
    throw new Error('MessageSignature response did not include a signature');
  }
  return {
    signature,
    address: readString(msg, 'address'),
  };
}

/**
 * Trezor doesn't ship a dedicated GetMasterFingerprint call. We derive it
 * by asking for the public key at the standard BTC account path; Trezor's
 * `PublicKey` includes `root_fingerprint` (the master's BIP-32 fingerprint)
 * regardless of which path we asked about.
 */
export async function btcGetMasterFingerprint(
  ctx: TrezorChainContext
): Promise<{ masterFingerprint: string }> {
  const response = await ctx.deviceSession.call('GetPublicKey', {
    address_n: parseBip32Path("m/44'/0'/0'"),
    coin_name: 'Bitcoin',
    show_display: false,
  });
  if (response.type !== 'PublicKey') {
    throw new Error(`Expected PublicKey response, received ${response.type}`);
  }
  const root = readNumber(response.message, 'root_fingerprint');
  if (root === undefined) {
    throw new Error(
      'btcGetMasterFingerprint: Trezor PublicKey response omitted root_fingerprint — firmware too old?'
    );
  }
  return { masterFingerprint: root.toString(16).padStart(8, '0') };
}

type TxResponse = { type: string; message: Record<string, unknown> };

/**
 * Sign a Bitcoin(-like) transaction via Trezor's multi-step SignTx exchange.
 *
 * Ported from trezor-suite's `packages/connect/src/api/bitcoin/signtx.ts`.
 * The device drives the conversation: after the initial `SignTx`, it emits a
 * `TxRequest` for each piece it needs — current-tx inputs/outputs, and (for
 * non-segwit or amount-verifying paths) the referenced previous transactions'
 * metadata, inputs and outputs. We answer each with the matching typed
 * acknowledgement (modern protocol):
 *
 *   TXINPUT  (no tx_hash) → TxAckInput        | (tx_hash) → TxAckPrevInput
 *   TXOUTPUT (no tx_hash) → TxAckOutput       | (tx_hash) → TxAckPrevOutput
 *   TXMETA                → TxAckPrevMeta
 *   TXFINISHED            → done
 *
 * Per-input signatures and the serialized tx arrive incrementally on the
 * `serialized` field of each `TxRequest`; we accumulate them until TXFINISHED.
 *
 * NOTE: pending real-device verification. Targets modern firmware (all typed
 * TxAck* variants); the legacy single-`TxAck` wrapper path is not wired.
 * Multisig is out of scope of the current adapter params.
 */
/**
 * Upper bound on SignTx TxRequest rounds. The loop is device-driven (OneKey
 * hd-core / trezor-suite set no cap); we keep a generous ceiling only to stop a
 * buggy/hostile device spinning forever. It MUST over-estimate every legitimate
 * tx: the device streams each referenced prev-tx in full (meta + its in/outs +
 * extraData) for every spending input, and legacy signing re-streams the
 * current tx once per input. Sizing from the current tx alone (the old
 * `(in+out+1)*8+64`) wrongly rejects a small tx that spends a large prev-tx.
 */
export function computeSignTxRoundLimit(
  inputsCount: number,
  outputsCount: number,
  refTxs: Iterable<BtcRefTransaction>,
  paymentRequestsCount: number
): number {
  let refTxRounds = 0;
  for (const tx of refTxs) {
    const extraDataBytes = tx.extraData ? tx.extraData.length / 2 : 0;
    refTxRounds +=
      2 + // TXMETA + slack
      tx.inputs.length +
      tx.outputs.length +
      (tx.origInputs?.length ?? 0) +
      (tx.origOutputs?.length ?? 0) +
      Math.ceil(extraDataBytes / 1024);
  }
  const perPassWork = inputsCount + outputsCount + refTxRounds + paymentRequestsCount;
  // (inputs + 2) covers legacy O(inputs²) re-streaming; +2048 absolute slack.
  return (inputsCount + 2) * (perPassWork + 8) + 2048;
}

export async function btcSignTransaction(
  ctx: TrezorChainContext,
  params: unknown
): Promise<BtcSignedTx> {
  const request = readBtcSignTxParams(params);
  const { inputs, outputs } = request;
  const paymentRequests = request.paymentRequests ?? [];
  const refTxs = indexRefTxs(request.refTxs ?? []);

  const serializedParts: string[] = [];
  const signatures: string[] = [];

  const initial: Record<string, unknown> = {
    coin_name: normalizeBtcCoin(request.coin),
    inputs_count: inputs.length,
    outputs_count: outputs.length,
    version: request.version ?? 1,
  };
  if (request.locktime !== undefined) {
    initial.lock_time = request.locktime;
  }
  if (request.timestamp !== undefined) {
    initial.timestamp = request.timestamp;
  }
  if (request.expiry !== undefined) {
    initial.expiry = request.expiry;
  }
  if (request.versionGroupId !== undefined) {
    initial.version_group_id = request.versionGroupId;
  }
  if (request.branchId !== undefined) {
    initial.branch_id = request.branchId;
  }

  let response = (await ctx.deviceSession.call('SignTx', initial)) as TxResponse;

  // Bounded so a misbehaving device (or a buggy ack) can't spin forever.
  const maxRounds = computeSignTxRoundLimit(
    inputs.length,
    outputs.length,
    refTxs.values(),
    paymentRequests.length
  );
  for (let round = 0; round < maxRounds; round += 1) {
    if (response.type !== 'TxRequest') {
      throw new Error(`Expected TxRequest during SignTx, received ${response.type}`);
    }
    const txRequest = response.message;
    saveTxSignatures(txRequest.serialized, serializedParts, signatures);

    const requestType = readString(txRequest, 'request_type');
    if (requestType === 'TXFINISHED') {
      return { serializedTx: serializedParts.join(''), signatures };
    }

    const details = (txRequest.details ?? {}) as Record<string, unknown>;
    const requestIndex = readNumber(details, 'request_index') ?? 0;
    const txHash = readString(details, 'tx_hash');

    response = await sendTxAck(
      ctx,
      requestType,
      requestIndex,
      txHash,
      details,
      inputs,
      outputs,
      paymentRequests,
      refTxs
    );
  }

  throw new Error('btcSignTransaction: device exceeded the expected number of TxRequest rounds');
}

/** Persist the per-input signature and serialized-tx chunk carried on a TxRequest. */
function saveTxSignatures(
  serialized: unknown,
  serializedParts: string[],
  signatures: string[]
): void {
  if (!serialized || typeof serialized !== 'object') return;
  const s = serialized as Record<string, unknown>;
  const chunk = readString(s, 'serialized_tx');
  if (chunk) serializedParts.push(chunk);
  const index = readNumber(s, 'signature_index');
  const signature = readString(s, 'signature');
  if (index !== undefined) {
    if (!signature) {
      throw new Error('saveTxSignatures: Unexpected null in trezor:TxRequestSerialized signature.');
    }
    signatures[index] = signature;
  }
}

async function sendTxAck(
  ctx: TrezorChainContext,
  requestType: string | undefined,
  requestIndex: number,
  txHash: string | undefined,
  details: Record<string, unknown>,
  inputs: BtcTxInput[],
  outputs: BtcTxOutput[],
  paymentRequests: BtcPaymentRequest[],
  refTxs: Map<string, BtcRefTransaction>
): Promise<TxResponse> {
  switch (requestType) {
    case 'TXINPUT': {
      if (txHash) {
        const prev = lookupRefTx(refTxs, txHash);
        const input = prev.inputs[requestIndex];
        if (!input) {
          throw new Error(`SignTx requested prev input ${requestIndex} missing in ${txHash}`);
        }
        return ctx.deviceSession.call('TxAckPrevInput', {
          tx: {
            input: {
              prev_hash: input.prevHash,
              prev_index: input.prevIndex,
              script_sig: input.script,
              sequence: input.sequence,
            },
          },
        }) as Promise<TxResponse>;
      }
      const input = inputs[requestIndex];
      if (!input) throw new Error(`SignTx requested input ${requestIndex} out of range`);
      return ctx.deviceSession.call('TxAckInput', {
        tx: { input: inputToTrezor(input) },
      }) as Promise<TxResponse>;
    }
    case 'TXOUTPUT': {
      if (txHash) {
        const prev = lookupRefTx(refTxs, txHash);
        const output = prev.outputs[requestIndex];
        if (!output) {
          throw new Error(`SignTx requested prev output ${requestIndex} missing in ${txHash}`);
        }
        return ctx.deviceSession.call('TxAckPrevOutput', {
          tx: { output: { amount: output.amount, script_pubkey: output.scriptPubKey } },
        }) as Promise<TxResponse>;
      }
      const output = outputs[requestIndex];
      if (!output) throw new Error(`SignTx requested output ${requestIndex} out of range`);
      return ctx.deviceSession.call('TxAckOutput', {
        tx: { output: outputToTrezor(output) },
      }) as Promise<TxResponse>;
    }
    case 'TXPAYMENTREQ': {
      const paymentRequest = paymentRequests[requestIndex];
      if (!paymentRequest) {
        throw new Error(
          `btcSignTransaction: device requested unknown payment request ${requestIndex}`
        );
      }
      return ctx.deviceSession.call(
        'PaymentRequest',
        paymentRequestToTrezor(paymentRequest)
      ) as Promise<TxResponse>;
    }
    case 'TXORIGINPUT': {
      if (!txHash) throw new Error('SignTx TXORIGINPUT request missing tx_hash');
      const orig = lookupRefTx(refTxs, txHash);
      const input = orig.origInputs?.[requestIndex];
      if (!input) {
        throw new Error(
          `btcSignTransaction: device requested original input ${requestIndex}, but ${txHash} has none`
        );
      }
      return ctx.deviceSession.call('TxAckInput', {
        tx: { input: inputToTrezor(input) },
      }) as Promise<TxResponse>;
    }
    case 'TXORIGOUTPUT': {
      if (!txHash) throw new Error('SignTx TXORIGOUTPUT request missing tx_hash');
      const orig = lookupRefTx(refTxs, txHash);
      const output = orig.origOutputs?.[requestIndex];
      if (!output) {
        throw new Error(
          `btcSignTransaction: device requested original output ${requestIndex}, but ${txHash} has none`
        );
      }
      return ctx.deviceSession.call('TxAckOutput', {
        tx: { output: outputToTrezor(output) },
      }) as Promise<TxResponse>;
    }
    case 'TXMETA': {
      if (!txHash) throw new Error('SignTx TXMETA request missing tx_hash');
      const prev = lookupRefTx(refTxs, txHash);
      const meta: Record<string, unknown> = {
        version: prev.version,
        lock_time: prev.locktime,
        inputs_count: prev.inputs.length,
        outputs_count: prev.outputs.length,
      };
      if (prev.extraData) meta.extra_data_len = prev.extraData.length / 2;
      if (prev.timestamp !== undefined) meta.timestamp = prev.timestamp;
      if (prev.versionGroupId !== undefined) meta.version_group_id = prev.versionGroupId;
      if (prev.expiry !== undefined) meta.expiry = prev.expiry;
      if (prev.branchId !== undefined) meta.branch_id = prev.branchId;
      return ctx.deviceSession.call('TxAckPrevMeta', {
        tx: meta,
      }) as Promise<TxResponse>;
    }
    case 'TXEXTRADATA': {
      if (!txHash) throw new Error('SignTx TXEXTRADATA request missing tx_hash');
      const prev = lookupRefTx(refTxs, txHash);
      if (typeof prev.extraData !== 'string') {
        throw createMethodNotSupportedError(
          'btcSignTransaction: device requested extra_data, but the matching refTx has none'
        );
      }
      return ctx.deviceSession.call('TxAckPrevExtraData', {
        tx: {
          extra_data_chunk: slicePrevExtraData(prev.extraData, details),
        },
      }) as Promise<TxResponse>;
    }
    default:
      throw new Error(`btcSignTransaction: unsupported TxRequest type "${requestType}"`);
  }
}

function inputToTrezor(input: BtcTxInput): Record<string, unknown> {
  const result: Record<string, unknown> = {
    address_n: parseBip32Path(input.path),
    prev_hash: input.prevHash,
    prev_index: input.prevIndex,
    amount: input.amount,
    script_type: BTC_SCRIPT_TYPE_MAP[input.scriptType ?? deriveScriptTypeFromPath(input.path)],
  };
  if (input.sequence !== undefined) result.sequence = input.sequence;
  if (input.origHash !== undefined) result.orig_hash = input.origHash;
  if (input.origIndex !== undefined) result.orig_index = input.origIndex;
  if (input.scriptSig !== undefined) result.script_sig = input.scriptSig;
  if (input.witness !== undefined) result.witness = input.witness;
  if (input.ownershipProof !== undefined) result.ownership_proof = input.ownershipProof;
  if (input.commitmentData !== undefined) result.commitment_data = input.commitmentData;
  return result;
}

function outputToTrezor(output: BtcTxOutput): Record<string, unknown> {
  const withOutputMetadata = (result: Record<string, unknown>): Record<string, unknown> => {
    if (output.paymentReqIndex !== undefined) {
      result.payment_req_index = output.paymentReqIndex;
    }
    if (output.origHash !== undefined) {
      result.orig_hash = output.origHash;
    }
    if (output.origIndex !== undefined) {
      result.orig_index = output.origIndex;
    }
    return result;
  };
  if (output.opReturnData !== undefined) {
    return withOutputMetadata({
      op_return_data: output.opReturnData,
      amount: output.amount,
      script_type: 'PAYTOOPRETURN',
    });
  }
  if (output.address) {
    return withOutputMetadata({
      address: output.address,
      amount: output.amount,
      script_type: 'PAYTOADDRESS',
    });
  }
  if (output.path) {
    return withOutputMetadata({
      address_n: parseBip32Path(output.path),
      amount: output.amount,
      script_type:
        BTC_CHANGE_OUTPUT_SCRIPT_TYPE_MAP[
          output.scriptType ?? deriveScriptTypeFromPath(output.path)
        ],
    });
  }
  throw createInvalidParamsError(
    'btcSignTransaction output requires either an address or a change path'
  );
}

function paymentRequestToTrezor(paymentRequest: BtcPaymentRequest): Record<string, unknown> {
  return {
    ...(paymentRequest.nonce !== undefined ? { nonce: paymentRequest.nonce } : {}),
    recipient_name: paymentRequest.recipientName,
    ...(paymentRequest.memos
      ? { memos: paymentRequest.memos.map(paymentRequestMemoToTrezor) }
      : {}),
    ...(paymentRequest.amount !== undefined
      ? { amount: encodePaymentRequestAmount(paymentRequest.amount, 8) }
      : {}),
    signature: paymentRequest.signature,
  };
}

function paymentRequestMemoToTrezor(memo: BtcPaymentRequestMemo): Record<string, unknown> {
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

function indexRefTxs(refTxs: BtcRefTransaction[]): Map<string, BtcRefTransaction> {
  const map = new Map<string, BtcRefTransaction>();
  for (const tx of refTxs) {
    map.set(tx.hash.toLowerCase(), tx);
  }
  return map;
}

function lookupRefTx(map: Map<string, BtcRefTransaction>, txHash: string): BtcRefTransaction {
  const tx = map.get(txHash.toLowerCase());
  if (!tx) {
    throw new Error(`btcSignTransaction: device requested unknown previous tx ${txHash}`);
  }
  return tx;
}

function slicePrevExtraData(extraData: string, details: Record<string, unknown>): string {
  const offset = readNumber(details, 'extra_data_offset');
  const length = readNumber(details, 'extra_data_len');
  if (offset === undefined) {
    throw new Error('SignTx TXEXTRADATA request missing extra_data_offset');
  }
  if (length === undefined) {
    throw new Error('SignTx TXEXTRADATA request missing extra_data_len');
  }
  return extraData.substring(offset * 2, (offset + length) * 2);
}

type BtcSignTxRequest = BtcSignTxParams & { inputs: BtcTxInput[]; outputs: BtcTxOutput[] };

function readBtcSignTxParams(params: unknown): BtcSignTxRequest {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('btcSignTransaction params must be an object');
  }
  const p = params as BtcSignTxParams;
  if (!Array.isArray(p.inputs) || p.inputs.length === 0) {
    throw createInvalidParamsError('btcSignTransaction requires a non-empty inputs array');
  }
  if (!Array.isArray(p.outputs) || p.outputs.length === 0) {
    throw createInvalidParamsError('btcSignTransaction requires a non-empty outputs array');
  }
  return p as BtcSignTxRequest;
}

/**
 * Deferred — pending a design decision.
 *
 * Unlike OneKey firmware (which exposes a single `SignPsbt`/`SignedPsbt` call
 * that parses the PSBT on-device), stock Trezor firmware has NO PSBT message:
 * `SignPsbt` is absent from the Trezor protobuf. So a faithful pass-through
 * port (OneKey-style) is impossible here. The only path on a Trezor device is
 * host-side: decode the PSBT → derive SignTx inputs/outputs/refTxs → run
 * {@link btcSignTransaction} → re-embed the partial signatures into the PSBT.
 * That needs a PSBT/bitcoin library (e.g. bitcoinjs-lib) and is net-new code
 * with no upstream reference, so it's gated on an explicit go-ahead.
 */
export async function btcSignPsbt(
  _ctx: TrezorChainContext,
  _params: unknown
): Promise<BtcSignedPsbt> {
  void (null as unknown as BtcSignPsbtParams);
  throw createMethodNotSupportedError(
    'btcSignPsbt is not wired for Trezor — stock Trezor firmware has no SignPsbt message; ' +
      'PSBT signing requires host-side decode → SignTx → re-embed (not yet implemented)'
  );
}

function readBtcGetPublicKeyParams(params: unknown): BtcGetPublicKeyParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('btcGetPublicKey params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('btcGetPublicKey requires a non-empty path');
  }
  const { coin } = params as { coin?: unknown };
  if (coin !== undefined && typeof coin !== 'string') {
    throw createInvalidParamsError('btcGetPublicKey coin must be a string when provided');
  }
  const { showOnDevice } = params as { showOnDevice?: unknown };
  if (showOnDevice !== undefined && typeof showOnDevice !== 'boolean') {
    throw createInvalidParamsError('btcGetPublicKey showOnDevice must be a boolean when provided');
  }
  return { path, coin, showOnDevice };
}

function readBtcSignMessageParams(params: unknown): BtcSignMsgParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('btcSignMessage params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('btcSignMessage requires a non-empty path');
  }
  const { message } = params as { message?: unknown };
  if (typeof message !== 'string') {
    throw createInvalidParamsError('btcSignMessage requires message as a string');
  }
  const { coin } = params as { coin?: unknown };
  if (coin !== undefined && typeof coin !== 'string') {
    throw createInvalidParamsError('btcSignMessage coin must be a string when provided');
  }
  const { hex } = params as { hex?: unknown };
  if (hex !== undefined && typeof hex !== 'boolean') {
    throw createInvalidParamsError('btcSignMessage hex must be a boolean when provided');
  }
  const { noScriptType } = params as { noScriptType?: unknown };
  if (noScriptType !== undefined && typeof noScriptType !== 'boolean') {
    throw createInvalidParamsError('btcSignMessage noScriptType must be a boolean when provided');
  }
  return { path, message, coin, hex, noScriptType };
}

function normalizeBtcMessage(message: string, isHex: boolean): string {
  if (!isHex) return Buffer.from(message, 'utf8').toString('hex');
  let stripped = message.startsWith('0x') || message.startsWith('0X') ? message.slice(2) : message;
  if (stripped.length % 2 !== 0) stripped = `0${stripped}`;
  if (!/^[0-9a-fA-F]*$/.test(stripped)) {
    throw createInvalidParamsError('btcSignMessage: hex message contains non-hex characters');
  }
  return stripped;
}

function mapPublicKey(msg: Record<string, unknown>, path: string): BtcPublicKey {
  const xpub = readString(msg, 'xpub');
  if (!xpub) {
    throw new Error('PublicKey response did not include xpub');
  }
  const node = msg.node as Record<string, unknown> | undefined;
  if (!node || typeof node !== 'object') {
    throw new Error('PublicKey response did not include a node');
  }
  const publicKey = readString(node, 'public_key');
  const chainCode = readString(node, 'chain_code');
  const fingerprint = readNumber(node, 'fingerprint');
  const depth = readNumber(node, 'depth');
  if (!publicKey || !chainCode || fingerprint === undefined || depth === undefined) {
    throw new Error(
      'PublicKey node missing required fields (public_key / chain_code / fingerprint / depth)'
    );
  }
  return {
    xpub,
    publicKey,
    fingerprint,
    chainCode,
    path,
    depth,
  };
}

function readBtcGetAddressParams(params: unknown): BtcGetAddressParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('btcGetAddress params must be an object');
  }

  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('btcGetAddress requires a non-empty path');
  }

  const { coin } = params as { coin?: unknown };
  if (coin !== undefined && typeof coin !== 'string') {
    throw createInvalidParamsError('btcGetAddress coin must be a string when provided');
  }

  const { showOnDevice } = params as { showOnDevice?: unknown };
  if (showOnDevice !== undefined && typeof showOnDevice !== 'boolean') {
    throw createInvalidParamsError('btcGetAddress showOnDevice must be a boolean when provided');
  }

  const { scriptType } = params as { scriptType?: unknown };
  if (scriptType !== undefined && typeof scriptType !== 'string') {
    throw createInvalidParamsError('btcGetAddress scriptType must be a string when provided');
  }
  if (
    scriptType !== undefined &&
    !Object.prototype.hasOwnProperty.call(BTC_SCRIPT_TYPE_MAP, scriptType)
  ) {
    throw createInvalidParamsError('btcGetAddress scriptType is unsupported');
  }

  return {
    path,
    coin,
    showOnDevice,
    scriptType: scriptType as BtcGetAddressParams['scriptType'],
  };
}
