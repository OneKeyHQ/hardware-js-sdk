import semver from 'semver';
import { bytesToHex } from '@noble/hashes/utils';
import { EDeviceType } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { DeviceModelToTypes } from '../../types';

import type { SuiSignTx as HardwareSuiSignTx, SuiSignedTx } from '@onekeyfe/hd-transport';
import type { TypedCall, TypedResponseMessage } from '../../device/DeviceCommands';

type SuiSignTx = Omit<HardwareSuiSignTx, 'data_initial_chunk' | 'data_length'> & HardwareSuiSignTx;

export default class SuiSignTransaction extends BaseMethod<SuiSignTx> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    const { path, rawTx } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
    };
  }

  getVersionRange() {
    return {
      model_pro2: {
        min: '0.0.0',
      },
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.3.0',
      },
    };
  }

  supportChunkTransfer() {
    if (this.device.isProtocolV2() || this.device.getCurrentDeviceType() === EDeviceType.Pro2) {
      return true;
    }

    const deviceType = this.device.getCurrentDeviceType();
    const deviceFirmwareVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';

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
    res: TypedResponseMessage<'SuiSignedTx'> | TypedResponseMessage<'SuiTxRequest'>,
    data: Buffer,
    offset = 0
  ): Promise<SuiSignedTx> => {
    if (res.type === 'SuiSignedTx') {
      return res.message;
    }

    const { data_length } = res.message;

    if (!data_length) {
      // sign Done
      return res.message as SuiSignedTx;
    }

    const payload = data.subarray(offset, offset + data_length);
    const newOffset = offset + payload.length;
    const resourceAckParams = {
      data_chunk: bytesToHex(payload),
    };

    const response = await typedCall('SuiTxAck', ['SuiSignedTx', 'SuiTxRequest'], {
      ...resourceAckParams,
    });

    return this.processTxRequest(typedCall, response, data, newOffset);
  };

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    let offset = 0;
    let data = Buffer.alloc(0);

    if (this.supportChunkTransfer()) {
      offset = this.chunkByteSize;
      data = Buffer.from(this.params.raw_tx, 'hex');
      this.params = {
        address_n: this.params.address_n,
        raw_tx: '',
        data_initial_chunk: bytesToHex(data.subarray(0, this.chunkByteSize)),
        data_length: data.length,
      };
    }

    const res = await typedCall('SuiSignTx', ['SuiSignedTx', 'SuiTxRequest'], {
      ...this.params,
    });

    return this.processTxRequest(typedCall, res, data, offset);
  }
}
