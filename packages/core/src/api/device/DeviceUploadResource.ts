import semver from 'semver';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { bytesToHex } from '@noble/hashes/utils';
import { blake2s } from '@noble/hashes/blake2s';
import { isEmpty } from 'lodash';

import { DeviceModelToTypes } from '../../types';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { hexToBytes } from '../helpers/hexUtils';
import { getDeviceFirmwareVersion } from '../../utils';
import { PROTO } from '../../constants';

import type { DeviceUploadResourceParams, DeviceUploadResourceResponse } from '../../types';
import type { TypedResponseMessage } from '../../device/DeviceCommands';
import type { ResourceUpload } from '@onekeyfe/hd-transport';

export default class DeviceUploadResource extends BaseMethod<ResourceUpload> {
  paramsData = {
    data: new Uint8Array(),
    thumbnailData: new Uint8Array(),
    blurData: new Uint8Array(),
  };

  private uploadProgress = {
    totalBytes: 0,
    uploadedBytes: 0,
    currentFile: 'main' as 'main' | 'thumbnail' | 'blur',
  };

  getVersionRange() {
    return {
      model_touch: {
        min: '3.2.0',
      },
    };
  }

  checkUploadNFTSupport() {
    const deviceType = this.device.getCurrentDeviceType();
    const currentVersion = getDeviceFirmwareVersion(this.device.features).join('.');
    if (!DeviceModelToTypes.model_touch.includes(deviceType)) {
      throw ERRORS.TypedError(HardwareErrorCode.CallMethodError, 'Device Not Support Upload NFT');
    }

    if (semver.lt(currentVersion, '4.1.0')) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodNeedUpgradeFirmware,
        `Device firmware version is too low, please update to 4.1.0`,
        { current: currentVersion, require: '4.1.0' }
      );
    }
  }

  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    // check payload
    validateParams(this.payload, [
      { name: 'suffix', type: 'string', required: true },
      { name: 'dataHex', type: 'string', required: true },
      { name: 'thumbnailDataHex', type: 'string', required: true },
      { name: 'blurDataHex', type: 'hexString', required: true },
      { name: 'resType', type: 'number', required: true },
      { name: 'nftMetaData', type: 'string' },
      { name: 'fileNameNoExt', type: 'string' },
    ]);

    const { suffix, dataHex, thumbnailDataHex, blurDataHex, resType, nftMetaData } = this
      .payload as DeviceUploadResourceParams;

    // init params
    this.paramsData = {
      data: new Uint8Array(hexToBytes(dataHex)),
      thumbnailData: new Uint8Array(hexToBytes(thumbnailDataHex)),
      blurData: new Uint8Array(hexToBytes(blurDataHex)),
    };

    this.uploadProgress.totalBytes =
      this.paramsData.data.byteLength +
      this.paramsData.thumbnailData.byteLength +
      this.paramsData.blurData.byteLength;
    this.uploadProgress.uploadedBytes = 0;

    const fileHash = bytesToHex(blake2s(this.payload.dataHex)).slice(0, 8);
    const file_name_no_ext = isEmpty(this.payload.fileNameNoExt)
      ? `${resType === 0 ? 'wp' : 'nft'}-${fileHash}-${Math.floor(Date.now() / 1000)}`
      : this.payload.fileNameNoExt;

    this.params = {
      extension: suffix,
      data_length: this.paramsData.data.byteLength,
      zoom_data_length: this.paramsData.thumbnailData.byteLength,
      blur_data_length: this.paramsData.blurData.byteLength,
      res_type: resType,
      nft_meta_data: nftMetaData,
      file_name_no_ext,
    };
  }

  private getDataChunk(sourceData: Uint8Array, offset: number, length: number): Uint8Array {
    const endOffset = Math.min(offset + length, sourceData.byteLength);

    return sourceData.subarray(offset, endOffset);
  }

  private updateProgress(chunkSize: number, requestType: string) {
    this.uploadProgress.uploadedBytes += chunkSize;

    if (requestType === 'ResourceRequest') {
      this.uploadProgress.currentFile = 'main';
    } else if (requestType === 'ZoomRequest') {
      this.uploadProgress.currentFile = 'thumbnail';
    } else {
      this.uploadProgress.currentFile = 'blur';
    }

    const progress = Math.round(
      (this.uploadProgress.uploadedBytes / this.uploadProgress.totalBytes) * 100
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`Upload progress: ${progress}% (${this.uploadProgress.currentFile})`);
    }
  }

  processResourceRequest = async (
    res:
      | TypedResponseMessage<'ResourceRequest'>
      | TypedResponseMessage<'ZoomRequest'>
      | TypedResponseMessage<'BlurRequest'>
      | TypedResponseMessage<'Success'>
  ): Promise<DeviceUploadResourceResponse> => {
    if (res.type === 'Success') {
      const response: DeviceUploadResourceResponse = {
        message: res.message.message,
      };
      response.applyScreen = true;

      const firmwareVersion = getDeviceFirmwareVersion(this.device.features).join('.');
      const deviceType = this.device.getCurrentDeviceType();
      if (deviceType === EDeviceType.Pro && semver.gte(firmwareVersion, '4.17.0')) {
        response.applyScreen = false;
      }

      return response;
    }

    const { offset, data_length } = res.message;
    const { data, thumbnailData, blurData } = this.paramsData;

    if (offset === undefined) {
      throw new Error('offset is undefined');
    }

    let sourceData: Uint8Array;

    switch (res.type) {
      case 'ResourceRequest':
        sourceData = data;
        break;
      case 'BlurRequest':
        sourceData = blurData;
        break;
      case 'ZoomRequest':
        sourceData = thumbnailData;
        break;
      default:
        throw new Error('Invalid request type');
    }

    const payload = this.getDataChunk(sourceData, offset, data_length);
    const digest = blake2s(payload);

    this.updateProgress(payload.byteLength, res.type);

    const resourceAckParams = {
      data_chunk: bytesToHex(payload),
      hash: bytesToHex(digest),
    };

    const response = await this.device.commands.typedCall(
      'ResourceAck',
      ['ResourceRequest', 'ZoomRequest', 'BlurRequest', 'Success'],
      resourceAckParams
    );
    return this.processResourceRequest(response);
  };

  async run() {
    if (this.payload.resType === PROTO.ResourceType.Nft) {
      this.checkUploadNFTSupport();
    }

    const res = await this.device.commands.typedCall(
      'ResourceUpload',
      ['ResourceRequest', 'ZoomRequest', 'BlurRequest', 'Success'],
      this.params
    );

    return this.processResourceRequest(res);
  }
}
