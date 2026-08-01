import { BaseMethod } from './BaseMethod';
import {
  validateNonNegativeInteger,
  validateOptionalNonNegativeInteger,
  validateOptionalPercentage,
  validateProtocolV2FilesystemPath,
  validateRequiredData,
} from './helpers/filesystemValidation';
import { writeProtocolV2File } from './helpers/protocolV2FileWrite';
import { UI_REQUEST, createUiMessage } from '../events/ui-request';

export type FileWriteParams = {
  path: string;
  offset?: number;
  totalSize?: number;
  data: ArrayBuffer | Uint8Array | Blob | string;
  chunkSize?: number;
  chunkLen?: number;
  overwrite?: boolean;
  append?: boolean;
  emitProgress?: boolean;
  uiPercentage?: number;
  timeoutMs?: number | string;
};

export default class FileWrite extends BaseMethod<FileWriteParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    validateRequiredData(this.payload.data, 'data');
    const path = validateProtocolV2FilesystemPath(this.payload.path, 'path');
    const offset = validateNonNegativeInteger(this.payload.offset, 'offset', 0);
    this.params = {
      path,
      offset,
      totalSize: validateNonNegativeInteger(this.payload.totalSize, 'totalSize', 0),
      data: this.payload.data,
      chunkSize: validateOptionalNonNegativeInteger(this.payload.chunkSize, 'chunkSize'),
      chunkLen: validateOptionalNonNegativeInteger(this.payload.chunkLen, 'chunkLen'),
      overwrite: this.payload.overwrite ?? offset === 0,
      append: this.payload.append ?? false,
      emitProgress: this.payload.emitProgress ?? true,
      uiPercentage: validateOptionalPercentage(this.payload.uiPercentage, 'uiPercentage'),
      timeoutMs: validateOptionalNonNegativeInteger(this.payload.timeoutMs, 'timeoutMs'),
    };
  }

  async run() {
    return writeProtocolV2File({
      commands: this.device.commands,
      path: this.params.path,
      data: this.params.data,
      offset: this.params.offset,
      totalSize: this.params.totalSize,
      chunkSize: this.params.chunkSize,
      chunkLen: this.params.chunkLen,
      overwrite: this.params.overwrite,
      append: this.params.append,
      uiPercentage: this.params.uiPercentage,
      timeoutMs: this.params.timeoutMs === undefined ? undefined : Number(this.params.timeoutMs),
      throwIfAborted: () => this.throwIfAborted(),
      onProgress: payload => {
        if (this.params.emitProgress && typeof this.postMessage === 'function') {
          this.postMessage(createUiMessage(UI_REQUEST.DEVICE_PROGRESS, payload));
        }
      },
    });
  }
}
