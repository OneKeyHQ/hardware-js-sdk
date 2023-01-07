import { bytesToHex } from '@noble/hashes/utils';
import { ResourceUpload, Success } from '@onekeyfe/hd-transport';
import { blake2s } from '@noble/hashes/blake2s';
import { TypedResponseMessage } from '../../device/DeviceCommands';
import { DeviceUploadResourceParams } from '../../types';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { hexToBytes } from '../helpers/hexUtils';
import { createUiMessage, UI_REQUEST } from '../../events';

export default class DeviceUploadResource extends BaseMethod<ResourceUpload> {
  paramsData = {
    data: new Uint8Array(),
    thumbnailData: new Uint8Array(),
  };

  getVersionRange() {
    return {
      model_touch: {
        min: '3.2.0',
      },
    };
  }

  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [
      { name: 'suffix', type: 'string', required: true },
      { name: 'dataHex', type: 'string', required: true },
      { name: 'thumbnailDataHex', type: 'string', required: true },
      { name: 'resType', type: 'number', required: true },
      { name: 'nftMetaData', type: 'string' },
    ]);

    const { suffix, dataHex, thumbnailDataHex, resType, nftMetaData } = this
      .payload as DeviceUploadResourceParams;

    // init params
    this.paramsData = {
      data: hexToBytes(dataHex),
      thumbnailData: hexToBytes(thumbnailDataHex),
    };

    const fileHash = bytesToHex(blake2s(this.payload.dataHex)).slice(0, 8);
    const file_name_no_ext = `${resType === 0 ? 'wp' : 'nft'}-${fileHash}-${Math.floor(
      Date.now() / 1000
    )}`;

    this.params = {
      extension: suffix,
      data_length: this.paramsData.data.byteLength,
      zoom_data_length: this.paramsData.thumbnailData.byteLength,
      res_type: resType,
      nft_meta_data: nftMetaData,
      file_name_no_ext,
    };
  }

  processResourceRequest = async (
    res:
      | TypedResponseMessage<'ResourceRequest'>
      | TypedResponseMessage<'ZoomRequest'>
      | TypedResponseMessage<'Success'>
  ): Promise<Success> => {
    if (res.type === 'Success') {
      return res.message;
    }

    const { offset, data_length } = res.message;
    const { data, thumbnailData } = this.paramsData;

    if (offset === undefined) {
      throw new Error('offset is undefined');
    }

    let payload: Uint8Array;
    if (res.type === 'ResourceRequest') {
      payload = new Uint8Array(data.slice(offset, Math.min(offset + data_length, data.byteLength)));
    } else {
      payload = new Uint8Array(
        thumbnailData.slice(offset, Math.min(offset + data_length, thumbnailData.byteLength))
      );
    }

    const digest = blake2s(payload);

    const resourceAckParams = {
      data_chunk: bytesToHex(payload),
      hash: bytesToHex(digest),
    };

    const response = await this.device.commands.typedCall(
      'ResourceAck',
      ['ResourceRequest', 'ZoomRequest', 'Success'],
      resourceAckParams
    );
    return this.processResourceRequest(response);
  };

  async run() {
    const res = await this.device.commands.typedCall(
      'ResourceUpload',
      ['ResourceRequest', 'ZoomRequest', 'Success'],
      this.params
    );

    this.postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW));

    return this.processResourceRequest(res);
  }
}
