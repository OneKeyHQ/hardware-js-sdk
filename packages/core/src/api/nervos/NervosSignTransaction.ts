import type { NervosSignTx as HardwareNervosSignTx, TypedCall } from '@onekeyfe/hd-transport';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import type { NervosSignTransactionParams, NervosSignedTx } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';
import type { TypedResponseMessage } from '../../device/DeviceCommands';

type NervosSignTx = Omit<HardwareNervosSignTx, 'data_initial_chunk' | 'data_length'> & {
  raw_tx: Buffer;
};

export default class NervosSignTransaction extends BaseMethod<NervosSignTx> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'witnessHex', type: 'hexString', required: true },
      { name: 'network', type: 'string', required: true },
    ]);

    // init params
    const { path, rawTx, witnessHex, network } = this.payload as NervosSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: Buffer.from(formatAnyHex(rawTx), 'hex'),
      witness_buffer: formatAnyHex(witnessHex),
      network,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.10.0',
      },
      model_touch: {
        min: '4.0.0',
      },
    };
  }

  chunkByteSize = 1024;

  processTxRequest = async (
    typedCall: TypedCall,
    res: TypedResponseMessage<'NervosSignedTx'> | TypedResponseMessage<'NervosTxRequest'>,
    data: Buffer,
    offset = 0
  ): Promise<NervosSignedTx> => {
    if (res.type === 'NervosSignedTx') {
      if (!res?.message?.signature) {
        throw new Error('No signature returned');
      }

      return {
        ...res.message,
        path: serializedPath(this.params.address_n),
      };
    }

    const { data_length } = res.message;

    if (!data_length) {
      if (!res?.message?.signature) {
        throw new Error('No signature returned');
      }
      // sign Done
      return {
        ...res.message,
        path: serializedPath(this.params.address_n),
      };
    }

    const payload = data.subarray(offset, offset + data_length);
    const newOffset = offset + payload.length;
    const resourceAckParams = {
      data_chunk: payload.toString('hex'),
    };

    const response = await typedCall('NervosTxAck', ['NervosSignedTx', 'NervosTxRequest'], {
      ...resourceAckParams,
    });

    return this.processTxRequest(typedCall, response, data, newOffset);
  };

  async run() {
    const dataLength = this.params.raw_tx.length;
    const offset = dataLength;
    const data = this.params.raw_tx;

    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const res = await typedCall('NervosSignTx', 'NervosSignedTx', {
      address_n: this.params.address_n,
      data_initial_chunk: data.subarray(0, offset).toString('hex'),
      data_length: dataLength,
      witness_buffer: this.params.witness_buffer,
      network: this.params.network,
    });

    return this.processTxRequest(typedCall, res, data, offset);
  }
}
