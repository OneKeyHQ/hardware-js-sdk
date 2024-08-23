import { ScdoSignTx as HardwareScdoSignTx, TypedCall, ScdoSignedTx } from '@onekeyfe/hd-transport';
import { bytesToHex } from '@noble/hashes/utils';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { ScdoSignTransactionParams } from '../../types';
import type { TypedResponseMessage } from '../../device/DeviceCommands';

export default class ScdoSignTransaction extends BaseMethod<HardwareScdoSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'nonce', required: true },
      { name: 'gasPrice', required: true, type: 'string' },
      { name: 'gasLimit', required: true, type: 'string' },
      { name: 'to', required: true, type: 'string' },
      { name: 'value', required: true, type: 'string' },
      { name: 'timestamp', type: 'string' },
      { name: 'data', type: 'string' },
      { name: 'txType', type: 'number' },
    ]);

    const { path, nonce, gasPrice, gasLimit, to, value, timestamp, txType } = this
      .payload as ScdoSignTransactionParams;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      nonce,
      gas_price: gasPrice,
      gas_limit: gasLimit,
      to,
      value,
      timestamp,
      tx_type: txType,
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

  chunkByteSize = 1024;

  processTxRequest = async (
    typedCall: TypedCall,
    res: TypedResponseMessage<'ScdoSignedTx'>,
    data: Buffer,
    offset = 0
  ): Promise<ScdoSignedTx> => {
    const { data_length } = res.message;

    if (!data_length) {
      // sign Done
      return res.message;
    }

    const payload = data.subarray(offset, offset + data_length);
    const newOffset = offset + payload.length;
    const resourceAckParams = {
      data_chunk: bytesToHex(payload),
    };

    const response = await typedCall('ScdoTxAck', 'ScdoSignedTx', {
      ...resourceAckParams,
    });

    return this.processTxRequest(typedCall, response, data, newOffset);
  };

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const data = this.payload?.data && Buffer.from(this.payload.data, 'hex');
    const offset = this.chunkByteSize;
    if (data && data.length > 0) {
      this.params.data_initial_chunk = bytesToHex(data.subarray(0, this.chunkByteSize));
      this.params.data_length = data.length;
    }

    const res = await typedCall('ScdoSignTx', ['ScdoSignedTx'], {
      ...this.params,
    });

    return this.processTxRequest(typedCall, res, data, offset);
  }
}
