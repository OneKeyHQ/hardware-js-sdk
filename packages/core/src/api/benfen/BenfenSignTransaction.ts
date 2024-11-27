import {
  BenfenSignTx as HardwareBenfenSignTx,
  TypedCall,
  BenfenSignedTx,
  MessageType,
} from '@onekeyfe/hd-transport';
import semver from 'semver';
import { bytesToHex } from '@noble/hashes/utils';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getDeviceFirmwareVersion, getDeviceType } from '../../utils';
import { DeviceModelToTypes } from '../../types';
import type { TypedResponseMessage } from '../../device/DeviceCommands';

type BenfenSignTx = Omit<HardwareBenfenSignTx, 'data_initial_chunk' | 'data_length'> &
  HardwareBenfenSignTx;

export default class BenfenSignTransaction extends BaseMethod<BenfenSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'coinType', type: 'hexString', required: true },
    ]);

    const { path, rawTx, coinType } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
      coin_type: formatAnyHex(coinType),
    };
  }

  getVersionRange() {
    return {
      model_touch: {
        min: '4.10.2',
      },
    };
  }

  supportChunkTransfer() {
    const deviceType = getDeviceType(this.device.features);
    const deviceFirmwareVersion = getDeviceFirmwareVersion(this.device.features).join('.');

    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      if (semver.valid(deviceFirmwareVersion)) {
        return semver.gte(deviceFirmwareVersion, '3.7.0');
      }
    } else if (DeviceModelToTypes.model_touch.includes(deviceType)) {
      if (semver.valid(deviceFirmwareVersion)) {
        return semver.gte(deviceFirmwareVersion, '4.8.0');
      }
    }

    return false;
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
    let offset = 0;
    let data: Buffer = Buffer.from('');

    if (this.supportChunkTransfer()) {
      offset = this.chunkByteSize;
      data = Buffer.from(this.params.raw_tx, 'hex');
      this.params = {
        address_n: this.params.address_n,
        coin_type: this.params.coin_type,
        raw_tx: '',
        data_initial_chunk: bytesToHex(new Uint8Array(data.buffer).subarray(0, this.chunkByteSize)),
        data_length: data.length,
      };
    }

    const res = await typedCall('BenfenSignTx', ['BenfenSignedTx', 'BenfenTxRequest'], {
      ...this.params,
    });

    return this.processTxRequest(typedCall, res, data, offset);
  }
}
