import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { serialize, zeroSubnetworkID } from './helpers/TransferSerialize';
import { SignatureType } from './helpers/SignatureType';

import type { TypedResponseMessage } from '../../device/DeviceCommands';
import type { KaspaSignTransactionParams, KaspaSignature } from '../../types';
import type {
  KaspaInputScriptType,
  KaspaTxRequest,
  KaspaTxRequestSignature,
  TypedCall,
} from '@onekeyfe/hd-transport';

// Streaming only handles plain P2PK scripts; anything else (e.g. KRC20 P2SH)
// must blind-sign. Absent script means a streaming-only caller.
const P2PK_SCRIPT = /^(20[0-9a-f]{64}ac|21[0-9a-f]{66}ab)$/i;

const isStreamableScript = (script?: string) => !script || P2PK_SCRIPT.test(script);

type KaspaOutputParam = KaspaSignTransactionParams['outputs'][number];

const getOutputAddress = (output: KaspaOutputParam) =>
  'address' in output ? output.address : undefined;

const getOutputAddressN = (output: KaspaOutputParam) =>
  'addressN' in output ? output.addressN : undefined;

export default class KaspaSignTransaction extends BaseMethod<KaspaSignTransactionParams> {
  hasBundle = false;

  // Protocols this tx can be signed with; the device picks via its first response.
  supportsLegacy = false;

  supportsStreaming = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    const payload = this.payload as KaspaSignTransactionParams;

    const payloadInputs = Array.isArray(payload.inputs) ? payload.inputs : [];
    const payloadOutputs = Array.isArray(payload.outputs) ? payload.outputs : [];

    const usesStreamingParams =
      payload.refTxs !== undefined ||
      payload.payload !== undefined ||
      payload.gas !== undefined ||
      payloadInputs.some(input => !input.output?.script) ||
      payloadOutputs.some(output => !!getOutputAddress(output) || !!getOutputAddressN(output));

