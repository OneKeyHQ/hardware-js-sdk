import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { TypedCall } from '@onekeyfe/hd-transport';
import { TypedResponseMessage } from '../../device/DeviceCommands';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { validatePath } from '../helpers/pathUtils';
import { StacksSignTransactionParams, StacksSignature } from '../../types/api/stacksSignTransaction';

export default class StacksSignTransaction extends BaseMethod<StacksSignTransactionParams> {
  hasBundle = false;

  init() {
    const payload = this.payload as StacksSignTransactionParams;

    payload.inputs.forEach(input => {
      validateParams(input, [
        { name: 'path', type: 'string', required: true },
        { name: 'message', type: 'string', required: true },
        { name: 'prefix', type: 'string', required: true },
      ]);
      return input;
    });
    this.params = payload;
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.2.0',
      },
      model_touch: {
        min: '4.4.0',
      },
    };
  }

  async processTxRequest(
    typedCall: TypedCall,
    res: TypedResponseMessage<'StacksTxInputRequest'> | TypedResponseMessage<'StacksSignedTx'>,
    index: number,
    signatures: StacksSignature[]
  ): Promise<StacksSignature[]> {
    const { signature } = res.message;
    if (!signature) {
      throw ERRORS.TypedError(
        HardwareErrorCode.ResponseUnexpectTypeError,
        'signature is not valid'
      );
    }
    if (res.type === 'StacksSignedTx') {
      signatures.push({
        index,
        signature,
      });

      return signatures;
    }

    if (res.type === 'StacksTxInputRequest') {
      signatures.push({
        index,
        signature,
      });

      const nextIndex = res.message.request_index;
      const input = this.params.inputs[nextIndex];
      const response = await typedCall(
        'StacksTxInputAck',
        // @ts-expect-error
        ['StacksTxInputRequest', 'StacksSignedTx'],
        {
          address_n: input.path,
          raw_message: input.message,
        }
      );

      // @ts-expect-error
      return this.processTxRequest(typedCall, response, nextIndex, signatures);
    }

    return signatures;
  }

  async run() {
    const { device, params } = this;
    const input = params.inputs[0];

    const response = await device.commands.typedCall(
      'StacksSignTx',
      ['StacksTxInputRequest', 'StacksSignedTx'],
      {
        address_n: validatePath(input.path, 3),
        raw_message: input.message,
        prefix: input.prefix,
        input_count: params.inputs.length,
      }
    );
    return this.processTxRequest(
      device.commands.typedCall.bind(device.commands),
      response as any,
      0,
      []
    );
  }
}
