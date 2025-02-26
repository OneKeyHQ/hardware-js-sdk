import { BenfenSignTx, TypedCall, BenfenSignedTx, MessageType } from '@onekeyfe/hd-transport';

import { bytesToHex } from '@noble/hashes/utils';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import type { TypedResponseMessage } from '../../device/DeviceCommands';

export default class BenfenSignTransaction extends BaseMethod<BenfenSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'coinType', type: 'string', required: false },
    ]);

    const { path, rawTx, coinType } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
      ...(coinType && {
        coin_type: formatAnyHex(Buffer.from(coinType).toString('hex')),
      }),
    };
  }

  getVersionRange() {
    return {
      pro: {
        min: '4.12.0',
      },
      classic1s: {
        min: '3.11.0',
      },
    };
  }

  chunkByteSize = 1024;

  processTxRequest = async (
    typedCall: TypedCall,
    res: TypedResponseMessage<'BenfenSignedTx'> | TypedResponseMessage<'BenfenTxRequest'>,
    data: Buffer,
    offset = 0
  ): Promise<BenfenSignedTx> => {
    if (res.type === 'BenfenSignedTx') {
      return res.message;
    }

    const { data_length } = res.message;

    if (!data_length) {
      // @ts-expect-error
      return res.message;
    }

    const payload = data.subarray(offset, offset + data_length);
    const newOffset = offset + payload.length;
    const resourceAckParams = {
      data_chunk: bytesToHex(new Uint8Array(payload)),
    };

    const response = await typedCall(
      'BenfenTxAck',
      ['BenfenSignedTx', 'BenfenTxRequest'] as unknown as keyof MessageType,
      {
        ...resourceAckParams,
      }
    );

    return this.processTxRequest(
      typedCall,
      response as TypedResponseMessage<'BenfenSignedTx'> | TypedResponseMessage<'BenfenTxRequest'>,
      data,
      newOffset
    );
  };

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const offset = this.chunkByteSize;
    const data = Buffer.from(this.params.raw_tx, 'hex');
    this.params = {
      address_n: this.params.address_n,
      coin_type: this.params.coin_type,
      raw_tx: '',
      data_initial_chunk: bytesToHex(new Uint8Array(data.buffer).subarray(0, this.chunkByteSize)),
      data_length: data.length,
    };

    const res = await typedCall('BenfenSignTx', ['BenfenSignedTx', 'BenfenTxRequest'], {
      ...this.params,
    });

    return this.processTxRequest(typedCall, res, data, offset);
  }
}
