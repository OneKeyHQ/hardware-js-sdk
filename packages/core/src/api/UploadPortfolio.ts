import FileWrite from './FileWrite';

export type UploadPortfolioParams = {
  packageBytes: ArrayBuffer | Uint8Array | Blob;
  operationId?: string;
  timeoutMs?: number | string;
};

const PORTFOLIO_PENDING_PATH = 'vol1:/portfolio/portfolio.pfol.pending';
const PORTFOLIO_CHUNK_SIZE = 2048;

export default class UploadPortfolio extends FileWrite {
  init() {
    const { packageBytes, timeoutMs } = this.payload as UploadPortfolioParams;
    this.payload = {
      ...this.payload,
      path: PORTFOLIO_PENDING_PATH,
      offset: 0,
      data: packageBytes,
      chunkSize: PORTFOLIO_CHUNK_SIZE,
      overwrite: true,
      append: false,
      timeoutMs,
    };
    super.init();
  }

  async run() {
    const stagedFile = await super.run();
    this.throwIfAborted();
    await this.device.commands.typedCall('PortfolioUpdate', 'Success', {});
    return {
      ...stagedFile,
      portfolioUpdated: true,
    };
  }
}
