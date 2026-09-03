import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { supportsProtocolV2Message } from '../protocols/protocol-v2/features';
import { decodeCanonicalBase64 } from './helpers/base64Data';
import FileWrite from './FileWrite';

export type UploadPortfolioParams = {
  packageBase64: string;
  timeoutMs?: number | string;
  /** Controls transfer progress UI events. Defaults to `silent`. */
  uiMode?: 'silent' | 'progress';
};

const PORTFOLIO_PENDING_PATH = 'vol1:/portfolio/portfolio.okpkg.pending';
const PORTFOLIO_CHUNK_SIZE = 2048;
const PORTFOLIO_PACKAGE_MAX_BYTES = 128 * 1024;
const FILESYSTEM_FILE_WRITE_MESSAGE_TYPE = 60805;
const PORTFOLIO_UPDATE_MESSAGE_TYPE = 61400;

export default class UploadPortfolio extends FileWrite {
  init() {
    const { packageBase64, timeoutMs, uiMode = 'silent' } = this.payload as UploadPortfolioParams;
    const packageBytes = decodeCanonicalBase64({
      value: packageBase64,
      parameterName: 'packageBase64',
      maxBytes: PORTFOLIO_PACKAGE_MAX_BYTES,
    });
    this.payload = {
      ...this.payload,
      path: PORTFOLIO_PENDING_PATH,
      offset: 0,
      data: packageBytes,
      chunkSize: PORTFOLIO_CHUNK_SIZE,
      overwrite: true,
      append: false,
      emitProgress: uiMode === 'progress',
      timeoutMs,
    };
    super.init();
    this.unlockPolicy = 'none';
    this.protocolV2UiMode = uiMode === 'progress' ? 'auto' : 'none';
  }

  async run() {
    const protocolInfo = await this.device.ensureProtocolV2RuntimeContext();
    const hasFileWrite = supportsProtocolV2Message(
      protocolInfo,
      FILESYSTEM_FILE_WRITE_MESSAGE_TYPE
    );
    const hasPortfolioUpdate = supportsProtocolV2Message(
      protocolInfo,
      PORTFOLIO_UPDATE_MESSAGE_TYPE
    );
    if (!hasFileWrite || !hasPortfolioUpdate) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }

    const stagedFile = await super.run();
    this.throwIfAborted();
    await this.device.commands.typedCall('PortfolioUpdate', 'Success', {});
    return {
      ...stagedFile,
      portfolioUpdated: true,
    };
  }
}
