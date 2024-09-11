import {
  type AlephiumSignedTx,
  type AlephiumSignTx as HardwareAlephiumSignTx,
  TypedCall,
} from '@onekeyfe/hd-transport';
import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { AlephiumSignTransactionParams } from '../../types';
import type { TypedResponseMessage } from '../../device/DeviceCommands';

export default class AlephiumSignTransaction extends BaseMethod<HardwareAlephiumSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', required: true, type: 'hexString' },
      { name: 'scriptOpt', type: 'string' },
    ]);

    const { path } = this.payload as AlephiumSignTransactionParams;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      data_initial_chunk: '',
      data_length: 0,
    };
  }

  getVersionRange() {
    return {
      model_touch: {
        min: '4.10.0',
      },
    };
  }

  chunkByteSize = 1024;

  processTxRequest = async (
    typedCall: TypedCall,
    res:
      | TypedResponseMessage<'AlephiumSignedTx'>
      | TypedResponseMessage<'AlephiumTxRequest'>
      | TypedResponseMessage<'AlephiumBytecodeRequest'>,
    data: Buffer,
    scriptOpt?: Buffer,
    dataOffset = 0
  ): Promise<AlephiumSignedTx> => {
    if (res.type === 'AlephiumSignedTx') {
      return res.message;
    }

    const { data_length } = res.message;

    let response;
    if (res.type === 'AlephiumTxRequest') {
      if (!data_length) {
        // sign Done
        return res.message;
      }

      const payload = data.subarray(dataOffset, dataOffset + data_length);
      const newOffset = dataOffset + payload.length;
      const resourceAckParams = {
        data_chunk: bytesToHex(payload),
      };

      response = await typedCall(
        'AlephiumTxAck',
        ['AlephiumSignedTx', 'AlephiumTxRequest', 'AlephiumBytecodeRequest'],
        {
          ...resourceAckParams,
        }
      );

      return this.processTxRequest(typedCall, response, data, scriptOpt, newOffset);
    }

    if (res.type === 'AlephiumBytecodeRequest') {
      if (!scriptOpt?.length) {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'scriptOpt is required');
      }

      const resourceAckParams = {
        bytecode_data: bytesToHex(scriptOpt),
      };

      response = await typedCall(
        'AlephiumBytecodeAck',
        ['AlephiumSignedTx', 'AlephiumBytecodeRequest'],
        {
          ...resourceAckParams,
        }
      );

      return this.processTxRequest(typedCall, response, data, scriptOpt, dataOffset);
    }

    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, `Unknown response type: ${res.type}`);
  };

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const offset = this.chunkByteSize;
    const data = Buffer.from(this.payload.rawTx, 'hex');
    const scriptOpt = this.payload.scriptOpt && Buffer.from(this.payload.scriptOpt, 'hex');
    this.params = {
      address_n: this.params.address_n,
      data_initial_chunk: bytesToHex(data.subarray(0, this.chunkByteSize)),
      data_length: data.length,
    };

    const res = await typedCall(
      'AlephiumSignTx',
      ['AlephiumSignedTx', 'AlephiumTxRequest', 'AlephiumBytecodeRequest'],
      {
        ...this.params,
      }
    );

    return this.processTxRequest(typedCall, res, data, scriptOpt, offset);
  }
}