    // check payload
    validateParams(payload, [
      { name: 'version', type: 'number' },
      { name: 'sigHashType', type: 'number', required: !usesStreamingParams },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true },
      { name: 'lockTime', required: true },
      { name: 'sigOpCount', type: 'number' },
      { name: 'subNetworkID', type: 'string' },
      { name: 'payload', type: 'hexString' },
      { name: 'refTxs', type: 'array', allowEmpty: true },
      { name: 'useTweak', type: 'boolean' },
    ]);

    const inputs: KaspaSignTransactionParams['inputs'] = payload.inputs.map(input => {
      validateParams(input, [
        { name: 'path', type: 'string', required: true },
        { name: 'prevTxId', type: 'string', required: true },
        { name: 'outputIndex', type: 'number', required: true },
        { name: 'sequenceNumber', required: true },
      ]);
      if (usesStreamingParams) {
        validateParams(input.output, [{ name: 'satoshis', required: true }]);
      }

      const addressN = validatePath(input.path, 3);

      return {
        ...input,
        path: addressN,
        sigOpCount: input.sigOpCount ?? 1, // input.script.getSignatureOperationsCount()) //sigOpCount
      };
    });

    payload.refTxs?.forEach(refTx => {
      validateParams(refTx, [
        { name: 'txId', type: 'string', required: true },
        { name: 'version', type: 'number', required: true },
        // Coinbase transactions legitimately have zero inputs.
        { name: 'inputs', type: 'array', required: true, allowEmpty: true },
        { name: 'outputs', type: 'array', required: true, allowEmpty: true },
        { name: 'payload', type: 'hexString' },
      ]);
    });

    const outputs: KaspaSignTransactionParams['outputs'] = payload.outputs.map(output => {
      const addressN = getOutputAddressN(output);
      validateParams(output, [
        { name: 'satoshis', required: true },
        { name: 'address', type: 'string' },
        { name: 'script', type: 'string', required: !usesStreamingParams },
        { name: 'scriptVersion', type: 'number' },
      ]);

      return {
        ...output,
        addressN: addressN ? validatePath(addressN, 3) : undefined,
        scriptVersion: output.scriptVersion ?? 0,
      };
    });

    this.params = {
      ...payload,
      inputs,
      outputs,
      scheme: payload.scheme ?? 'schnorr',
      prefix: payload.prefix ?? 'kaspa',
      // eslint-disable-next-line no-bitwise
      sigHashType: payload.sigHashType ?? SignatureType.SIGHASH_ALL | SignatureType.SIGHASH_FORKID,
      sigOpCount: payload.sigOpCount ?? 1,
      subNetworkID: payload.subNetworkID ?? bytesToHex(zeroSubnetworkID()),
      gas: payload.gas ?? 0,
      useTweak: payload.useTweak,
    };

    // Legacy prehashes on the host with payload/gas/subnetworkID hardcoded to
    // zero (TransferSerialize), so those rule it out.
    this.supportsLegacy =
      this.params.outputs.every(output => !!output.script) &&
      this.params.inputs.every(input => !!input.output.script) &&
      !this.params.payload &&
      Number(this.params.gas ?? 0) === 0 &&
      /^0*$/.test(this.params.subNetworkID ?? '');

    // The streaming protocol has no sighash-type field (device signs SIGHASH_ALL).
    const isDefaultSigHashType =
      this.params.sigHashType === SignatureType.SIGHASH_ALL ||
      // eslint-disable-next-line no-bitwise
      this.params.sigHashType === (SignatureType.SIGHASH_ALL | SignatureType.SIGHASH_FORKID);

    this.supportsStreaming =
      isDefaultSigHashType &&
      this.params.outputs.every(
        output => !!getOutputAddress(output) || !!getOutputAddressN(output)
      ) &&
      this.params.inputs.every(input => isStreamableScript(input.output.script)) &&
      this.params.outputs.every(output => isStreamableScript(output.script));

    if (!this.supportsLegacy && !this.supportsStreaming) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'KaspaSignTransaction: outputs require either address/addressN (streaming protocol) or script (legacy protocol)'
      );
    }
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.3.0',
      },
    };
  }

  getUseTweakVersionRange() {
    return {
      pro: {
        min: '4.14.0',
      },
      model_classic1s: {
        min: '3.12.0',
      },
    };
  }

  /**
   * Legacy blind-sign flow: run() sent input 0's prehash in raw_message; feed
   * each next prehash via KaspaTxInputAck until KaspaSignedTx.
   */
  async processTxRequest(
    typedCall: TypedCall,
    res: TypedResponseMessage<'KaspaTxInputRequest'> | TypedResponseMessage<'KaspaSignedTx'>,
    index: number,
    signature: KaspaSignature[]
  ): Promise<KaspaSignature[]> {
    if (res.type === 'KaspaSignedTx') {
      signature.push({
        index,
        signature: res.message.signature,
      });

      return signature;
    }

    if (res.type === 'KaspaTxInputRequest') {
      signature.push({
        index,
        signature: res.message.signature ?? '',
      });

      const nextIndex = res.message.request_index;

      const { raw: rawMessage } = serialize(this.params, nextIndex);
      const input = this.params.inputs[nextIndex];

      const response = await typedCall(
        'KaspaTxInputAck',
        ['KaspaTxInputRequest', 'KaspaSignedTx'],
        {
          address_n: validatePath(input.path, 3),
          raw_message: bytesToHex(rawMessage),
        }
      );

      return this.processTxRequest(typedCall, response, nextIndex, signature);
    }

    return signature;
  }

  /**
   * Answer a previous-transaction request (selected by prev_tx_id) from
   * refTxs; the device uses them to verify input amounts.
   */
  async ackPrevRequest(typedCall: TypedCall, request: KaspaTxRequest, requestIndex: number) {
    const prevTxId = (request.prev_tx_id ?? '').toLowerCase();
    const refTx = (this.params.refTxs ?? []).find(tx => tx.txId.toLowerCase() === prevTxId);
    if (!refTx) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `KaspaSignTransaction: device requested previous transaction ${
          prevTxId || '(unknown)'
        }; provide it via refTxs`
      );
    }

    const requestType = request.request_type;

    if (requestType === 'KASPA_TX_PREV_META') {
      return typedCall('KaspaTxAckPrevMeta', 'KaspaTxRequest', {
        version: refTx.version,
        input_count: refTx.inputs.length,
        output_count: refTx.outputs.length,
        lock_time: (refTx.lockTime ?? 0) as number,
        subnetwork_id: refTx.subNetworkID ?? bytesToHex(zeroSubnetworkID()),
        gas: (refTx.gas ?? 0) as number,
        payload_length: (refTx.payload ?? '').length / 2,
      });
    }

    if (requestType === 'KASPA_TX_INPUT') {
      const input = refTx.inputs[requestIndex];
      if (!input) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `KaspaSignTransaction: device requested input ${requestIndex} of previous tx out of range`
        );
      }
      return typedCall('KaspaTxAckPrevInput', 'KaspaTxRequest', {
        previous_outpoint: {
          tx_id: input.prevTxId,
          index: input.outputIndex,
        },
        sequence: input.sequenceNumber as number,
      });
    }

    if (requestType === 'KASPA_TX_OUTPUT') {
      const output = refTx.outputs[requestIndex];
      if (!output) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `KaspaSignTransaction: device requested output ${requestIndex} of previous tx out of range`
        );
      }
      return typedCall('KaspaTxAckPrevOutput', 'KaspaTxRequest', {
        amount: output.satoshis,
        script_version: output.scriptVersion ?? 0,
        script_public_key: output.script,
      });
    }

    if (requestType === 'KASPA_TX_PAYLOAD') {
      const payloadHex = refTx.payload ?? '';
      const payloadLength = payloadHex.length / 2;
      const length = request.request_payload_length ?? payloadLength - requestIndex;
      return typedCall('KaspaTxAckPayloadChunk', 'KaspaTxRequest', {
        payload_chunk: payloadHex.substring(requestIndex * 2, (requestIndex + length) * 2),
      });
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `KaspaSignTransaction: unknown previous-tx request type ${requestType ?? 'undefined'}`
    );
  }

  /**
   * Streaming flow (device computes the sighash): the device drives via
   * KaspaTxRequest, asking for inputs/outputs/payload chunks and carrying
   * finished signatures back, until FINISHED. Mirrors BTC signtx.
   */
  async signTxStream(
    typedCall: TypedCall,
    firstResponse: TypedResponseMessage<'KaspaTxRequest'>
  ): Promise<KaspaSignature[]> {
    const { params } = this;
    const signatures: KaspaSignature[] = [];

    const inputScriptType: KaspaInputScriptType =
      params.scheme === 'ecdsa' ? 'KASPA_SPEND_P2PK_ECDSA' : 'KASPA_SPEND_P2PK_SCHNORR';

    const saveSignature = (signature?: KaspaTxRequestSignature) => {
      if (signature && typeof signature.signature_index === 'number' && signature.signature) {
        signatures[signature.signature_index] = {
          index: signature.signature_index,
          signature: signature.signature,
        };
      }
    };

    const payloadHex = params.payload ?? '';
    const payloadLength = payloadHex.length / 2;

    let response = firstResponse;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const request = response.message;
      // Save first so the last input's signature (carried on the FINISHED request) is captured.
      saveSignature(request.signature);

      const requestType = request.request_type;
      if (requestType === 'KASPA_TX_FINISHED') {
        break;
      }

      const requestIndex = request.request_index ?? 0;

      // prev_tx_id selects a previous-transaction request; answer from refTxs.
      if (request.prev_tx_id || requestType === 'KASPA_TX_PREV_META') {
        response = await this.ackPrevRequest(typedCall, request, requestIndex);
      } else if (requestType === 'KASPA_TX_INPUT') {
        const input = params.inputs[requestIndex];
        if (!input) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `KaspaSignTransaction: device requested input ${requestIndex} out of range`
          );
        }
        response = await typedCall('KaspaTxAckInput', 'KaspaTxRequest', {
          address_n: input.path as number[],
          previous_outpoint: {
            tx_id: input.prevTxId,
            index: input.outputIndex,
          },
          amount: input.output.satoshis,
          sequence: input.sequenceNumber as number,
          sig_op_count: input.sigOpCount ?? 1,
          script_type: inputScriptType,
          use_tweak: params.useTweak,
        });
      } else if (requestType === 'KASPA_TX_OUTPUT') {
        const output = params.outputs[requestIndex];
        if (!output) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `KaspaSignTransaction: device requested output ${requestIndex} out of range`
          );
        }
        const address = getOutputAddress(output);
        const addressN = getOutputAddressN(output);
        const isChange = !!addressN;
        response = await typedCall('KaspaTxAckOutput', 'KaspaTxRequest', {
          script_type: isChange ? 'KASPA_PAYTOCHANGE' : 'KASPA_PAYTOADDRESS',
          amount: output.satoshis,
          address_n: (addressN as number[]) ?? [],
          address,
          scheme: params.scheme,
          use_tweak: params.useTweak,
        });
      } else if (requestType === 'KASPA_TX_PAYLOAD') {
        const offset = requestIndex;
        const length = request.request_payload_length ?? payloadLength - offset;
        const chunk = payloadHex.substring(offset * 2, (offset + length) * 2);
        response = await typedCall('KaspaTxAckPayloadChunk', 'KaspaTxRequest', {
          payload_chunk: chunk,
        });
      } else {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `KaspaSignTransaction: unknown request type ${requestType ?? 'undefined'}`
        );
      }
    }

    const collected = signatures.filter(Boolean);
    if (collected.length !== params.inputs.length) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `KaspaSignTransaction: expected ${params.inputs.length} signatures, received ${collected.length}`
      );
    }
    return collected;
  }

  async run() {
    this.checkFeatureVersionLimit(
      // exists use_tweak is false check firmware version
      () => this.params.useTweak === false,
      () => this.getUseTweakVersionRange(),
      {
        strictCheckDeviceSupport: true,
      }
    );

    const { device, params } = this;
    const payloadHex = params.payload ?? '';

    // output_count is the protocol discriminator: attach streaming fields only
    // when the tx can stream. Streaming verification needs refTxs, so without
    // them prefer blind signing when available; a streaming-only tx still
    // streams and fails clearly if the device requests previous txs.
    const hasRefTxs = (params.refTxs?.length ?? 0) > 0;
    const streamingReady = this.supportsStreaming && (hasRefTxs || !this.supportsLegacy);

    const streamingFields = streamingReady
      ? {
          output_count: params.outputs.length,
          version: params.version,
          lock_time: params.lockTime as number,
          subnetwork_id: params.subNetworkID,
          gas: params.gas as number,
          payload_length: payloadHex.length / 2,
        }
      : {};

    // raw_message (input 0's prehash) is only computable/correct when legacy-signable.
    const legacyFields = this.supportsLegacy
      ? { raw_message: bytesToHex(serialize(params, 0).raw) }
      : {};

    // Legacy firmware reads raw_message and skips unknown streaming fields;
    // new firmware streams iff output_count is present.
    let response;
    try {
      response = await device.commands.typedCall(
        'KaspaSignTx',
        ['KaspaTxRequest', 'KaspaTxInputRequest', 'KaspaSignedTx'],
        {
          address_n: params.inputs[0].path as number[],
          scheme: params.scheme,
          prefix: params.prefix,
          input_count: params.inputs.length,
          use_tweak: params.useTweak,
          ...streamingFields,
          ...legacyFields,
        }
      );
    } catch (error) {
      // Old firmware cannot decode a packet without raw_message
      // (Failure_DataError); map it to an actionable upgrade error.
      if (
        !this.supportsLegacy &&
        error instanceof HardwareError &&
        error.errorCode === HardwareErrorCode.RuntimeError &&
        String(error.message).includes('Failure_DataError')
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodNeedUpgradeFirmware,
          'KaspaSignTransaction: this transaction requires firmware with Kaspa streaming support'
        );
      }
      throw error;
    }

    const typedCall = device.commands.typedCall.bind(device.commands);

    if (response.type === 'KaspaTxRequest') {
      if (!this.supportsStreaming) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'KaspaSignTransaction: device firmware uses the streaming protocol; every output requires address or addressN'
        );
      }
      try {
        return await this.signTxStream(typedCall, response);
      } catch (error) {
        // Device rejected our refTxs; the caller decides whether to sign without them.
        if (
          error instanceof HardwareError &&
          String(error.message).toLowerCase().includes('previous transaction id mismatch')
        ) {
          throw ERRORS.TypedError(HardwareErrorCode.KaspaPrevTxIdMismatch, String(error.message));
        }
        throw error;
      }
    }

    // Legacy answer to a streaming-only packet: no prehash material exists.
    if (!this.supportsLegacy) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'KaspaSignTransaction: device chose the legacy protocol but the transaction is not legacy-signable'
      );
    }

    return this.processTxRequest(typedCall, response, 0, []);
  }
}
