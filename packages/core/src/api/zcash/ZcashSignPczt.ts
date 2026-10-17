import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter, validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';
import { UI_REQUEST } from '../../constants/ui-request';

import type { ZcashSignPczt as HardwareZcashSignPczt } from '@onekeyfe/hd-transport';
import type { TypedCall, TypedResponseMessage } from '../../device/DeviceCommands';
import type { ZcashSignedPczt } from '../../types/api/zcashSignPczt';
import type { DeviceFirmwareRange } from '../../types';

const CHUNK_BYTE_SIZE = 1024;
// Host memory sanity bound on the device-announced length, not a device limit.
const SIGNED_PCZT_SANITY_MAX_BYTES = 16 * 1024 * 1024;

export default class ZcashSignPczt extends BaseMethod<HardwareZcashSignPczt> {
  pczt: Buffer = Buffer.alloc(0);

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    validateParams(this.payload, [{ name: 'pczt', type: 'hexString', required: true }]);

    // Reject odd-length hex instead of left-padding it, which would shift every nibble.
    const pcztHex = stripHexPrefix(this.payload.pczt);
    if (pcztHex.length % 2 !== 0) {
      throw invalidParameter('pczt hex must have an even length');
    }
    this.pczt = Buffer.from(pcztHex, 'hex');
    if (this.pczt.length === 0) {
      throw invalidParameter('pczt is empty');
    }

    this.params = {
      pczt_length: this.pczt.length,
      pczt_initial_chunk: bytesToHex(this.pczt.subarray(0, CHUNK_BYTE_SIZE)),
    };
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      model_pro2: {
        min: '0.0.0',
      },
    };
  }

  // Upload: the device decides every chunk length via ZcashPcztChunkRequest and
  // the host must answer with exactly that many bytes.
  uploadPczt = async (
    typedCall: TypedCall,
    res: TypedResponseMessage<'ZcashSignedPczt'> | TypedResponseMessage<'ZcashPcztChunkRequest'>,
    offset: number
  ): Promise<TypedResponseMessage<'ZcashSignedPczt'>> => {
    if (res.type === 'ZcashSignedPczt') {
      if (offset !== this.pczt.length) {
        throw ERRORS.TypedError(
          HardwareErrorCode.ResponseUnexpectTypeError,
          'device completed signing before receiving the whole pczt'
        );
      }
      return res;
    }

    const { chunk_length: chunkLength } = res.message;
    if (
      !Number.isSafeInteger(chunkLength) ||
      chunkLength <= 0 ||
      offset + chunkLength > this.pczt.length
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.ResponseUnexpectTypeError,
        `device requested ${chunkLength} bytes at offset ${offset} of ${this.pczt.length}`
      );
    }

    const chunk = this.pczt.subarray(offset, offset + chunkLength);
    const next = await typedCall(
      'ZcashPcztChunkAck',
      ['ZcashSignedPczt', 'ZcashPcztChunkRequest'],
      {
        data_chunk: bytesToHex(chunk),
      }
    );

    return this.uploadPczt(typedCall, next, offset + chunkLength);
  };

  // Download: the host decides chunk lengths via ZcashSignedPcztChunkRequest
  // until the announced pczt_length has been received.
  downloadSignedPczt = async (
    typedCall: TypedCall,
    res: TypedResponseMessage<'ZcashSignedPczt'>
  ): Promise<Buffer> => {
    const { pczt_length: total, pczt_initial_chunk: initial } = res.message;
    if (!Number.isSafeInteger(total) || total <= 0 || total > SIGNED_PCZT_SANITY_MAX_BYTES) {
      throw ERRORS.TypedError(
        HardwareErrorCode.ResponseUnexpectTypeError,
        `device announced invalid signed pczt length ${total}`
      );
    }

    const parts: Buffer[] = [Buffer.from(initial ?? '', 'hex')];
    let received = parts[0].length;
    if (received > total) {
      throw ERRORS.TypedError(
        HardwareErrorCode.ResponseUnexpectTypeError,
        'device returned more initial pczt bytes than announced'
      );
    }

    while (received < total) {
      const chunkLength = Math.min(CHUNK_BYTE_SIZE, total - received);
      const ack = await typedCall('ZcashSignedPcztChunkRequest', 'ZcashPcztChunkAck', {
        chunk_length: chunkLength,
      });
      const chunk = Buffer.from(ack.message.data_chunk ?? '', 'hex');
      if (chunk.length !== chunkLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.ResponseUnexpectTypeError,
          `device returned ${chunk.length} of ${chunkLength} requested bytes at offset ${received} of ${total}`
        );
      }
      parts.push(chunk);
      received += chunk.length;
    }

    return Buffer.concat(parts);
  };

  async run(): Promise<ZcashSignedPczt> {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const first = await typedCall('ZcashSignPczt', ['ZcashSignedPczt', 'ZcashPcztChunkRequest'], {
      ...this.params,
    });

    const signed = await this.uploadPczt(
      typedCall,
      first,
      Math.min(CHUNK_BYTE_SIZE, this.pczt.length)
    );
    const pczt = await this.downloadSignedPczt(typedCall, signed);

    return { pczt: bytesToHex(pczt) };
  }
}
