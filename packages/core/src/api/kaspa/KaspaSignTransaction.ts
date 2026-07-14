import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { serialize, zeroSubnetworkID } from './helpers/TransferSerialize';
import { SignatureType } from './helpers/SignatureType';

import type { TypedResponseMessage } from '../../device/DeviceCommands';
import type {
  KaspaSignInputParams,
  KaspaSignOutputParams,
  KaspaSignTransactionParams,
  KaspaSignature,
} from '../../types';
import type {
  KaspaInputScriptType,
  KaspaTxRequestSignature,
  TypedCall,
} from '@onekeyfe/hd-transport';

// Streaming firmware only handles plain P2PK scripts (KASPA_SPEND_P2PK_SCHNORR /
// ECDSA spends, KASPA_PAYTOADDRESS / KASPA_PAYTOCHANGE outputs). Any other
// script kind — e.g. the P2SH commit/reveal scripts used by KRC20 — must fall
// back to the legacy blind-sign flow. An absent script is not a blocker: it
// simply means the caller went streaming-only for that entry.
const P2PK_SCRIPT = /^(20[0-9a-f]{64}ac|21[0-9a-f]{66}ab)$/i;

const isStreamableScript = (script?: string) => !script || P2PK_SCRIPT.test(script);

export default class KaspaSignTransaction extends BaseMethod<KaspaSignTransactionParams> {
  hasBundle = false;

  // Which protocols this transaction can be signed with, decided by the params
  // the caller provided. The device picks the protocol via its first response.
  supportsLegacy = false;

  supportsStreaming = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    const payload = this.payload as KaspaSignTransactionParams;

    // check payload
    validateParams(payload, [
      { name: 'version', type: 'number' },
      { name: 'sigHashType', type: 'number' },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true },
      { name: 'lockTime', required: true },
      { name: 'sigOpCount', type: 'number' },
      { name: 'subNetworkID', type: 'string' },
      { name: 'payload', type: 'hexString' },
      { name: 'useTweak', type: 'boolean' },
    ]);

    const inputs: KaspaSignInputParams[] = payload.inputs.map(input => {
      validateParams(input, [
        { name: 'path', type: 'string', required: true },
        { name: 'prevTxId', type: 'string', required: true },
        { name: 'outputIndex', type: 'number', required: true },
        { name: 'sequenceNumber', required: true },
      ]);
      validateParams(input.output, [{ name: 'satoshis', required: true }]);

      const addressN = validatePath(input.path, 3);

      return {
        ...input,
        path: addressN,
        sigOpCount: input.sigOpCount ?? 1, // input.script.getSignatureOperationsCount()) //sigOpCount
      };
    });

    const outputs: KaspaSignOutputParams[] = payload.outputs.map(output => {
      validateParams(output, [
        { name: 'satoshis', required: true },
        { name: 'address', type: 'string' },
        { name: 'script', type: 'string' },
        { name: 'scriptVersion', type: 'number' },
      ]);

      return {
        ...output,
        addressN: output.addressN ? validatePath(output.addressN, 3) : undefined,
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

    // The legacy flow prehashes on the host with payload/gas/subnetworkID
    // hardcoded to zero (TransferSerialize), so those features rule it out.
    // subNetworkID counts as zero whatever length/format the caller used.
    this.supportsLegacy =
      this.params.outputs.every(output => !!output.script) &&
      this.params.inputs.every(input => !!input.output.script) &&
      !this.params.payload &&
      Number(this.params.gas ?? 0) === 0 &&
      /^0*$/.test(this.params.subNetworkID ?? '');

    // The streaming protocol carries no sighash-type field (the device always
    // signs SIGHASH_ALL), so any custom sighash must use the legacy flow.
    const isDefaultSigHashType =
      this.params.sigHashType === SignatureType.SIGHASH_ALL ||
      // eslint-disable-next-line no-bitwise
      this.params.sigHashType === (SignatureType.SIGHASH_ALL | SignatureType.SIGHASH_FORKID);

    // The streaming flow describes outputs by address (external) or addressN
    // (change) and only understands P2PK spends; a tx touching any other
    // script kind (e.g. KRC20 P2SH commit/reveal) blind-signs instead.
    this.supportsStreaming =
      isDefaultSigHashType &&
      this.params.outputs.every(output => !!output.address || !!output.addressN) &&
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
   * Legacy sign flow (host computes the sighash):
   * the initial KaspaSignTx (sent by run()) carries input 0's prehash in
   * raw_message; the device answers each KaspaTxInputRequest with the next
   * input's prehash via KaspaTxInputAck until it returns KaspaSignedTx.
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
        // @ts-expect-error
        ['KaspaTxInputRequest', 'KaspaSignedTx'],
        {
          address_n: input.path,
          raw_message: bytesToHex(rawMessage),
        }
      );

      // @ts-expect-error
      return this.processTxRequest(typedCall, response, nextIndex, signature);
    }

    return signature;
  }

  /**
   * Streaming sign flow (device computes the sighash):
   * after the initial KaspaSignTx (sent by run()), the device drives the
   * exchange via KaspaTxRequest, asking for each input / output / payload
   * chunk in turn and carrying the signature of completed inputs back to the
   * host, until FINISHED. Mirrors the BTC TxRequest/TxAck model in
   * btc/helpers/signtx.ts.
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

      if (requestType === 'KASPA_TX_INPUT') {
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
        const isChange = !!output.addressN;
        response = await typedCall('KaspaTxAckOutput', 'KaspaTxRequest', {
          script_type: isChange ? 'KASPA_PAYTOCHANGE' : 'KASPA_PAYTOADDRESS',
          amount: output.satoshis,
          address_n: (output.addressN as number[]) ?? [],
          address: output.address,
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

    // output_count is the discriminator new firmware uses to pick the
    // protocol, so streaming metadata is attached only when the tx can
    // actually be streamed; a legacy-only tx sends the plain legacy packet and
    // new firmware falls back to its blind-sign path instead of erroring.
    const streamingFields = this.supportsStreaming
      ? {
          output_count: params.outputs.length,
          version: params.version,
          lock_time: params.lockTime as number,
          subnetwork_id: params.subNetworkID,
          gas: params.gas as number,
          payload_length: payloadHex.length / 2,
        }
      : {};

    // Legacy firmware requires raw_message (host-computed prehash of input 0);
    // it is only computable, and only correct, when the tx is legacy-signable.
    const legacyFields = this.supportsLegacy
      ? { raw_message: bytesToHex(serialize(params, 0).raw) }
      : {};

    // First packet carries the union of what the tx supports: legacy firmware
    // reads raw_message and skips unknown streaming fields; new firmware
    // streams when output_count is present, blind-signs otherwise. The device
    // declares the chosen protocol by the type of its first response.
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
      // Without raw_message (omitted when the tx needs streaming-only
      // features) legacy firmware fails to decode KaspaSignTx and reports
      // Failure_DataError, which DeviceCommands surfaces as a generic
      // RuntimeError; surface that as an actionable upgrade error. Matching
      // on the failure code keeps unrelated device errors intact.
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
      return this.signTxStream(typedCall, response);
    }

    // Mirror safety net: a device answering with the legacy protocol against
    // a streaming-only packet has no prehash material to sign.
    if (!this.supportsLegacy) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'KaspaSignTransaction: device chose the legacy protocol but the transaction is not legacy-signable'
      );
    }

    return this.processTxRequest(typedCall, response, 0, []);
  }
}
