import FileWrite from './FileWrite';

export type UploadPortfolioParams = {
  packageBytes: ArrayBuffer | Uint8Array | Blob;
  operationId?: string;
  timeoutMs?: number | string;
};

const PORTFOLIO_PENDING_PATH = 'vol1:/portfolio/portfolio.okpkg.pending';
const PORTFOLIO_CHUNK_SIZE = 2048;
const PORTFOLIO_RESPONSE_TIMEOUT_MS = 5_000;

export default class UploadPortfolio extends FileWrite {
  init() {
    const { packageBytes, timeoutMs } = this.payload as UploadPortfolioParams;
    const responseTimeoutMs = Math.min(
      timeoutMs === undefined ? PORTFOLIO_RESPONSE_TIMEOUT_MS : Number(timeoutMs),
      PORTFOLIO_RESPONSE_TIMEOUT_MS
    );
    this.payload = {
      ...this.payload,
      path: PORTFOLIO_PENDING_PATH,
      offset: 0,
      data: packageBytes,
      chunkSize: PORTFOLIO_CHUNK_SIZE,
      overwrite: true,
      append: false,
      emitProgress: false,
      timeoutMs: responseTimeoutMs,
    };
    super.init();
    this.executionPriority = 'background';
    this.unlockPolicy = 'retry-on-locked';
    // Portfolio 是后台数据写入与应用流程，设备不需要用户确认；包括自动解锁阶段在内均不合成 UI Event。
    this.protocolV2UiMode = 'none';
  }

  async run() {
    const stagedFile = await super.run();
    this.throwIfAborted();
    const timeoutMs = Number(this.params.timeoutMs);
    await this.device.commands.typedCall('PortfolioUpdate', 'Success', {}, { timeoutMs });
    return {
      ...stagedFile,
      portfolioUpdated: true,
    };
  }
}
