import { bytesToHex } from '@noble/hashes/utils';
import { TypedCall } from '@onekeyfe/hd-transport';
import { TypedResponseMessage } from '../../device/DeviceCommands';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import {
  NexaSignInputParams,
  NexaSignOutputParams,
  NexaSignTransactionParams,
  NexaSignature,
} from '../../types';
import { zeroSubnetworkID, serialize } from './helpers/TransferSerialize';
import { SignatureType } from './helpers/SignatureType';

export default class NexaSignTransaction extends BaseMethod<NexaSignTransactionParams> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const payload = this.payload as NexaSignTransactionParams;

    // check payload
    validateParams(payload, [
      { name: 'version', type: 'number' },
      { name: 'sigHashType', type: 'number', required: true },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true },
      { name: 'lockTime', required: true },
      { name: 'sigOpCount', type: 'number' },
      { name: 'subNetworkID', type: 'string' },
    ]);

    // if(!payload.inputs.length) throw

    const inputs: NexaSignInputParams[] = payload.inputs.map(input => {
      validateParams(input, [
        { name: 'path', type: 'string', required: true },
        { name: 'prevTxId', type: 'string', required: true },
        { name: 'outputIndex', type: 'number', required: true },
        { name: 'sequenceNumber', required: true },
      ]);

      const addressN = validatePath(input.path, 3);

      return {
        ...input,
        path: addressN,
        sigOpCount: input.sigOpCount ?? 1, // input.script.getSignatureOperationsCount()) //sigOpCount
      };
    });

    const outputs: NexaSignOutputParams[] = payload.outputs.map(output => {
      validateParams(output, [
        { name: 'satoshis', required: true },
        { name: 'script', type: 'string', required: true },
        { name: 'scriptVersion', type: 'number' },
      ]);

      return {
        ...output,
        scriptVersion: output.scriptVersion ?? 0,
      };
    });

    this.params = {
      ...payload,
      inputs,
      outputs,
      scheme: payload.scheme ?? 'schnorr',
      prefix: payload.prefix ?? 'nexa',
      // eslint-disable-next-line no-bitwise
      sigHashType: payload.sigHashType ?? SignatureType.SIGHASH_ALL | SignatureType.SIGHASH_FORKID,
      sigOpCount: payload.sigOpCount ?? 1,
      subNetworkID: payload.subNetworkID ?? bytesToHex(zeroSubnetworkID()),
    };
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

  async processTxRequest(
    typedCall: TypedCall,
    res: TypedResponseMessage<'NexaTxInputRequest'> | TypedResponseMessage<'NexaSignedTx'>,
    index: number,
    signature: NexaSignature[]
  ): Promise<NexaSignature[]> {
    if (res.type === 'NexaSignedTx') {
      signature.push({
        index,
        signature: res.message.signature,
      });

      return signature;
    }

    if (res.type === 'NexaTxInputRequest') {
      signature.push({
        index,
        signature: res.message.signature ?? '',
      });

      const nextIndex = res.message.request_index;

      const { raw: rawMessage } = serialize(this.params, nextIndex);
      const input = this.params.inputs[nextIndex];

      const response = await typedCall(
        'NexaTxInputAck',
        // @ts-expect-error
        ['NexaTxInputRequest', 'NexaSignedTx'],
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

  async run() {
    const { raw: rawMessage } = serialize(this.params, 0);
    const input = this.params.inputs[0];

    const { device, params } = this;

    // @ts-expect-error
    const response = await device.commands.typedCall(
      'NexaSignTx',
      ['NexaTxInputRequest', 'NexaSignedTx'],
      {
        address_n: input.path,
        raw_message: bytesToHex(rawMessage),
        scheme: params.scheme,
        prefix: params.prefix,
        input_count: params.inputs.length,
      }
    );

    return this.processTxRequest(device.commands.typedCall.bind(device.commands), response, 0, []);
  }
}
